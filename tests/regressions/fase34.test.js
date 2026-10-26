// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.4 — processo: formulário e lista (DEC-113 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Teclado e pixel ficam no roteiro
// visual do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── Item 1 — DEC-113 ──────────────────────────────────────────────────────
import { aoMudarFila, avisarFilaMudou } from "../../src/offline/outboxEvents.js";

describe("Fase 3.4 · item 1 — a fila avisa quando muda (DEC-113)", () => {
  test("quem assina é avisado, com o usuário; quem cancela, não", () => {
    const recebidos = [];
    const cancelar = aoMudarFila((u) => recebidos.push(u));
    avisarFilaMudou("u1");
    cancelar();
    avisarFilaMudou("u2");
    assert.deepEqual(recebidos, ["u1"]);
  });

  test("um assinante que lança não cala os outros", () => {
    let chegou = false;
    const c1 = aoMudarFila(() => { throw new Error("quebrado"); });
    const c2 = aoMudarFila(() => { chegou = true; });
    avisarFilaMudou("u1");
    c1(); c2();
    assert.equal(chegou, true);
  });

  test("assinar com algo que não é função não quebra", () => {
    const cancelar = aoMudarFila(null);
    assert.equal(typeof cancelar, "function");
    cancelar();
  });

  test("o módulo não conhece axios nem React", () => {
    const codigo = semComentarios(ler("src/offline/outboxEvents.js"));
    assert.doesNotMatch(codigo, /import/);
  });

  test("o interceptor continua sem importar o contexto", () => {
    const axios = semComentarios(ler("src/api/axiosConfig.js"));
    assert.doesNotMatch(axios, /OutboxContext|outboxEvents/);
  });
});

// ── Item 5 — DEC-117 ──────────────────────────────────────────────────────
describe("Fase 3.4 · item 5 — desativar e reativar num hook só (DEC-117)", () => {
  const hook = semComentarios(ler("src/hooks/useDesativacaoProcesso.js"));
  const detalhe = semComentarios(ler("src/pages/processes/ProcessDetailPage.jsx"));
  const lista = semComentarios(ler("src/pages/processes/ProcessListPage.jsx"));

  test("as duas ações e os mesmos textos de antes", () => {
    assert.match(hook, /await processService\.deleteProcess\(id\);\s*toast\.success\('Processo desativado\. Você pode reativá-lo quando quiser\.'\)/);
    assert.match(hook, /await processService\.reactivateProcess\(id\);\s*toast\.success\('Processo reativado\.'\)/);
    assert.match(hook, /'Erro ao desativar processo\.' : 'Erro ao reativar processo\.'/);
    assert.match(hook, /title: modal\.acao === 'reativar' \? 'Reativar processo' : 'Desativar processo'/);
  });

  test("o detalhe vai à lista só depois de desativar de fato", () => {
    assert.match(detalhe, /if \(!recusado && acao === 'desativar'\) navigate\('\/dashboard\/processos'\);/);
  });

  test("a lista refaz a consulta depois de agir", () => {
    assert.match(lista, /useDesativacaoProcesso\(\{ aoConcluir: reload \}\)/);
  });
});

// ── Item 2 — DEC-114 ──────────────────────────────────────────────────────
import { montarPayloadProcesso, FASE_PADRAO } from "../../src/utils/processoPayload.js";

describe("Fase 3.4 · item 2 — o processo nasce ativo (DEC-114)", () => {
  const form = {
    titulo: "Inventário", numeroProcesso: "", tipoAcao: "Inventário", area: "", orgao: "", vara: "",
    comarca: "", status: "suspenso", descricao: "", observacoes: "", dataDistribuicao: "",
    fase: "execucao", liminar: false, liminarObservacao: "", liminarEm: "",
    transitoEmJulgadoEm: "2026-10-01", motivoEncerramento: "acordo",
  };

  test("a criação não leva status, nem trânsito, nem motivo — e leva a fase escolhida", () => {
    const p = montarPayloadProcesso(form, { isEditing: false });
    assert.ok(!("status" in p), "o processo nasce ativo pelo default do back");
    assert.ok(!("transitoEmJulgadoEm" in p));
    assert.ok(!("motivoEncerramento" in p));
    assert.equal(p.fase, "execucao");
    assert.equal(montarPayloadProcesso({ ...form, fase: "" }, { isEditing: false }).fase, FASE_PADRAO);
  });

  test("a edição leva status, trânsito e motivo — e não a fase", () => {
    const p = montarPayloadProcesso(form, { isEditing: true });
    assert.equal(p.status, "suspenso");
    assert.equal(p.transitoEmJulgadoEm, "2026-10-01");
    assert.equal(p.motivoEncerramento, "acordo");
    assert.ok(!("fase" in p));
    const apagado = montarPayloadProcesso({ ...form, transitoEmJulgadoEm: "", motivoEncerramento: "" }, { isEditing: true });
    assert.equal(apagado.transitoEmJulgadoEm, null, "campo apagado envia null");
    assert.equal(apagado.motivoEncerramento, null);
  });

  const tela = semComentarios(ler("src/pages/processes/ProcessFormPage.jsx"));

  test("o seletor de status e a seção de encerramento só existem na edição", () => {
    assert.match(tela, /\{isEditing && \(\s*<div className="form-group span-1">\s*<label htmlFor="status">Status<\/label>/);
    assert.match(tela, /\{isEditing && \(\s*<div className="form-grid section">\s*<h3>Encerramento<\/h3>/);
    assert.doesNotMatch(tela, /charAt\(0\)\.toUpperCase\(\)/, "o rótulo do status sai de statusVisual");
  });

  test("os participantes no visual do detalhe, com o seletor com busca e o selo Principal", () => {
    assert.match(tela, /<SeletorComBusca[\s\S]*?id="clienteParaAdicionar"/);
    assert.match(tela, /p\.principal && <span className="participante-linha__principal">Principal<\/span>/);
    assert.match(tela, /type="radio"\s*name="participantePrincipal"/);
    assert.match(tela, /aria-label=\{`Remover \$\{nome\}`\}/);
  });

  test("o autocomplete de tipo de ação, área e comarca continua (DEC-057)", () => {
    for (const id of ["tipoAcao", "area", "comarca"]) {
      assert.match(tela, new RegExp(`<CampoComSugestoes\\s*id="${id}"`));
    }
  });
});
