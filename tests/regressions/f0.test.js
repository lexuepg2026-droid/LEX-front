// ═══════════════════════════════════════════════════════════════════════════
// FASE F-0 — varreduras das correções de faxina
//
// ── O que estas varreduras provam, e o que NÃO provam ──────────────────────
// São análise de arquivo, sem navegador, no padrão de `financial/estatica.test.js`.
// Não pintam pixel e não clicam. O que provam é a REGRESSÃO ESPECÍFICA de cada
// item — o endereço de desenvolvimento voltando para dentro de um `axios.create`,
// o `<Loading />` sumindo de um formulário num refactor, a listagem por processo
// voltando a pedir a página inteira sem dizer que truncou.
//
// Três dos quatro defeitos desta fase eram invisíveis para lint, build e suíte.
// É por isso que a guarda precisa existir: nenhum deles quebrava nada.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { RAIZ } from "../helpers/cssScan.js";

const ler = (relativo) => readFileSync(resolve(RAIZ, relativo), "utf8");

const semComentarios = (codigo) =>
  codigo
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

// ═══════════════════════════════════════════════════════════════════════════
// 1 — A URL base da API
// ═══════════════════════════════════════════════════════════════════════════
describe("F-0: a URL base da API tem fonte única e não vaza para produção", () => {
  const INSTANCIAS = ["src/api/axiosConfig.js", "src/api/portalAxios.js"];

  test("as duas instâncias de axios leem `api/baseURL.js`", () => {
    for (const arquivo of INSTANCIAS) {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /from\s+['"]\.\/baseURL['"]/,
        `${arquivo}: a URL base precisa vir do módulo compartilhado. ` +
        "Duas cópias da mesma decisão divergem — bastaria mudar o fallback de um " +
        "lado para o portal e as telas da advogada falarem com servidores diferentes."
      );
      assert.match(codigo, /baseURL:\s*BASE_URL/, `${arquivo}: usa BASE_URL na criação da instância`);
    }
  });

  test("nenhuma instância escreve o endereço de desenvolvimento à mão", () => {
    for (const arquivo of INSTANCIAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.doesNotMatch(
        codigo, /localhost:3001/,
        `${arquivo}: o endereço de desenvolvimento voltou para dentro da instância. ` +
        "Era assim que ele chegava ao bundle de produção."
      );
    }
  });

  test("o fallback é guardado por `import.meta.env.DEV`, na forma que o Vite substitui", () => {
    const codigo = semComentarios(ler("src/api/baseURL.js"));

    assert.match(
      codigo, /import\.meta\.env\.DEV/,
      "sem a guarda, o bundle de produção sai apontando para a máquina de quem compilou"
    );

    // A forma importa: o Vite só troca `import.meta.env.DEV` por `false` quando
    // ele aparece LITERALMENTE. Lendo a flag de um parâmetro (`env?.DEV`), a
    // substituição não acontece, o ramo não vira código morto e o literal
    // `http://localhost:3001` viaja para o arquivo publicado — foi exatamente o
    // que a primeira versão desta guarda fez, e o `grep` no `dist/` pegou.
    assert.doesNotMatch(
      codigo, /\benv\?\.\s*DEV\b/,
      "a flag precisa ser lida na forma literal `import.meta.env.DEV`, não de um parâmetro"
    );

    // O ramo de produção não pode ter fallback nenhum: precisa lançar.
    assert.match(codigo, /throw new Error/, "sem VITE_API_URL em produção, o módulo precisa falhar alto");
  });

  test("o build de produção tem guarda em `vite.config.js`", () => {
    const codigo = semComentarios(ler("vite.config.js"));

    assert.match(codigo, /VITE_API_URL/, "a guarda precisa nomear a variável que exige");
    assert.match(codigo, /apply:\s*['"]build['"]/, "vale só no build — `npm run dev` continua sem exigir nada");
    assert.match(codigo, /throw new Error/, "faltando a variável, o build precisa ABORTAR, não avisar");
    assert.match(
      codigo, /mode\s*!==\s*['"]production['"]/,
      "a exigência é do modo produção"
    );
  });

  test("`.env.production.example` existe e documenta a variável", () => {
    assert.ok(
      existsSync(resolve(RAIZ, ".env.production.example")),
      "sem o exemplo, a mensagem de erro do build manda copiar um arquivo que não existe"
    );
    assert.match(ler(".env.production.example"), /^VITE_API_URL=/m);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — `<Loading />` na leitura dos formulários de edição
// ═══════════════════════════════════════════════════════════════════════════
describe("F-0: os formulários de edição mostram carregamento na leitura", () => {
  const FORMULARIOS = [
    "src/pages/fees/FeeFormPage.jsx",
    "src/pages/payments/PaymentFormPage.jsx",
    "src/pages/installments/InstallmentFormPage.jsx",
    "src/pages/clients/ClientFormPage.jsx",
    "src/pages/processes/ProcessFormPage.jsx"
  ];

  test("os cinco importam e renderizam `<Loading />` enquanto leem", () => {
    for (const arquivo of FORMULARIOS) {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /import Loading from/,
        `${arquivo}: precisa do componente de carregamento do projeto`
      );
      assert.match(
        codigo, /if\s*\(carregandoRegistro\)\s*return\s*<Loading\s*\/>/,
        `${arquivo}: sem a guarda, abrir a edição pinta o formulário VAZIO e os campos ` +
        "aparecem de repente quando o GET volta — e a advogada digita por cima do que " +
        "ainda vai ser sobrescrito."
      );
    }
  });

  test("o estado começa em `true` quando há id — senão o vazio pisca antes do spinner", () => {
    for (const arquivo of FORMULARIOS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /useState\(Boolean\(id\)\)/,
        `${arquivo}: iniciar em \`false\` mostra o formulário vazio por um quadro antes do spinner`
      );
    }
  });

  test("o carregamento termina SEMPRE, inclusive quando a leitura falha", () => {
    // Sem isto, um GET que falha deixa o spinner girando para sempre e a tela
    // nunca chega a mostrar a mensagem de erro que ela já sabe montar.
    for (const arquivo of FORMULARIOS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /finally\s*\{?\s*\(?\s*\)?\s*=?>?\s*[\s\S]{0,40}setCarregandoRegistro\(false\)/,
        `${arquivo}: \`setCarregandoRegistro(false)\` precisa estar num \`finally\`, não só no caminho feliz`
      );
    }
  });

  test("`loading` continua sendo o do botão Salvar — os dois estados não se misturam", () => {
    for (const arquivo of FORMULARIOS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /disabled=\{loading\}/,
        `${arquivo}: o estado do botão Salvar não pode ter sido substituído pelo da leitura`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — As listagens por processo depois da paginação do backend
//
// Até a F-0, `?processoId=` tinha caminho próprio no backend e devolvia TUDO,
// ignorando `limit`. Estas duas telas renderizavam o array inteiro, sem
// paginador — funcionavam por causa do defeito. Corrigido o backend, o default
// de 20 passaria a truncar em silêncio.
//
// ── O QUE A F-1b.3 SUBSTITUIU, e por que este bloco mudou ────────────────
// A medida da F-0 foi: pedir o TETO (100) e escrever "Mostrando 100 de 137.
// Use os filtros para reduzir o conjunto." Ela cumpriu o que prometia — a
// lista curta deixou de ter cara de completa — e era explicitamente
// provisória: o comentário que a acompanhava dizia "o paginador de verdade
// entra na F-1, que reescreve estas telas".
//
// A F-1b.3 é essa fase. As duas telas passaram a pedir 20 por página, com
// paginador e com os filtros que o aviso mandava usar. Manter aqui a asserção
// de `const LIMITE = 100` e de `aviso-lista-parcial` seria travar a tela na
// solução provisória — o teste passaria a defender o andaime contra a obra.
//
// **O que continua sendo verdade, e é o que este bloco agora afirma:** a tela
// lê o `total` do envelope (sem ele não há como saber que há mais), declara
// quantos itens pede por página, e o número que ela exibe NUNCA é uma lista
// truncada sem aviso — o paginador é a forma nova de dizer a mesma coisa que o
// aviso dizia, com navegação em vez de instrução.
// ═══════════════════════════════════════════════════════════════════════════
describe("F-0/F-1b.3: as listagens por processo dizem o tamanho do conjunto", () => {
  const LISTAGENS = [
    ["src/pages/payments/PaymentListPage.jsx", "recebimentos"],
    ["src/pages/installments/InstallmentListPage.jsx", "parcelas"]
  ];

  test("as duas declaram quantos itens pedem por página", () => {
    for (const [arquivo] of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /const POR_PAGINA = \d+/,
        `${arquivo}: o tamanho da página precisa ser declarado, e não escrito ` +
        "no meio da chamada — foi assim que o `limit` implícito de 20 truncou " +
        "em silêncio antes da F-0."
      );
      assert.match(
        codigo, /limit:\s*POR_PAGINA/,
        `${arquivo}: o limite pedido precisa ser o declarado`
      );
    }
  });

  test("as duas leem o `total` do envelope — é ele que dimensiona o paginador", () => {
    for (const [arquivo, rotulo] of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /setTotal\(/,
        `${arquivo}: sem ler o \`total\`, a tela não tem como saber que há mais ` +
        `${rotulo} do que os que estão à vista`
      );
      assert.match(
        codigo, /<Paginador/,
        `${arquivo}: a lista precisa ter como chegar no item seguinte. Sem ` +
        "paginador, uma lista curta volta a ter cara de completa."
      );
      assert.match(
        codigo, /total=\{total\}/,
        `${arquivo}: o paginador precisa receber o total do CONJUNTO, e não o ` +
        "tamanho da página"
      );
    }
  });

  test("a folha que declara as regras aplicadas continua sendo importada", () => {
    // Mesma regra da varredura de `appliedClasses.test.js`: a folha é importada
    // pelo componente que aplica a classe, e não pelo layout que o monta.
    for (const [arquivo] of LISTAGENS) {
      assert.match(
        ler(arquivo), /styles\/modules\.css/,
        `${arquivo}: precisa importar a folha que declara a regra que ele aplica`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 — O service worker e o lint
// ═══════════════════════════════════════════════════════════════════════════
describe("F-0: o service worker declara os globais no lugar que o flat config lê", () => {
  test("a diretiva `eslint-env` não voltou ao sw.js", () => {
    // Varredura pela DIRETIVA (comentário de bloco), não pela string solta —
    // mesma razão de `css/foco.test.js`: o comentário que explica o defeito
    // contém a expressão, e uma varredura ingênua derrubaria a própria
    // explicação. A saída óbvia seria apagar o comentário, que é o contrário
    // do que se quer. Esta asserção já falhou uma vez por isso, nesta fase.
    assert.doesNotMatch(
      ler("public/sw.js"), /\/\*\s*eslint-env\b/,
      "o flat config do ESLint 9 já ignora a diretiva `eslint-env` (com aviso) e o ESLint 10 " +
      "a reporta como ERRO — o comentário que existia para calar o lint viraria o motivo de " +
      "ele falhar. Os globais vivem em `eslint.config.js`."
    );
  });

  test("os globais de service worker e de Node vivem no eslint.config.js", () => {
    const codigo = semComentarios(ler("eslint.config.js"));

    assert.match(codigo, /files:\s*\[['"]public\/sw\.js['"]\]/, "o sw.js precisa do próprio bloco");
    assert.match(codigo, /globals\.serviceworker/, "`self`, `caches` e `clients` não existem em globals.browser");
    assert.match(codigo, /globals\.node/, "`vite.config.js` usa `process.cwd()` na guarda do build");
  });
});
