// ═══════════════════════════════════════════════════════════════════════════
// FASE 2a — navegação, autenticação, vocabulário (DEC-077 a DEC-082)
//
// Varreduras estáticas do que a suíte sem DOM consegue provar: que os nomes,
// as rotas e as peças de navegação estão no lugar. O que é pixel e teclado
// real fica no roteiro visual do relatório da fase.
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

// ── Item 8 — DEC-080 ──────────────────────────────────────────────────────
describe("Fase 2a · vocabulário único no financeiro (DEC-080)", () => {
  test("o Financeiro tem as seções Honorários, Parcelas e Pagamentos", () => {
    const fonte = semComentarios(ler("src/pages/financeiro/FinanceiroPage.jsx"));
    for (const titulo of ["Honorários", "Parcelas", "Pagamentos"]) {
      assert.match(fonte, new RegExp(`title: '${titulo}'`));
    }
  });

  test("nenhum texto visível diz 'Cobrança' ou 'Recebimento'", () => {
    // Só código (comentários fora): nome de variável ou de rota não usa essas
    // palavras, então qualquer ocorrência é texto que a advogada lê.
    const culpados = [];
    for (const caminho of arquivos(SRC, [".jsx", ".js"])) {
      const codigo = semComentarios(readFileSync(caminho, "utf8")).replace(/\{\s*\}/g, "");
      if (/[Cc]obranças?\b|[Rr]ecebimentos?\b/.test(codigo)) culpados.push(relative(SRC, caminho));
    }
    assert.deepEqual(culpados, [], "use Honorários, Parcelas e Pagamentos (DEC-080)");
  });
});
