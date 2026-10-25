// ═══════════════════════════════════════════════════════════════════════════
// CONTRASTE WCAG NOS DOIS MODOS (Fase 1, DEC-076)
//
// O inventário de 24/10/2026 mediu à mão e achou o modo claro falhando nos
// badges (2,0:1), no link dourado (2,6:1) e na borda de campo (1,3:1), e o
// escuro falhando no texto muted dos cards (2,6:1). Medida à mão envelhece na
// primeira troca de token; esta suíte mede de novo a cada `npm test`.
//
// Lê `src/styles/variables.css`, resolve os tokens de `:root` (escuro) e de
// `body.light-mode` (claro, herdando o que não redefine), compõe o alfa sobre o
// fundo real e confere cada par de `contrastePares.js` contra o seu limite.
//
// O que ela NÃO alcança: cor escrita fora de `variables.css`. É por isso que as
// folhas usam token para texto, fundo e borda que dependem do tema — e os
// literais que ficaram estão listados, com motivo, no relatório da Fase 1.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { lerModos, medirPar, parseCor, razao } from "../helpers/contraste.js";
import { PARES } from "./contrastePares.js";

describe("a fórmula", () => {
  test("preto sobre branco é 21:1 e branco sobre branco é 1:1", () => {
    assert.equal(razao(parseCor("#000"), parseCor("#FFFFFF")).toFixed(2), "21.00");
    assert.equal(razao(parseCor("#fff"), parseCor("#ffffff")), 1);
  });

  test("bate com a tabela 2.3 do inventário: bege sobre #222222 = 12,49:1", () => {
    assert.equal(razao(parseCor("#EDE3CF"), parseCor("#222222")).toFixed(2), "12.49");
  });

  test("o alfa é composto sobre o fundo: bege70 sobre #222222 = 6,81:1", () => {
    const modos = { t: "rgba(237, 227, 207, 0.7)", f: "#222222", "--color-bg": "#222222" };
    const r = medirPar(modos, { texto: "t", fundo: "f", sobre: [] });
    assert.equal(r.razao.toFixed(2), "6.81");
  });
});

const modos = lerModos();

for (const [modo, tokens] of Object.entries(modos)) {
  describe(`contraste — modo ${modo}`, () => {
    for (const par of PARES) {
      test(`${par.nome} ≥ ${par.limite}:1`, () => {
        const { razao: r, frente, fundo } = medirPar(tokens, par);
        assert.ok(
          r >= par.limite,
          `${par.nome}: ${r.toFixed(2)}:1 (${frente} sobre ${fundo}), mínimo ${par.limite}:1`
        );
      });
    }
  });
}
