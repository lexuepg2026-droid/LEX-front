// ═══════════════════════════════════════════════════════════════════════════
// DEC-048 (frontend) — "PARCELA 1 DE 3"
//
// ── O defeito ────────────────────────────────────────────────────────────
// Depois de um reparcelamento, a tela mostrava "Parcela 3" para a PRIMEIRA
// parcela de um plano de três — porque a numeração continuava de onde parou.
//
// ── O que este arquivo trava ─────────────────────────────────────────────
// O rótulo sai de UMA função. Cinco telas mostram número de parcela (a página
// do honorário, a listagem, o extrato, a ficha do processo e o dashboard), e
// rótulo montado em cinco lugares é rótulo que vai divergir — aqui, divergir
// significa a lista dizer "Parcela 1 de 3" e o recibo dizer "parcela 3", sobre
// a mesma parcela.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  rotuloDaParcela,
  tamanhoDoPlanoVigente,
  rotuloNaLista
} from "../../src/components/financeiro/installmentLabel.js";
import { parcelaDoEvento } from "../../src/components/financeiro/statementEntry.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// As telas que mostram número de parcela.
const TELAS = [
  "src/pages/fees/FeeDetailPage.jsx",
  "src/pages/installments/InstallmentListPage.jsx",
  "src/components/financeiro/ProcessFinancialSheet.jsx",
  "src/pages/dashboard/DashboardHomePage.jsx"
];

describe("DEC-048 — o rótulo da parcela", () => {
  test("plano vigente: 1 de 3, 2 de 3, 3 de 3", () => {
    const plano = [1, 2, 3].map((n) => ({ numeroParcela: n, planoId: null, ativo: true }));
    assert.deepEqual(
      plano.map((p) => rotuloNaLista(p, plano)),
      ["Parcela 1 de 3", "Parcela 2 de 3", "Parcela 3 de 3"]
    );
  });

  test("🚨 depois do reparcelamento, as duas gerações dizem coisas diferentes", () => {
    const depois = [
      { numeroParcela: 1, planoId: null, totalParcelas: 2, status: "cancelado", ativo: true },
      { numeroParcela: 2, planoId: null, totalParcelas: 2, status: "cancelado", ativo: true },
      { numeroParcela: 1, planoId: "R1", totalParcelas: 3, ativo: true },
      { numeroParcela: 2, planoId: "R1", totalParcelas: 3, ativo: true },
      { numeroParcela: 3, planoId: "R1", totalParcelas: 3, ativo: true }
    ];
    assert.deepEqual(
      depois.map((p) => rotuloNaLista(p, depois)),
      [
        "Parcela 1 de 2", "Parcela 2 de 2",
        "Parcela 1 de 3", "Parcela 2 de 3", "Parcela 3 de 3"
      ]
    );
  });

  test("o congelado tem precedência sobre o plano vigente", () => {
    assert.equal(
      rotuloDaParcela({ numeroParcela: 1, totalParcelas: 2, totalNoPlanoVigente: 5 }),
      "Parcela 1 de 2"
    );
  });

  test("plano de uma parcela só não ganha `de 1`", () => {
    assert.equal(rotuloDaParcela({ numeroParcela: 1, totalParcelas: 1 }), "Parcela 1");
  });

  test("parcela ausente não vira `Parcela 0`", () => {
    // `Number(null)` é 0 e é finito.
    assert.equal(rotuloDaParcela({ numeroParcela: null }), "Parcela");
    assert.equal(rotuloDaParcela({}), "Parcela");
  });

  test("o plano vigente NÃO soma as gerações", () => {
    // Somar as gerações é exatamente o erro que a DEC-048 tirou do recibo.
    const depois = [
      { numeroParcela: 1, planoId: null, totalParcelas: 2, ativo: true },
      { numeroParcela: 1, planoId: "R1", totalParcelas: 3, ativo: true },
      { numeroParcela: 2, planoId: "R1", totalParcelas: 3, ativo: true },
      { numeroParcela: 3, planoId: "R1", totalParcelas: 3, ativo: true }
    ];
    assert.equal(tamanhoDoPlanoVigente(depois), 1, "só as do plano original contam");
  });

  test("parcela desativada não conta no plano vigente", () => {
    const plano = [
      { numeroParcela: 1, planoId: null, ativo: true },
      { numeroParcela: 2, planoId: null, ativo: false }
    ];
    assert.equal(tamanhoDoPlanoVigente(plano), 1);
  });
});

describe("DEC-048 — o extrato usa a referência do backend", () => {
  test("a frase pronta do backend tem precedência", () => {
    // Só o backend sabe o "de N" congelado de cada geração.
    assert.equal(
      parcelaDoEvento({
        referencia: "parcela 1 de 3, vencendo 15/09/2026",
        numeroParcela: 1
      }),
      "parcela 1 de 3, vencendo 15/09/2026"
    );
  });

  test("sem `referencia`, cai no ordinal — resposta de API antiga não quebra a tela", () => {
    assert.equal(parcelaDoEvento({ numeroParcela: 2 }), "parcela 2");
  });

  test("sem parcela nenhuma, a frase continua legível", () => {
    assert.match(parcelaDoEvento({ numeroParcela: null }), /não está mais na lista/);
  });
});

describe("DEC-048 — nenhuma tela monta o rótulo por conta própria", () => {
  test("as quatro telas importam a função única", () => {
    for (const arquivo of TELAS) {
      assert.match(
        semComentarios(ler(arquivo)),
        /import \{[^}]*rotulo(DaParcela|NaLista)[^}]*\} from ['"][^'"]*installmentLabel['"]/,
        `${arquivo}: o rótulo precisa vir de \`installmentLabel\``
      );
    }
  });

  test("nenhuma tela escreve `Parcela {n}` na mão", () => {
    // A prova negativa: se alguém voltar a montar o rótulo no JSX, ele volta a
    // divergir da função — e a divergência é invisível até um reparcelamento.
    for (const arquivo of TELAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.ok(
        !/Parcela \{/.test(codigo),
        `${arquivo}: rótulo de parcela montado no JSX em vez de \`installmentLabel\``
      );
    }
  });

  test("a função não conta o plano somando gerações", () => {
    const fonte = semComentarios(ler("src/components/financeiro/installmentLabel.js"));
    assert.match(
      fonte, /planoId \?\? null\) === null/,
      "o tamanho do plano vigente precisa filtrar por `planoId` nulo"
    );
  });
});
