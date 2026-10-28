// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.9b — Documentos, parte b: a montagem e o texto final (DEC-144 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Larguras, cores pintadas,
// cliques, foco e arrastar ficam na verificação no navegador e no roteiro
// visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { consultaDaLarguraMinima } from "../../src/hooks/useLarguraMinima.js";
import {
  POR_PAGINA_DA_BIBLIOTECA,
  acumularSecoes,
  secoesRestantes,
  rotuloDoCarregarMais,
  FRASE_SEM_CONEXAO_DA_BIBLIOTECA,
} from "../../src/components/documents/bibliotecaDeSecoes.js";

const RAIZ = new URL("../..", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const semComentariosCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

// As declarações de `transform`/`filter` de uma folha, fora de `@keyframes`
// (a animação do ícone que gira não é ancestral de nada).
const transformacoesForaDeKeyframes = (css) => {
  const limpo = semComentariosCss(css).replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  return [...limpo.matchAll(/(?:^|[;{\s])(transform|filter|perspective|contain)\s*:/g)].map((m) => m[1]);
};

// ── Item 1 — a montagem na pele das outras telas (DEC-145) ───────────────
describe("Fase 3.9b · item 1 — cabeçalho em balão, lado a lado, painel no celular (DEC-145)", () => {
  const pagina = semComentarios(ler("src/pages/documents/DocumentAssemblyPage.jsx"));
  const painel = semComentarios(ler("src/components/documents/BibliotecaEmPainel.jsx"));
  const cssPagina = ler("src/pages/documents/DocumentAssemblyPage.css");
  const cssCanvas = ler("src/components/documents/DocumentCanvas.css");

  test("a largura da troca é 1024, a borda da barra de baixo — no hook e no CSS", () => {
    assert.equal(consultaDaLarguraMinima(1024), "(min-width: 1024px)");
    assert.match(pagina, /const LARGURA_DA_BIBLIOTECA_AO_LADO = 1024;/);
    assert.match(pagina, /useLarguraMinima\(LARGURA_DA_BIBLIOTECA_AO_LADO\)/);
    assert.match(cssPagina, /@media \(max-width: 1023px\) \{\s*\.montagem__area \{\s*grid-template-columns: minmax\(0, 1fr\);/);
    assert.match(cssPagina, /grid-template-columns: minmax\(0, 1fr\) 320px;/);
  });

  test("o cabeçalho: o selo do modo, o indicador de salvamento e o ⋮ com as ações que já existiam", () => {
    assert.match(pagina, /'Novo modelo' : 'Novo documento'/);
    assert.match(pagina, /className=\{`montagem__cabecalho montagem__cabecalho--\$\{modo\}`\}/);
    assert.match(pagina, /<div className="montagem__estado" aria-live="polite">/);
    assert.match(pagina, /<ActionMenu rotulo=/);
    // As ações do ⋮ são as que a tela já dizia em texto, com os mesmos destinos.
    assert.match(pagina, /to: '\/dashboard\/documentos\/montar\?modo=documento'/);
    assert.match(pagina, /to: '\/dashboard\/secoes'/);
  });

  test("abaixo de 1024 a biblioteca é um diálogo: role, aria-modal, Escape, Tab que circula", () => {
    assert.match(painel, /role="dialog"/);
    assert.match(painel, /aria-modal="true"/);
    assert.match(painel, /e\.key === 'Escape'[\s\S]{0,80}onFechar\(\)/);
    assert.match(painel, /e\.preventDefault\(\);\s*ultimo\.focus\(\)/);
    assert.match(painel, /e\.preventDefault\(\);\s*primeiro\.focus\(\)/);
    // Foco no primeiro item ao abrir, sem `autoFocus`.
    assert.match(painel, /querySelector\(SELETOR_FOCAVEL\)\?\.focus\(\)/);
    assert.doesNotMatch(painel, /autoFocus/);
    // Fechado continua montado (a busca não se perde), escondido.
    assert.match(painel, /hidden=\{!aberto\}/);
  });

  test("o foco volta ao botão, e inserir pelo painel fecha o painel", () => {
    assert.match(pagina, /setBibliotecaAberta\(false\);\s*botaoDaBiblioteca\.current\?\.focus\(\);/);
    assert.match(pagina, /if \(!bibliotecaAoLado && secao\) fecharBiblioteca\(\);\s*setSecaoArmada\(secao\);/);
    assert.match(pagina, /if \(!bibliotecaAoLado\) fecharBiblioteca\(\);\s*return adicionarAoFim\(secao\);/);
    assert.match(pagina, /aria-expanded=\{bibliotecaAberta\}/);
    assert.match(pagina, /aria-controls="montagem-painel-biblioteca"/);
  });

  test("nenhum transform/filter em ancestral do ⋮ ou do arrastar (DEC-046)", () => {
    for (const arquivo of [
      "src/pages/documents/DocumentAssemblyPage.css",
      "src/components/documents/DocumentCanvas.css",
      "src/components/documents/SecaoLibraryPanel.css",
      "src/components/documents/BibliotecaEmPainel.css",
    ]) {
      assert.deepEqual(transformacoesForaDeKeyframes(ler(arquivo)), [], arquivo);
    }
    // A entrada do painel é por opacidade, sem `transform` nem dentro da animação.
    assert.doesNotMatch(semComentariosCss(ler("src/components/documents/BibliotecaEmPainel.css")), /transform/);
  });

  test("a folha continua papel branco, com o texto do papel, e cede à moldura", () => {
    const css = semComentariosCss(cssCanvas);
    assert.match(css, /\.canvas-folha \{[^}]*background: #ffffff;/);
    assert.match(css, /\.canvas-folha,\s*\.canvas-folha \* \{\s*color: #1a1a18;/);
    assert.match(css, /\.canvas-folha \{[^}]*max-width: 210mm;/);
    assert.match(css, /\.canvas-folha \{[^}]*padding: 25mm;/);
  });

  test("a montagem não tocou no que é protegido: a sentinela, a fila, assemblyState", () => {
    assert.match(pagina, /const montado = useIsMounted\(\);/);
    assert.match(pagina, /const enfileirar = useSerialQueue\(\);/);
    assert.match(pagina, /from '\.\/assemblyState\.js'/);
    // Quem ordena é o backend: inserir relê, não reproduz o empurrão.
    assert.match(pagina, /await documentService\.vincularSecao\(id, \{ secaoId, ordem \}\);\s*await recarregarVinculos\(\);/);
  });
});

// ── Item 2 — a biblioteca por busca no servidor (DEC-146) ────────────────
describe("Fase 3.9b · item 2 — a biblioteca por busca, sem o teto de 100 (DEC-146)", () => {
  const biblioteca = semComentarios(ler("src/components/documents/SecaoLibraryPanel.jsx"));
  const api = semComentarios(ler("src/api/secaoService.js"));

  test("acumular: a página 1 substitui; as seguintes acrescentam sem repetir", () => {
    const a = { _id: "a" };
    const b = { _id: "b" };
    const c = { _id: "c" };
    assert.deepEqual(acumularSecoes([a, b], [c], 1), [c]);
    assert.deepEqual(acumularSecoes([a, b], [b, c], 2), [a, b, c]);
    assert.deepEqual(acumularSecoes(undefined, null, 2), []);
    assert.deepEqual(acumularSecoes([a], "nada", 1), []);
  });

  test("quantas faltam, e a frase do botão", () => {
    assert.equal(POR_PAGINA_DA_BIBLIOTECA, 20);
    assert.equal(secoesRestantes(132, 20), 112);
    assert.equal(secoesRestantes(20, 20), 0);
    assert.equal(secoesRestantes(null, 20), 0);
    assert.equal(rotuloDoCarregarMais(1), "Carregar mais (falta 1)");
    assert.equal(rotuloDoCarregarMais(112), "Carregar mais (faltam 112)");
  });

  test("sem `limit: 100`; pede 20 por vez, com semToastGlobal, e sem sinal diz que precisa de conexão", () => {
    assert.doesNotMatch(biblioteca, /limit: 100/);
    assert.doesNotMatch(biblioteca, /listSecoes\(/);
    assert.match(biblioteca, /buscarSecoesDaBiblioteca\(\{\s*page: 1,\s*limit: POR_PAGINA_DA_BIBLIOTECA,/);
    assert.match(biblioteca, /page: proxima,\s*limit: POR_PAGINA_DA_BIBLIOTECA,/);
    assert.match(api, /api\.get\('\/secoes', \{ params, semToastGlobal: true \}\)/);
    assert.equal(FRASE_SEM_CONEXAO_DA_BIBLIOTECA, "A busca precisa de conexão. Conecte-se para procurar seções.");
    assert.match(biblioteca, /!online \? FRASE_SEM_CONEXAO_DA_BIBLIOTECA/);
  });

  test("o pedido mais recente vence (a busca nova descarta o 'mais' da anterior)", () => {
    assert.match(biblioteca, /const pedido = \+\+pedidoAtual\.current;/);
    assert.ok((biblioteca.match(/if \(pedido !== pedidoAtual\.current\) return;/g) ?? []).length >= 2);
  });

  test("armar e inserir NÃO mudaram: o mesmo clique, o mesmo Adicionar, o mesmo arrastar", () => {
    assert.match(biblioteca, /onClick=\{\(\) => onArmar\(armada \? null : secao\)\}/);
    assert.match(biblioteca, /onClick=\{\(\) => onAdicionarAoFim\(secao\)\}/);
    assert.match(biblioteca, /setData\('text\/lex-secao-id', String\(secao\._id\)\)/);
    assert.match(biblioteca, /setData\('text\/lex-origem', 'biblioteca'\)/);
    assert.match(biblioteca, /draggable=\{!usada && !desabilitado\}/);
  });
});
