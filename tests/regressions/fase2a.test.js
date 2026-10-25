// ═══════════════════════════════════════════════════════════════════════════
// FASE 2a — navegação, autenticação, vocabulário (DEC-077 a DEC-082)
//
// Varreduras estáticas do que a suíte sem DOM consegue provar: que os nomes,
// as rotas e as peças de navegação estão no lugar. O que é pixel e teclado
// real fica no roteiro visual do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const SRC = join(RAIZ, "src");
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const arquivos = (dir, exts) => readdirSync(dir).flatMap((nome) => {
  const c = join(dir, nome);
  if (statSync(c).isDirectory()) return arquivos(c, exts);
  return exts.some((e) => nome.endsWith(e)) ? [c] : [];
});

// ── Item 8 — DEC-080 ──────────────────────────────────────────────────────
describe("Fase 2a · vocabulário único no financeiro (DEC-080)", () => {
  test("o Financeiro tem as seções Honorários, Parcelas e Pagamentos", () => {
    const fonte = semComentarios(ler("src/pages/financeiro/FinanceiroPage.jsx"));
    for (const titulo of ["Honorários", "Parcelas", "Pagamentos"]) {
      assert.match(fonte, new RegExp(`title: '${titulo}'`));
    }
  });

  test("nenhum texto visível diz 'Cobrança' ou 'Recebimento'", () => {
    // Só código (comentários fora): nome de variável ou de rota não usa essas
    // palavras, então qualquer ocorrência é texto que a advogada lê.
    const culpados = [];
    for (const caminho of arquivos(SRC, [".jsx", ".js"])) {
      const codigo = semComentarios(readFileSync(caminho, "utf8")).replace(/\{\s*\}/g, "");
      if (/[Cc]obranças?\b|[Rr]ecebimentos?\b/.test(codigo)) culpados.push(relative(SRC, caminho));
    }
    assert.deepEqual(culpados, [], "use Honorários, Parcelas e Pagamentos (DEC-080)");
  });
});

// ── Itens 3 e 4 — DEC-079 ─────────────────────────────────────────────────
import {
  GRUPOS, LINKS_PRINCIPAIS, PERFIL, PENDENCIAS,
  itemAtivo, grupoAtivo, maisAtivo, todosOsDestinos, iniciais, primeiroNome
} from "../../src/components/layout/navegacao.js";

describe("Fase 2a · os destinos da navegação (DEC-079)", () => {
  test("os 13 destinos da Sidebar antiga continuam alcançáveis", () => {
    // A lista de `Sidebar.jsx:16-37` em `main` antes da fase, na ordem.
    const DA_SIDEBAR = [
      "/dashboard", "/dashboard/clientes", "/dashboard/processos", "/dashboard/agenda",
      "/dashboard/financeiro", "/dashboard/honorarios", "/dashboard/parcelas", "/dashboard/pagamentos",
      "/dashboard/documentos", "/dashboard/documentos/montar?modo=documento",
      "/dashboard/documentos/montar?modo=modelo", "/dashboard/secoes", "/dashboard/perfil",
    ];
    assert.deepEqual(todosOsDestinos(), DA_SIDEBAR);
  });

  test("links diretos e grupos são os da fase, com 'Agenda' e não 'Calendário'", () => {
    assert.deepEqual(LINKS_PRINCIPAIS.map((l) => l.label), ["Início", "Clientes", "Processos", "Agenda"]);
    assert.deepEqual(GRUPOS.map((g) => g.label), ["Financeiro", "Documentos"]);
    assert.deepEqual(GRUPOS[0].itens.map((i) => i.label), ["Visão geral", "Honorários", "Parcelas", "Pagamentos"]);
  });

  test("Início só acende no Início; Clientes acende nas telas de dentro", () => {
    const inicio = LINKS_PRINCIPAIS[0];
    const clientes = LINKS_PRINCIPAIS[1];
    assert.equal(itemAtivo(inicio, { pathname: "/dashboard" }), true);
    assert.equal(itemAtivo(inicio, { pathname: "/dashboard/clientes" }), false);
    assert.equal(itemAtivo(clientes, { pathname: "/dashboard/clientes/editar/42" }), true);
    assert.equal(itemAtivo(clientes, { pathname: "/dashboard/clientesx" }), false);
  });

  test("as duas portas da montagem acendem pelo ?modo=, nunca juntas", () => {
    const [, gerar, montar] = GRUPOS[1].itens;
    const local = { pathname: "/dashboard/documentos/montar", search: "?modo=modelo" };
    assert.equal(itemAtivo(montar, local), true);
    assert.equal(itemAtivo(gerar, local), false);
    // A LISTA de documentos não acende na montagem (é `end`), mas o grupo sim.
    assert.equal(itemAtivo(GRUPOS[1].itens[0], local), false);
    assert.equal(grupoAtivo(GRUPOS[1], local), true);
  });

  test("a página do honorário acende o grupo Financeiro", () => {
    assert.equal(grupoAtivo(GRUPOS[0], { pathname: "/dashboard/honorarios/abc/reparcelar" }), true);
    assert.equal(grupoAtivo(GRUPOS[0], { pathname: "/dashboard/clientes" }), false);
  });

  test("'Mais' acende nos destinos que só ele alcança", () => {
    assert.equal(maisAtivo({ pathname: "/dashboard/pagamentos" }), true);
    assert.equal(maisAtivo({ pathname: PERFIL.to }), true);
    assert.equal(maisAtivo({ pathname: PENDENCIAS.to }), true);
    assert.equal(maisAtivo({ pathname: "/dashboard/agenda" }), false);
    assert.equal(maisAtivo({ pathname: "/dashboard" }), false);
  });

  test("saudação e iniciais", () => {
    assert.equal(primeiroNome("  Laís  Fernanda Souza "), "Laís");
    assert.equal(iniciais("Laís Fernanda Souza"), "LF");
    assert.equal(iniciais(""), "?");
  });
});

describe("Fase 2a · o que abre e fecha funciona por teclado", () => {
  const submenu = semComentarios(ler("src/components/layout/MenuSuspenso.jsx"));
  const mais = semComentarios(ler("src/components/layout/BottomNav.jsx"));

  test("o submenu é um <button> com aria-expanded e aria-controls", () => {
    assert.match(submenu, /<button[\s\S]*?type="button"[\s\S]*?aria-expanded=\{aberto\}[\s\S]*?aria-controls=\{idPainel\}/);
  });

  test("o submenu fecha com Escape devolvendo o foco, com clique fora, com o foco saindo e ao navegar", () => {
    assert.match(submenu, /e\.key === 'Escape'[\s\S]*?fechar\(\{ devolverFoco: true \}\)/);
    assert.match(submenu, /botao\.current\?\.focus\(\)/);
    assert.match(submenu, /addEventListener\('mousedown'/);
    assert.match(submenu, /onBlur=\{aoPerderFoco\}/);
    assert.match(submenu, /useEffect\(\(\) => \{ setAberto\(false\); \}, \[pathname, search\]\)/);
  });

  test("o 'Mais' é diálogo com nome, foco no primeiro item, Tab preso, Escape e foco de volta", () => {
    assert.match(mais, /role="dialog"/);
    assert.match(mais, /aria-label="Mais opções de navegação"/);
    assert.match(mais, /aria-expanded=\{aberto\}/);
    assert.match(mais, /querySelector\(SELETOR_FOCAVEL\)\?\.focus\(\)/);
    assert.match(mais, /e\.key === 'Escape'/);
    assert.match(mais, /e\.preventDefault\(\);\s*ultimo\.focus\(\)/);
    assert.match(mais, /botaoMais\.current\?\.focus\(\)/);
  });

  test("nenhuma div clicável no cabeçalho e na barra de baixo", () => {
    // O menu do usuário dela abria por clique numa `div`, sem teclado.
    for (const arquivo of ["Header.jsx", "MenuSuspenso.jsx", "MenuUsuario.jsx", "BottomNav.jsx"]) {
      const fonte = semComentarios(ler(`src/components/layout/${arquivo}`));
      assert.doesNotMatch(fonte, /<(div|span|li)\b[^>]*\bonClick=/, arquivo);
    }
  });

  test("Tema e Sair usam as funções do DashboardPage, sem reescrever", () => {
    const layout = semComentarios(ler("src/components/layout/AppLayout.jsx"));
    assert.match(layout, /<Header theme=\{theme\} toggleTheme=\{toggleTheme\} onLogout=\{onLogout\} \/>/);
    assert.match(layout, /<BottomNav theme=\{theme\} toggleTheme=\{toggleTheme\} onLogout=\{onLogout\} \/>/);
    assert.doesNotMatch(layout, /Sidebar/);
    const pagina = semComentarios(ler("src/pages/dashboard/DashboardPage.jsx"));
    assert.match(pagina, /<AppLayout theme=\{theme\} toggleTheme=\{toggleTheme\} onLogout=\{handleLogout\} \/>/);
  });
});

// ── Item 5 ────────────────────────────────────────────────────────────────
import { destinoDeVolta } from "../../src/pages/public/naoEncontrada.js";

describe("Fase 2a · página não encontrada e volta ao topo", () => {
  test("o link da página não encontrada leva ao lugar certo", () => {
    assert.equal(destinoDeVolta("/qualquer", false).to, "/");
    assert.equal(destinoDeVolta("/qualquer", true).to, "/dashboard");
    assert.equal(destinoDeVolta("/dashboard/inexistente", true).to, "/dashboard");
    // O portal ganha do estado da sessão: cliente não vai para a área da advogada.
    assert.equal(destinoDeVolta("/portal/xyz", true).to, "/portal");
    assert.equal(destinoDeVolta("/portal/xyz", false).to, "/portal");
    assert.equal(destinoDeVolta("/portalzinho", false).to, "/");
  });

  test("há rota coringa no ramo da advogada e fora de tudo", () => {
    const rotas = semComentarios(ler("src/routes/AppRoutes.jsx"));
    assert.match(rotas, /<Route path="\*" element=\{<NotFoundPage dentroDoLayout \/>\} \/>/);
    assert.match(rotas, /<Route path="\*" element=\{<NotFoundPage \/>\} \/>\s*<\/Routes>/);
  });

  test("a volta ao topo dispara só no pathname, e rola quem rola", () => {
    const comp = semComentarios(ler("src/components/layout/VoltarAoTopo.jsx"));
    assert.match(comp, /\[pathname, seletor\]/);
    assert.doesNotMatch(comp, /search|location\.key/, "trocar a query (filtro, mês) não pode rolar");
    assert.doesNotMatch(comp, /behavior: 'smooth'/, "sem animação: prefers-reduced-motion");
    assert.match(semComentarios(ler("src/components/layout/AppLayout.jsx")), /<VoltarAoTopo seletor="\.main-content" \/>/);
    assert.match(semComentarios(ler("src/App.jsx")), /<VoltarAoTopo \/>/);
    // O seletor aponta para o elemento que de fato rola.
    assert.match(ler("src/components/layout/AppLayout.css"), /\.main-content \{[^}]*overflow-y: auto/);
  });
});
