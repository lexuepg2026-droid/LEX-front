// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.10 — fechamento do porte (DEC-151 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Cliques, foco e larguras ficam
// na varredura do navegador e no roteiro visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { descricaoDoRecorteFinanceiro } from "../../src/components/financeiro/filterSummary.js";

const RAIZ = new URL("../..", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── Decisão 1 — o filtro por honorário por busca (DEC-151) ───────────────
describe("Fase 3.10 · decisão 1 — o honorário dos filtros por busca, sem o teto de 100 (DEC-151)", () => {
  const barra = semComentarios(ler("src/components/financeiro/FinancialFilters.jsx"));
  const api = semComentarios(ler("src/api/feeService.js"));
  const paginas = ["src/pages/installments/InstallmentListPage.jsx", "src/pages/payments/PaymentListPage.jsx"];

  test("as duas listas não pedem mais os 100 honorários, e ligam o seletor da barra", () => {
    for (const p of paginas) {
      const fonte = semComentarios(ler(p));
      assert.doesNotMatch(fonte, /limit: 100/, p);
      assert.doesNotMatch(fonte, /listFees\(/, p);
      assert.match(fonte, /filtroDeHonorario=\{\{ onEscolhido: setHonorarioEscolhido \}\}/, p);
      assert.match(fonte, /honorarios: honorarioEscolhido && filtros\.honorarioId \? \[honorarioEscolhido\] : \[\]/, p);
    }
  });

  test("o seletor da DEC-101: busca com semToastGlobal, o rótulo completo, o id da URL buscado pelo id, não obrigatório", () => {
    assert.match(barra, /<SeletorComBusca\s+id="filtro-honorario"/);
    assert.match(barra, /valor=\{filtros\.honorarioId\}/);
    assert.match(barra, /onMudar=\{\(hid\) => definirFiltro\('honorarioId', hid \|\| ''\)\}/);
    assert.match(barra, /buscarPorId=\{buscarHonorarioPorId\}/);
    assert.match(barra, /rotulo=\{rotuloDoHonorarioNoSeletor\}/);
    assert.match(barra, /obrigatorio=\{false\}/);
    assert.match(barra, /aria-label="Filtrar por honorário"/);
    assert.match(api, /api\.get\('\/fees', \{ params: \{ page: 1, limit: LIMITE_DE_SUGESTOES, busca \}, semToastGlobal: true \}\)/);
    assert.doesNotMatch(barra, /<select[^>]*Filtrar por honorário/);
  });

  test("a frase do recorte nomeia o escolhido, e sem ele diz 'para este honorário'", () => {
    const filtros = { honorarioId: "h1", preset: "todos" };
    const escolhido = { _id: "h1", descricao: "Honorários advocatícios — execução fiscal" };
    assert.match(descricaoDoRecorteFinanceiro({ filtros, honorarios: [escolhido] }), /do honorário "execução fiscal"/);
    assert.match(descricaoDoRecorteFinanceiro({ filtros, honorarios: [] }), /para este honorário/);
  });

  test("nenhuma lista passa mais a prop morta `honorarios`", () => {
    for (const p of ["clients/ClientListPage", "secoes/SecaoListPage", "processes/ProcessListPage", "documents/DocumentListPage", "fees/FeeListPage", ...paginas.map((x) => x.replace(/^src\/pages\/|\.jsx$/g, ""))]) {
      assert.doesNotMatch(semComentarios(ler(`src/pages/${p}.jsx`)), /\shonorarios=\{/, p);
    }
  });
});
