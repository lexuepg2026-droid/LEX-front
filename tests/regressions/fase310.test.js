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

// ── Decisão 3 — a PendenciasPage na pele nova (DEC-153) ──────────────────
describe("Fase 3.10 · decisão 3 — Pendências na pele das listas (DEC-153)", () => {
  const tela = semComentarios(ler("src/pages/pendencias/PendenciasPage.jsx"));
  const css = ler("src/pages/pendencias/PendenciasPage.css").replace(/\/\*[\s\S]*?\*\//g, "");

  test("o balão, o título com o total e as linhas", () => {
    assert.match(tela, /<section className="lista-balao" aria-labelledby="titulo-pendencias">/);
    assert.match(tela, /Alterações não enviadas\s*<span className="lista-balao__total"> \(\{quantidade\}\)<\/span>/);
    assert.match(tela, /import '\.\.\/\.\.\/components\/financeiro\/CabecalhoDeLista\.css';/);
    assert.match(css, /\.fila__item \{[^}]*border-bottom: 1px solid var\(--color-border\);/);
    assert.match(css, /\.fila__item:hover \{[^}]*background-color: var\(--color-surface-raised\);/);
  });

  test("a regra da DEC-060 é a mesma: as duas versões, o reenvio, o descarte só pelo Modal", () => {
    assert.match(tela, /\{conflito && \(\s*<ComparacaoDeVersoes minha=\{entrada\.body\} doServidor=\{entrada\.falha\?\.atual\} \/>/);
    assert.match(tela, /onClick=\{\(\) => manterMinha\(entrada\)\}/);
    assert.match(tela, /onClick=\{\(\) => tentarDeNovo\(entrada\.id\)\}/);
    assert.match(tela, /onConfirm=\{confirmarDescarte\}/);
    assert.match(tela, /await manterMinhaVersao\(user\?\.id, entrada\.id\);\s*await recarregar\(\);\s*await enviar\(\);/);
    for (const frase of ["Sem conexão. A fila sobe sozinha quando o sinal voltar.", "Tudo que você gravou já está no servidor.", "Manter a minha versão", "Ficar com a do servidor", "Tentar enviar agora"]) {
      assert.ok(tela.includes(frase), frase);
    }
  });

  test("as classes não colidem mais com a PendenciaList dos documentos", () => {
    assert.doesNotMatch(tela, /className=\{?[`"]pendencia/);
    assert.doesNotMatch(css, /\.pendencia/);
    assert.match(ler("src/components/documents/PendenciaList.css"), /^\.pendencia \{/m);
  });
});
