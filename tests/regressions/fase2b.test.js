// ═══════════════════════════════════════════════════════════════════════════
// FASE 2b — contexto, erros e aviso de e-mail (DEC-083 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Teclado e pixel ficam no roteiro
// visual do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const SRC = join(RAIZ, "src");
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const arquivos = (dir, exts) => readdirSync(dir).flatMap((nome) => {
  const c = join(dir, nome);
  if (statSync(c).isDirectory()) return arquivos(c, exts);
  return exts.some((e) => nome.endsWith(e)) ? [c] : [];
});

// ── Item 1 — DEC-083 ──────────────────────────────────────────────────────
import {
  toast, subscribe, DURACOES, JANELA_DEDUP, duracaoDe, regiaoDe, deveEmitir, _limparDeduplicacao
} from "../../src/utils/toast.js";

describe("Fase 2b · item 1 — o toast por tipo (DEC-083)", () => {
  test("duração: sucesso 3 s, info 4 s, erro 6 s", () => {
    assert.equal(duracaoDe("success"), 3000);
    assert.equal(duracaoDe("info"), 4000);
    assert.equal(duracaoDe("error"), 6000);
    assert.equal(duracaoDe("desconhecido"), DURACOES.info, "tipo estranho fica no meio");
  });

  test("região: erro em alert, sucesso e info em status", () => {
    assert.equal(regiaoDe("error"), "alert");
    assert.equal(regiaoDe("success"), "status");
    assert.equal(regiaoDe("info"), "status");
  });

  test("deduplicação: mesma mensagem e mesmo tipo dentro de 4 s sai uma vez", () => {
    const r = new Map();
    assert.equal(JANELA_DEDUP, 4000);
    assert.equal(deveEmitir(r, "error", "Servidor fora.", 1000), true);
    assert.equal(deveEmitir(r, "error", "Servidor fora.", 1200), false);
    assert.equal(deveEmitir(r, "error", "Servidor fora.", 4999), false, "ainda dentro da janela");
    assert.equal(deveEmitir(r, "error", "Servidor fora.", 5000), true, "4 s depois, sai de novo");
  });

  test("deduplicação não junta tipos nem mensagens diferentes", () => {
    const r = new Map();
    assert.equal(deveEmitir(r, "error", "A", 0), true);
    assert.equal(deveEmitir(r, "info", "A", 10), true, "mesmo texto, outro tipo");
    assert.equal(deveEmitir(r, "error", "B", 20), true, "mesmo tipo, outro texto");
  });

  test("o registro não cresce sem fim", () => {
    const r = new Map();
    for (let i = 0; i < 50; i += 1) deveEmitir(r, "error", `m${i}`, i);
    deveEmitir(r, "error", "depois", 10_000);
    assert.equal(r.size, 1);
  });

  test("a rajada do Início vira um toast só", () => {
    _limparDeduplicacao();
    const recebidos = [];
    const sair = subscribe((t) => recebidos.push(t));
    for (let i = 0; i < 5; i += 1) toast.error("Não foi possível falar com o servidor.");
    sair();
    assert.equal(recebidos.length, 1);
  });

  test("o container usa as duas regiões, o × rotulado e as regras do módulo", () => {
    const fonte = semComentarios(ler("src/components/ui/ToastContainer.jsx"));
    assert.match(fonte, /role="alert" aria-live="assertive"/);
    assert.match(fonte, /role="status" aria-live="polite"/);
    assert.match(fonte, /aria-label="Fechar aviso"/);
    assert.match(fonte, /duracaoDe\(/, "a duração vem do módulo, não de constante local");
    assert.match(fonte, /regiaoDe\(/);
    assert.match(fonte, /onMouseEnter/, "pausa com o mouse");
    assert.match(fonte, /onFocus/, "pausa com o foco");
    assert.match(fonte, /'Escape'/);
    assert.doesNotMatch(fonte, /const DURATION/, "a duração única de 3 s saiu");
    assert.doesNotMatch(fonte, /if \(toasts\.length === 0\) return null/,
      "as regiões ficam montadas mesmo vazias");
  });

  test("o toast continua acima da barra de baixo até 1023 px", () => {
    const css = ler("src/styles/toast.css");
    assert.match(css, /@media \(max-width: 1023px\)\s*\{\s*\.toast-container\s*\{[^}]*bottom:\s*calc\(var\(--bottom-nav-height\)/);
  });
});
