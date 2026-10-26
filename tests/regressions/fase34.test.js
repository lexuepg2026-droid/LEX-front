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
