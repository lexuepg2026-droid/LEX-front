// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.8 — a Agenda, as cores das naturezas e o celular das listas (DEC-134 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Larguras, cores pintadas e
// cliques ficam na verificação no navegador e no roteiro visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── Item 1 — o celular das listas (DEC-135) ───────────────────────────────
describe("Fase 3.8 · item 1 — no celular só o ⋮ fica fixo, e as notas mudaram de coluna (DEC-135)", () => {
  const css = semComentarios(ler("src/styles/modules.css"));
  const parcelas = semComentarios(ler("src/pages/installments/InstallmentListPage.jsx"));
  const pagamentos = semComentarios(ler("src/pages/payments/PaymentListPage.jsx"));

  // A célula `<td …>` que contém `trecho`, inteira.
  const celulaCom = (fonte, trecho) => {
    const pos = fonte.indexOf(trecho);
    assert.ok(pos > 0, `não achei ${trecho}`);
    const inicio = fonte.lastIndexOf("<td", pos);
    return { abertura: fonte.slice(inicio, fonte.indexOf(">", inicio) + 1), corpo: fonte.slice(inicio, fonte.indexOf("</td>", pos)) };
  };

  test("Parcelas: \"Reparcelada\" no Status (prio-1), com a mesma regra (parcela cancelada)", () => {
    const { abertura, corpo } = celulaCom(parcelas, ">Reparcelada<");
    assert.match(corpo, /<StatusBadge status=\{inst\.status\} \/>/, "a nota mora na célula do status");
    assert.match(corpo, /inst\.status === 'cancelado' &&/);
    assert.doesNotMatch(abertura, /prio-/, "a coluna da nota nunca sai");
    // A parcela cancelada continua sem menu: a regra das ações não mudou.
    assert.match(parcelas, /inst\.status === 'cancelado' \? \(\s*<span className="acao-indisponivel"[^>]*>—<\/span>\s*\) : \(\s*<ActionMenu/);
  });

  test("Pagamentos: \"sem recibo\" no Líquido (prio-1), com a mesma regra (líquido ≤ 0)", () => {
    const { abertura, corpo } = celulaCom(pagamentos, "sem recibo\n");
    assert.match(abertura, /cell-num/, "a nota mora na célula do líquido");
    assert.match(corpo, /\{formatCurrency\(liquido\)\}/);
    assert.match(corpo, /liquido <= 0 &&/);
    assert.match(corpo, /title="A emissão de recibo é recusada pelo servidor para pagamento sem valor líquido\."/);
    assert.doesNotMatch(abertura, /prio-/, "a coluna da nota nunca sai");
  });

  test("a 480 px ou menos: o ⋮ com 64 px nas cinco, a primeira coluna solta; acima, a DEC-133 intacta", () => {
    assert.match(css, /@media \(max-width: 480px\) \{\s*\.data-table--acoes-fixas col:last-child \{ width: 64px; \}\s*\}/);
    assert.match(css, /@media \(max-width: 480px\) \{\s*\.data-table--primeira-fixa th:first-child,\s*\.data-table--primeira-fixa td:first-child \{\s*position: static;\s*box-shadow: none;\s*\}\s*\}/);
    assert.doesNotMatch(css, /acoes-sem-nota/);
    // Fora do celular, nada mudou: o ⋮ com 120 px e a primeira coluna presa.
    assert.match(css, /\.col-acoes-menu \{ width: 120px; \}/);
    assert.match(css, /\.data-table--primeira-fixa th:first-child,\s*\.data-table--primeira-fixa td:first-child \{\s*position: sticky;/);
    // E o `static` só existe dentro do `@media` do celular.
    const fora = css.replace(/@media \(max-width: 480px\) \{[\s\S]*?\n\}/g, "");
    assert.doesNotMatch(fora, /position: static/);
  });

  test("a nota tem linha própria, sem quebrar, no tom das notas (F-1b)", () => {
    assert.match(css, /\.data-table \.nota-da-celula \{[^}]*display: block;[^}]*font-style: italic;[^}]*color: var\(--color-text-secondary\);[^}]*white-space: nowrap;/);
  });
});
