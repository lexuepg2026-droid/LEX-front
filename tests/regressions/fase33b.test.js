// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.3b — o detalhe do processo (DEC-109 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Teclado e pixel ficam no roteiro
// visual do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  avisoProprioPara, faixaMostraAviso, idsPublicadosPara
} from "../../src/components/layout/contexto.js";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── Item 1 — DEC-109 ──────────────────────────────────────────────────────
describe("Fase 3.3b · item 1 — um aviso de idade por tela (DEC-109)", () => {
  const DETALHE = "/dashboard/processos/detalhe/p1";
  const publicadoPeloDetalhe = { pathname: DETALHE, processoId: "p1", clienteId: null, avisoProprio: true };

  test("sem sinal, no detalhe do processo, aparece UM aviso: o da tela", () => {
    // A tela e a faixa leem o mesmo processo pelo espelho: sem sinal, as duas
    // vêm do espelho. A tela mostra o dela; a faixa, não.
    const avisoProprio = avisoProprioPara(publicadoPeloDetalhe, DETALHE);
    const daTela = 1;
    const daFaixa = faixaMostraAviso({ fromCache: true, avisoProprio }) ? 1 : 0;
    assert.equal(daTela + daFaixa, 1);
  });

  test("tela sem aviso próprio continua com o aviso da faixa", () => {
    const formulario = { pathname: "/dashboard/honorarios/novo", processoId: "p1", clienteId: null, avisoProprio: false };
    assert.equal(faixaMostraAviso({ fromCache: true, avisoProprio: avisoProprioPara(formulario, formulario.pathname) }), true);
  });

  test("com sinal, nenhum aviso", () => {
    assert.equal(faixaMostraAviso({ fromCache: false, avisoProprio: false }), false);
    assert.equal(faixaMostraAviso({ fromCache: false, avisoProprio: true }), false);
  });

  test("a dispensa é casada com o caminho: não vale na tela seguinte", () => {
    assert.equal(avisoProprioPara(publicadoPeloDetalhe, "/dashboard/honorarios/novo"), false);
    assert.equal(avisoProprioPara(null, DETALHE), false);
    // Só `true` dispensa; qualquer outra coisa mantém o aviso da faixa.
    assert.equal(avisoProprioPara({ ...publicadoPeloDetalhe, avisoProprio: "sim" }, DETALHE), false);
  });

  test("os ids publicados não mudaram de forma", () => {
    assert.deepEqual(idsPublicadosPara(publicadoPeloDetalhe, DETALHE), { processoId: "p1", clienteId: null });
  });

  test("a faixa consulta a dispensa do caminho atual", () => {
    const faixa = semComentarios(ler("src/components/layout/FaixaContexto.jsx"));
    assert.match(faixa, /const avisoProprio = useAvisoProprioPublicado\(location\.pathname\)/);
  });
});

// ── Item 5 — DEC-110 ──────────────────────────────────────────────────────
import { rotuloDoClienteNoSeletor, documentoFormatado } from "../../src/utils/clienteLabel.js";

describe("Fase 3.3b · item 5 — o seletor de participante busca no servidor (DEC-110)", () => {
  test("rótulo: nome — CPF formatado", () => {
    assert.equal(
      rotuloDoClienteNoSeletor({ tipoPessoa: "fisica", nomeCompleto: "João Conceição", cpf: "79426153837" }),
      "João Conceição — 794.261.538-37"
    );
  });

  test("rótulo: razão social — CNPJ formatado", () => {
    assert.equal(
      rotuloDoClienteNoSeletor({ tipoPessoa: "juridica", razaoSocial: "Padaria Pão Quente Ltda", cnpj: "11222333000181" }),
      "Padaria Pão Quente Ltda — 11.222.333/0001-81"
    );
  });

  test("sem documento, só o nome; sem cliente, nada", () => {
    assert.equal(rotuloDoClienteNoSeletor({ tipoPessoa: "fisica", nomeCompleto: "Ana" }), "Ana");
    assert.equal(rotuloDoClienteNoSeletor(null), "");
    assert.equal(documentoFormatado(undefined), "");
  });

  const form = semComentarios(ler("src/pages/processes/ProcessFormPage.jsx"));

  test("o formulário não carrega mais os 100 primeiros clientes", () => {
    assert.doesNotMatch(form, /getAllClients/);
    assert.doesNotMatch(form, /limit: 100/);
    assert.doesNotMatch(form, /<select\s+id="clienteParaAdicionar"/);
  });

  test("o seletor é o SeletorComBusca, com o rótulo da fonte única e sem quem já participa", () => {
    assert.match(form, /<SeletorComBusca[\s\S]*?id="clienteParaAdicionar"[\s\S]*?rotulo=\{rotuloDoClienteNoSeletor\}[\s\S]*?filtrar=\{aindaNaoParticipa\}/);
    const servico = semComentarios(ler("src/api/clientService.js"));
    assert.match(servico, /buscarClientes = \(busca\) =>\s*api\.get\('\/clients', \{ params: \{ page: 1, limit: 20, busca \}, semToastGlobal: true \}\)/);
  });

  test("o cliente exibido não viaja no payload da criação", () => {
    // `participantes` continua { clienteId, papel, principal }; o objeto do
    // cliente mora em `clientesConhecidos`.
    assert.match(form, /createProcess\(\{ \.\.\.payload, clientes: participantes \}\)/);
    assert.doesNotMatch(form, /setParticipantes\([^)]*cliente:/);
    assert.match(form, /const cliente = clientesConhecidos\[p\.clienteId\]/);
  });
});
