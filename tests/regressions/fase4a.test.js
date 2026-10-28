// ═══════════════════════════════════════════════════════════════════════════
// FASE 4a — manutenção sem decisão pendente (DEC-156 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. O foco de verdade (o primeiro
// Tab, o Enter, o Tab seguinte) fica na verificação do navegador e no roteiro
// visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../..", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── Item 1 — "Pular para o conteúdo" (DEC-156) ───────────────────────────
describe("Fase 4a · item 1 — \"Pular para o conteúdo\" (DEC-156)", () => {
  const componente = semComentarios(ler("src/components/ui/PularParaConteudo.jsx"));
  const css = semComentarios(ler("src/components/ui/PularParaConteudo.css"));
  const layouts = {
    advogada: semComentarios(ler("src/components/layout/AppLayout.jsx")),
    portal: semComentarios(ler("src/components/portal/PortalLayout.jsx"))
  };

  test("o link leva ao #conteudo, move o foco para lá e não deixa o hash na URL", () => {
    assert.match(componente, /export const ID_DO_CONTEUDO = 'conteudo'/);
    assert.match(componente, /href=\{`#\$\{ID_DO_CONTEUDO\}`\}/);
    assert.match(componente, />\s*Pular para o conteúdo\s*</);
    assert.match(componente, /e\.preventDefault\(\);\s*alvo\.focus\(\);/);
  });

  for (const [qual, fonte] of Object.entries(layouts)) {
    test(`layout da ${qual === "portal" ? "portal" : "advogada"}: o link é o PRIMEIRO elemento, antes de qualquer outro focável`, () => {
      const corpo = fonte.slice(fonte.indexOf("return ("));
      const posLink = corpo.indexOf("<PularParaConteudo />");
      assert.ok(posLink > 0, "o layout monta o link");
      for (const depois of ["<Header", "<header", "<FaixaContexto", "<EmailConfirmationBanner", "<button", "<main"]) {
        const pos = corpo.indexOf(depois);
        if (pos !== -1) assert.ok(posLink < pos, `o link vem antes de ${depois}`);
      }
    });

    test(`layout da ${qual === "portal" ? "portal" : "advogada"}: o <main> é o alvo, com tabIndex={-1}`, () => {
      assert.match(fonte, /<main id=\{ID_DO_CONTEUDO\} tabIndex=\{-1\}/);
      assert.equal((fonte.match(/<main\b/g) || []).length, 1, "um <main> só");
    });
  }

  test("nas telas de autenticação o link não entra (o primeiro Tab já é o \"Voltar\")", () => {
    const auth = semComentarios(ler("src/components/layout/LayoutAutenticacao.jsx"));
    assert.doesNotMatch(auth, /PularParaConteudo/);
  });

  test("o portal o importa de ui/, nunca de layout/ (isolamento da Fase 3.2)", () => {
    assert.match(layouts.portal, /from '\.\.\/ui\/PularParaConteudo\.jsx'/);
    assert.doesNotMatch(layouts.portal, /layout\/PularParaConteudo/);
  });

  test("escondido sem display:none (senão não recebe foco), visível no foco, com o anel da marca", () => {
    const repouso = css.match(/\.pular-conteudo\s*\{([^}]*)\}/)[1];
    assert.doesNotMatch(repouso, /display:\s*none|visibility:\s*hidden/);
    assert.match(repouso, /position:\s*fixed/);
    assert.match(repouso, /clip:\s*rect\(0 0 0 0\)/);
    const foco = css.match(/\.pular-conteudo:focus\s*\{([^}]*)\}/)[1];
    assert.match(foco, /clip:\s*auto/);
    assert.match(foco, /background-color:\s*var\(--color-marca-escuro\)/);
    assert.match(foco, /color:\s*var\(--color-marca-texto\)/);
    const anel = css.match(/\.pular-conteudo:focus-visible\s*\{([^}]*)\}/)[1];
    assert.match(anel, /outline:\s*var\(--focus-ring-width\) solid var\(--color-marca-foco\)/);
    // A regra 8 da fase: `--color-primary` é só fundo, e aqui nem fundo é.
    assert.doesNotMatch(css, /--color-primary/);
  });

  test("o <main> focado mostra o anel por dentro, nos dois layouts", () => {
    assert.match(semComentarios(ler("src/components/layout/AppLayout.css")),
      /\.main-content:focus-visible\s*\{[^}]*outline-offset:\s*calc\(-1 \* var\(--focus-ring-width\)\)/);
    assert.match(semComentarios(ler("src/components/portal/Portal.css")),
      /\.portal__conteudo:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-marca-foco\)/);
  });

  test("os pares de contraste do link estão medidos", () => {
    const pares = ler("tests/css/contrastePares.js");
    for (const nome of [
      "pular para o conteúdo: texto / --color-marca-escuro",
      "pular para o conteúdo: anel / --color-marca-escuro",
      "pular para o conteúdo: anel / --color-marca-fundo (cabeçalho, portal)"
    ]) assert.ok(pares.includes(nome), nome);
  });
});
