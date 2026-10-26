// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.2 — LISTAS E FORMULÁRIOS FINANCEIROS
//
// Funções puras executadas de verdade; a fiação das telas por varredura (a
// suíte é `node --test` sem DOM). O que só o olho vê está no roteiro visual e
// na verificação no navegador do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import {
  ESPERA_DA_BUSCA_MS,
  LIMITE_DO_SELETOR_COM_BUSCA,
  MENSAGENS_DO_SELETOR,
  acaoDaBusca,
  sugestoesDaResposta,
  escolhaContinuaValendo,
} from "../../src/utils/seletorComBusca.js";
import { rotuloDoProcessoNoSeletor, rotuloDoHonorarioNoSeletor } from "../../src/utils/feeLabel.js";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ler = (caminho) => readFileSync(join(RAIZ, caminho), "utf8");
const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

// ═══════════════════════════════════════════════════════════════════════════
// Item 2 — os seletores buscam no servidor (DEC-101)
// ═══════════════════════════════════════════════════════════════════════════
describe("3.2 · item 2 — o seletor com busca no servidor", () => {
  test("espera de 300 ms e até 20 sugestões", () => {
    assert.equal(ESPERA_DA_BUSCA_MS, 300);
    assert.equal(LIMITE_DO_SELETOR_COM_BUSCA, 20);
  });

  test("campo vazio não busca; sem sinal avisa; com sinal busca o termo aparado", () => {
    assert.deepEqual(acaoDaBusca("   ", true), { acao: "nada", termo: "" });
    assert.deepEqual(acaoDaBusca("", false), { acao: "nada", termo: "" }, "vazio sem sinal não é erro");
    assert.deepEqual(acaoDaBusca(" joão ", false), { acao: "semConexao", termo: "joão" });
    assert.deepEqual(acaoDaBusca(" joão ", true), { acao: "buscar", termo: "joão" });
  });

  test("as frases: nenhum resultado, sem conexão, erro em linha", () => {
    assert.equal(MENSAGENS_DO_SELETOR.semResultado, "Nenhum resultado.");
    assert.match(MENSAGENS_DO_SELETOR.semConexao, /precisa de conexão/);
    assert.ok(MENSAGENS_DO_SELETOR.erro);
  });

  test("a resposta vira sugestão: filtrada pela regra da tela e cortada em 20", () => {
    const corpo = { data: Array.from({ length: 30 }, (_, i) => ({ _id: String(i), status: i % 3 ? "pendente" : "cancelado" })) };
    const todas = sugestoesDaResposta(corpo);
    assert.equal(todas.length, 20);
    const semCancelado = sugestoesDaResposta(corpo, { filtrar: (f) => f.status !== "cancelado" });
    assert.ok(semCancelado.every((f) => f.status !== "cancelado"), "o pagamento não sugere honorário cancelado");
    assert.deepEqual(sugestoesDaResposta(null), []);
  });

  test("digitar por cima da escolha a desfaz; o próprio rótulo a mantém", () => {
    const item = { _id: "a" };
    const rotulo = () => "Honorário A";
    assert.equal(escolhaContinuaValendo("Honorário A", item, rotulo), true);
    assert.equal(escolhaContinuaValendo("Honorário", item, rotulo), false);
    assert.equal(escolhaContinuaValendo("Honorário A", null, rotulo), false);
  });

  test("rótulo do processo: número — título — cliente principal", () => {
    assert.equal(
      rotuloDoProcessoNoSeletor({ numeroProcesso: "0001", titulo: "Inventário", clientePrincipalId: { tipoPessoa: "fisica", nomeCompleto: "João" } }),
      "0001 — Inventário — João"
    );
    assert.equal(rotuloDoProcessoNoSeletor({ titulo: "Sem número" }), "Sem número");
    assert.equal(rotuloDoProcessoNoSeletor({ numeroProcesso: "0002", titulo: "T", clientePrincipalId: "id-cru" }), "0002 — T",
      "cliente não populado não vira um traço solto");
  });

  test("rótulo do honorário com cliente PJ", () => {
    const fee = { descricao: "Custas", processoId: { numeroProcesso: "9", clientePrincipalId: { tipoPessoa: "juridica", razaoSocial: "Agro" } } };
    assert.equal(rotuloDoHonorarioNoSeletor(fee), "Custas — Processo nº 9 — Agro");
  });

  test("as buscas vão com semToastGlobal e limit 20", () => {
    const fee = semComentarios(ler("src/api/feeService.js"));
    assert.match(fee, /buscarHonorarios = \(busca\) =>\s*api\.get\('\/fees', \{ params: \{ page: 1, limit: LIMITE_DE_SUGESTOES, busca \}, semToastGlobal: true \}\)/);
    assert.match(fee, /LIMITE_DE_SUGESTOES = 20/);
    const proc = semComentarios(ler("src/api/processService.js"));
    assert.match(proc, /buscarProcessos = \(busca\) =>\s*api\.get\('\/processes', \{ params: \{ page: 1, limit: 20, busca \}, semToastGlobal: true \}\)/);
  });

  test("o pagamento filtra o cancelado nas sugestões", () => {
    const fonte = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(fonte, /const podeReceber = \(f\) => f\.status !== 'cancelado'/);
    assert.match(fonte, /filtrar=\{podeReceber\}/);
  });

  test("as três telas recusam salvar sem uma ESCOLHA, e destacam o campo", () => {
    for (const [arquivo, campo] of [
      ["src/pages/fees/FeeFormPage.jsx", "processoId"],
      ["src/pages/installments/InstallmentFormPage.jsx", "feeId"],
      ["src/pages/payments/PaymentFormPage.jsx", "honorarioId"],
    ]) {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, new RegExp(`!formData\\.${campo}\\)[\\s\\S]{0,120}MENSAGENS_DO_SELETOR\\.escolhaDaLista`), arquivo);
      assert.match(fonte, new RegExp(`setCampoComErro\\('${campo}'\\)`), arquivo);
    }
  });

  test("o seletor: sem sinal não pergunta, ignora resposta fora de ordem, espera entre teclas", () => {
    const fonte = semComentarios(ler("src/components/ui/SeletorComBusca.jsx"));
    assert.match(fonte, /acaoDaBusca\(termo, online\)/);
    assert.match(fonte, /if \(meu !== seq\.current\) return;/);
    assert.match(fonte, /setTimeout\([\s\S]*?ESPERA_DA_BUSCA_MS\)/);
    assert.match(fonte, /filtrarLocalmente=\{false\}/);
    assert.doesNotMatch(fonte, /autoFocus/);
  });

  test("o CampoComSugestoes continua sendo o da F-4 sem as props novas (DEC-057)", () => {
    const fonte = semComentarios(ler("src/components/ui/CampoComSugestoes.jsx"));
    assert.match(fonte, /filtrarLocalmente = true/);
    assert.match(fonte, /if \(onEscolher\) onEscolher\(item\);\s*else onChange\(rotulo\(item\)\);/);
    assert.match(fonte, /pode salvar assim mesmo/);
  });
});
