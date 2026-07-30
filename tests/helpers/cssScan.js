// ═══════════════════════════════════════════════════════════════════════════
// VARREDURA DE CLASSE CSS — análise estática, sem navegador e sem jsdom.
//
// ── Por que isto existe ────────────────────────────────────────────────────
// Na Fase 2E.1, `ProcessPage.css` não importava `ClientPage.css`, onde vivia a
// regra `.input-error`. A classe estava sendo APLICADA no JSX sem regra
// correspondente, e o destaque de campo do 409 saía inerte: a tela chamava o
// helper, marcava o input, e visualmente não acontecia nada.
//
// Lint não pega — `className` é string. Build não pega — CSS e JSX não se
// conhecem. Script de API não pega — é defeito puramente visual. E olho humano
// só pega se alguém reproduzir o 409 naquela tela específica. É a única
// categoria de defeito visual detectável sem olho humano, e por isso vale
// automatizar.
//
// ── Direção ────────────────────────────────────────────────────────────────
// SÓ "aplicada sem regra". O contrário — regra sem uso — é CSS morto, tem
// valor menor e é a fonte de quase todo falso positivo, porque uma regra pode
// ser usada por caminho que a análise estática não enxerga.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ = resolve(AQUI, "..", "..");
export const SRC = resolve(RAIZ, "src");

const ler = (caminho) => readFileSync(caminho, "utf8");
export const relativo = (caminho) => relative(RAIZ, caminho);

// ── CSS: quais classes têm regra ───────────────────────────────────────────
//
// Só o que está ANTES de `{` é seletor. Analisar o arquivo inteiro faria
// `url(./fundo.png)` virar a classe `.png` e um valor `1.5rem` virar `.5rem`.
// Aqui os blocos de declaração são removidos de dentro para fora, o que também
// resolve `@media`, `@supports` e qualquer aninhamento.
const classesDeclaradas = (css) => {
  let texto = css.replace(/\/\*[\s\S]*?\*\//g, " ");

  // Remove blocos mais internos repetidamente até sobrarem só os seletores.
  let anterior;
  do {
    anterior = texto;
    texto = texto.replace(/\{[^{}]*\}/g, " ");
  } while (texto !== anterior);

  // Sobrou seletor (e prelúdio de at-rule). Fora aspas e url(), o que vem
  // depois de um ponto e começa com letra é nome de classe.
  const semRuido = texto
    .replace(/url\([^)]*\)/g, " ")
    .replace(/"[^"]*"|'[^']*'/g, " ");

  const classes = new Set();
  for (const m of semRuido.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)) {
    classes.add(m[1]);
  }
  return classes;
};

// `@import './x.css'` — o CSS global do projeto é montado assim.
const importsDeCss = (css, arquivo) => {
  const destinos = [];
  for (const m of css.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/g)) {
    const alvo = m[1];
    if (alvo.startsWith("http")) continue;
    destinos.push(resolve(dirname(arquivo), alvo));
  }
  return destinos;
};

// Todas as classes declaradas num .css e em tudo que ele importa.
const coletarCss = (arquivo, vistos = new Set()) => {
  const chave = resolve(arquivo);
  if (vistos.has(chave)) return new Set();
  vistos.add(chave);

  let css;
  try {
    css = ler(chave);
  } catch {
    return new Set(); // import quebrado é problema de build, não desta varredura
  }

  const classes = classesDeclaradas(css);
  for (const destino of importsDeCss(css, chave)) {
    for (const c of coletarCss(destino, vistos)) classes.add(c);
  }
  return classes;
};

// ── JSX: o que cada arquivo importa ────────────────────────────────────────

const EXTENSOES_JSX = [".jsx", ".js", ".tsx", ".ts"];

const resolverModulo = (especificador, arquivoOrigem) => {
  if (!especificador.startsWith(".")) return null; // pacote npm
  const base = resolve(dirname(arquivoOrigem), especificador);

  if (extname(base) !== "") {
    try { statSync(base); return base; } catch { return null; }
  }
  for (const ext of EXTENSOES_JSX) {
    try { statSync(base + ext); return base + ext; } catch { /* segue */ }
  }
  for (const ext of EXTENSOES_JSX) {
    const indice = resolve(base, `index${ext}`);
    try { statSync(indice); return indice; } catch { /* segue */ }
  }
  return null;
};

const importsDeJsx = (codigo) => {
  const especificadores = [];
  // `import X from "y"`, `import "y"`, `import { a } from "y"`.
  //
  // O miolo é `[^'"]*?` e NÃO `[\s\S]*?`: com o segundo, o grupo opcional de
  // `from` atravessava a linha seguinte. Em
  //     import './LoginPage.css';
  //     import logo from '../../assets/logo.jpeg';
  // o `?` do grupo prefere casar, e o `\sfrom\s+` mais próximo estava na linha
  // de baixo — a regex engolia as duas linhas e o import do CSS sumia. O
  // sintoma era LoginPage.css inteiro parecer inalcançável, com 6 classes
  // reportadas como faltantes por defeito da varredura, não do produto.
  // Proibir aspas dentro do grupo impede a travessia.
  for (const m of codigo.matchAll(/import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g)) {
    especificadores.push(m[1]);
  }
  // `lazy(() => import("y"))` — é assim que `DashboardCharts` entra.
  for (const m of codigo.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    especificadores.push(m[1]);
  }
  return especificadores;
};

// O conjunto ALCANÇÁVEL por um arquivo: o CSS que ele importa direto, o que os
// componentes importados trazem consigo (transitivamente), e a lista dos
// próprios arquivos JSX da subárvore.
//
// A subárvore de JSX importa tanto quanto o CSS. Uma página não aplica só as
// classes que estão no arquivo dela: ela renderiza `Modal`, `PageHeader`,
// `StatusBadge`, e as classes desses componentes fazem parte do que aquela
// tela pinta. Analisar o arquivo da página isolado deixaria passar exatamente
// o caso do `ui-btn--danger` do `Modal.jsx`, que é aplicado num componente e
// depende de CSS que só chega pela página.
export const cssAlcancavel = (arquivo, vistos = new Set()) => {
  const chave = resolve(arquivo);
  if (vistos.has(chave)) return { classes: new Set(), arquivos: new Set(), jsx: new Set() };
  vistos.add(chave);

  const classes = new Set();
  const arquivos = new Set();
  const jsx = new Set([chave]);

  let codigo;
  try {
    codigo = ler(chave);
  } catch {
    return { classes, arquivos, jsx };
  }

  for (const especificador of importsDeJsx(codigo)) {
    const alvo = resolverModulo(especificador, chave);
    if (!alvo) continue;

    if (alvo.endsWith(".css")) {
      arquivos.add(alvo);
      for (const c of coletarCss(alvo)) classes.add(c);
      continue;
    }

    if (EXTENSOES_JSX.includes(extname(alvo))) {
      const filho = cssAlcancavel(alvo, vistos);
      for (const c of filho.classes) classes.add(c);
      for (const f of filho.arquivos) arquivos.add(f);
      for (const f of filho.jsx) jsx.add(f);
    }
  }

  return { classes, arquivos, jsx };
};

// ── JSX: quais classes são APLICADAS ───────────────────────────────────────

// Recorta a expressão de um `className=`, respeitando aninhamento de chaves,
// crases e aspas. Regex sozinha erraria em `className={`a ${x ? "b" : "c"}`}`.
const recortarExpressao = (codigo, inicio) => {
  const abre = codigo[inicio];

  if (abre === '"' || abre === "'") {
    const fim = codigo.indexOf(abre, inicio + 1);
    return fim === -1 ? null : codigo.slice(inicio, fim + 1);
  }

  if (abre !== "{") return null;

  let profundidade = 0;
  let delimitador = null; // aspa ou crase aberta

  for (let i = inicio; i < codigo.length; i += 1) {
    const c = codigo[i];
    const anterior = codigo[i - 1];

    if (delimitador) {
      if (c === delimitador && anterior !== "\\") delimitador = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { delimitador = c; continue; }
    if (c === "{") profundidade += 1;
    if (c === "}") {
      profundidade -= 1;
      if (profundidade === 0) return codigo.slice(inicio, i + 1);
    }
  }
  return null;
};

const SENTINELA = " ";

// De uma expressão de className tira dois conjuntos:
//   literais — nomes completos, que precisam de regra exata;
//   prefixos — pedaço estático antes de uma interpolação, que precisa apenas
//              de ALGUMA regra começando por ele.
//
// Classe montada por interpolação nunca pode ser reportada como faltante: de
// `` `status-badge--${config.color}` `` não dá para saber o valor sem executar
// o componente. O que dá para exigir é que exista alguma regra
// `.status-badge--*` — se a família inteira sumisse, aí sim é defeito.
export const classesDaExpressao = (expressao) => {
  const literais = new Set();
  const prefixos = new Set();

  // ── Templates ────────────────────────────────────────────────────────────
  for (const m of expressao.matchAll(/`([^`]*)`/g)) {
    // Interpolações viram sentinela para o token ficar reconhecível.
    const comSentinela = m[1].replace(/\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, SENTINELA);

    for (const token of comSentinela.split(/\s+/)) {
      if (!token) continue;
      if (!token.includes(SENTINELA)) {
        literais.add(token);
        continue;
      }
      const estatico = token.slice(0, token.indexOf(SENTINELA));
      // Token que COMEÇA com a interpolação (`${base}--ativo`) é indecifrável:
      // não há prefixo estático nenhum. Ignorar é o único caminho honesto.
      if (estatico.length > 0) prefixos.add(estatico);
    }
  }

  // ── Literais em aspas ────────────────────────────────────────────────────
  // Pega tanto `className="a b"` quanto os ramos de um ternário e os textos
  // dentro de `${cond ? "x" : ""}`.
  //
  // Antes disso saem os OPERANDOS DE COMPARAÇÃO. O padrão de destaque de campo
  // do projeto é
  //     className={campoComErro === 'cpf' ? 'input-erro' : undefined}
  // e `'cpf'` ali é nome de campo do payload, não classe. Sem esta limpeza a
  // varredura acusava `cpf`, `cnpj`, `email`, `valor`, `valorPago`,
  // `numeroParcela`, `numeroProcesso`, `tipo` e `titulo` como classes sem
  // regra — nove falsos positivos, todos no mesmo padrão, justamente nas 7
  // telas que a Fase 2E.1 arrumou para destacar campo no 409.
  const semTemplates = expressao
    .replace(/`[^`]*`/g, " ")
    .replace(/[=!]==?\s*(['"])[^'"]*\1/g, " ")
    .replace(/(['"])[^'"]*\1\s*[=!]==?/g, " ");

  for (const m of semTemplates.matchAll(/"([^"]*)"|'([^']*)'/g)) {
    const bruto = m[1] ?? m[2] ?? "";
    for (const token of bruto.split(/\s+/)) {
      if (token) literais.add(token);
    }
  }

  return { literais, prefixos };
};

export const classesAplicadas = (codigo) => {
  const literais = new Set();
  const prefixos = new Set();

  const marcador = /className\s*=\s*/g;
  let achado;

  while ((achado = marcador.exec(codigo)) !== null) {
    const inicio = achado.index + achado[0].length;
    const expressao = recortarExpressao(codigo, inicio);
    if (!expressao) continue;

    const { literais: l, prefixos: p } = classesDaExpressao(expressao);
    for (const c of l) literais.add(c);
    for (const c of p) prefixos.add(c);
  }

  return { literais, prefixos };
};

// ── Descoberta de arquivos ─────────────────────────────────────────────────

// Página = componente que uma ROTA monta, lido de `routes/AppRoutes.jsx`.
//
// Não "todo .jsx dentro de src/pages": `DashboardCharts.jsx`, `ProcessTabs.jsx`
// e `Letterhead.jsx` moram lá mas são componentes, montados por uma página que
// já carrega o CSS deles. Tratá-los como página produziria falso positivo em
// bloco — e a correção "certa" seria fazer cada um importar o CSS do pai, que
// é churn sem defeito por trás.
//
// A rota é o que de fato define a unidade de carregamento: é o que o navegador
// monta, e é sobre ela que a pergunta "esta tela tem estilo?" faz sentido.
export const listarPaginas = () => {
  const rotas = ler(resolve(SRC, "routes", "AppRoutes.jsx"));
  const paginas = new Set();

  for (const especificador of importsDeJsx(rotas)) {
    if (!especificador.startsWith("../pages/")) continue;
    const alvo = resolverModulo(especificador, resolve(SRC, "routes", "AppRoutes.jsx"));
    if (alvo) paginas.add(alvo);
  }

  return [...paginas].sort();
};

// Os .jsx de `src/pages/` que NENHUMA rota monta. Não são páginas, mas também
// não podem sumir da varredura: se um deles não for alcançado por página
// nenhuma, ele é código morto e a varredura precisa dizer isso em vez de
// simplesmente não olhar.
export const listarNaoRoteados = (paginas) => {
  const alcancados = new Set();
  for (const pagina of paginas) {
    for (const f of cssAlcancavel(pagina).jsx) alcancados.add(f);
  }

  const orfaos = [];
  const andar = (dir) => {
    for (const nome of readdirSync(dir).sort()) {
      const caminho = resolve(dir, nome);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (nome.endsWith(".jsx") && !alcancados.has(caminho)) orfaos.push(caminho);
    }
  };
  andar(resolve(SRC, "pages"));
  return orfaos;
};

// O CSS carregado na raiz, para toda a aplicação: `src/index.css` e a cadeia
// de `@import` dele. É o único CSS que uma página tem sem importar nada.
export const classesGlobais = () => coletarCss(resolve(SRC, "index.css"));

// Um token de `className` que não é nome de classe. Aparece quando a expressão
// tem string que não descreve classe nenhuma.
const RUIDO = /^(?:[0-9.]+|.*[^A-Za-z0-9_-].*)$/;

export const ehNomeDeClassePlausivel = (token) =>
  token.length > 0 && !RUIDO.test(token);
