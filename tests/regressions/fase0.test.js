// ═══════════════════════════════════════════════════════════════════════════
// FASE 0 — correções em produção antes do porte do visual (DEC-066 a DEC-069)
//
// Cada bloco trava um defeito que já estava no ar. Testes de análise do
// código-fonte, como o resto da suíte (sem DOM), exceto onde o módulo pode ser
// carregado de verdade — e aí ele é executado, não lido.
// ═══════════════════════════════════════════════════════════════════════════
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// `utils/toast.js` não importa nada, então carrega em `node --test` com a
// extensão explícita. O impedimento registrado em `tests/offline/estatica.test.js`
// é do `axiosConfig.js`, que importa `'../utils/toast'` SEM extensão — não deste
// módulo.
import { toast, subscribe } from "../../src/utils/toast.js";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ler = (caminho) => readFileSync(join(RAIZ, caminho), "utf8");
const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const arquivosDeSrc = (dir = join(RAIZ, "src"), acc = []) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosDeSrc(caminho, acc);
    else if (/\.jsx?$/.test(nome)) acc.push(caminho);
  }
  return acc;
};

// ═══════════════════════════════════════════════════════════════════════════
// 1 — DEC-066: `toast.info` existia nas telas e não no módulo
// ═══════════════════════════════════════════════════════════════════════════
describe("Fase 0 · item 1 — o toast tem os três tons que as telas chamam", () => {
  test("toast expõe success, error e info, todos como função", () => {
    for (const tom of ["success", "error", "info"]) {
      assert.equal(typeof toast[tom], "function", `toast.${tom}`);
    }
  });

  test("toast.info entrega { type: 'info', message } a quem assina", () => {
    const recebidos = [];
    const sair = subscribe((t) => recebidos.push(t));
    toast.info("Ficou na fila.");
    sair();
    assert.equal(recebidos.length, 1);
    assert.equal(recebidos[0].type, "info");
    assert.equal(recebidos[0].message, "Ficou na fila.");
    assert.equal(typeof recebidos[0].id, "number");
  });

  test("nenhuma tela chama um método de toast que o módulo não tem", () => {
    // É a varredura que teria pego o defeito: cinco chamadas a `toast.info`
    // desde a F-3, e o `TypeError` só aparecia no clique.
    const existentes = new Set(Object.keys(toast));
    const faltando = [];
    for (const caminho of arquivosDeSrc()) {
      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      for (const [, metodo] of codigo.matchAll(/\btoast\.([a-zA-Z]+)\(/g)) {
        if (!existentes.has(metodo)) faltando.push(`${caminho.slice(RAIZ.length)}: toast.${metodo}`);
      }
    }
    assert.deepEqual(faltando, []);
  });

  test("o tom info tem regra de CSS, com fundo sólido e texto branco", () => {
    const css = ler("src/styles/toast.css");
    const regra = css.match(/\.toast--info\s*\{([^}]*)\}/);
    assert.ok(regra, ".toast--info existe");
    assert.match(regra[1], /background-color:\s*#1D4ED8/i);
    assert.match(regra[1], /color:\s*#FFFFFF/i);
  });
});
