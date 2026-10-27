// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.5 — clientes: lista, detalhe e formulário (DEC-119 em diante)
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

// ── Item 2 — o avatar (DEC-120) ───────────────────────────────────────────
import { TOTAL_DE_CORES, indiceDaCor, inicialDoNome } from "../../src/components/ui/avatar.js";
import { lerModos, medirPar } from "../helpers/contraste.js";

describe("Fase 3.5 · item 2 — o avatar (DEC-120)", () => {
  test("a inicial: primeira letra, maiúscula, com acento; pula o que não é letra", () => {
    assert.equal(inicialDoNome("ana lima"), "A");
    assert.equal(inicialDoNome("  Ágata"), "Á");
    assert.equal(inicialDoNome("3M do Brasil Ltda"), "M");
    assert.equal(inicialDoNome("éder"), "É");
    assert.equal(inicialDoNome(""), "?");
    assert.equal(inicialDoNome(null), "?");
    assert.equal(inicialDoNome("123"), "?");
  });

  test("a cor é determinística pelo id, de 1 a 8", () => {
    const id = "6ae00c4f962567d45ffc7330";
    assert.equal(indiceDaCor(id), indiceDaCor(id));
    assert.equal(indiceDaCor(id), indiceDaCor(String(id)));
    for (let i = 0; i < 200; i += 1) {
      const n = indiceDaCor(`6ae00c4f962567d45ffc${String(i).padStart(4, "0")}`);
      assert.ok(n >= 1 && n <= TOTAL_DE_CORES);
    }
    assert.equal(indiceDaCor(undefined), 1);
  });

  test("ids em sequência se espalham pelas oito cores", () => {
    const usadas = new Set();
    for (let i = 0; i < 40; i += 1) usadas.add(indiceDaCor(`6ae00c4f962567d45ffc${(0x7300 + i).toString(16)}`));
    assert.equal(usadas.size, TOTAL_DE_CORES);
  });

  test("as oito cores são iguais nos dois modos e a inicial passa 4,5:1 em todas", () => {
    const modos = lerModos();
    const css = readFileSync(join(RAIZ, "src/styles/variables.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(css.slice(css.indexOf("body.light-mode")), /--color-(?:on-)?avatar-/);
    for (let n = 1; n <= TOTAL_DE_CORES; n += 1) {
      assert.equal(modos.escuro[`--color-avatar-${n}`], modos.claro[`--color-avatar-${n}`]);
      const r = medirPar(modos.escuro, { texto: `--color-on-avatar-${n}`, fundo: `--color-avatar-${n}` });
      assert.ok(r.razao >= 4.5, `avatar ${n}: ${r.razao.toFixed(2)}:1`);
    }
  });

  test("o componente é decorativo e tem uma regra por cor", () => {
    const jsx = semComentarios(ler("src/components/ui/Avatar.jsx"));
    assert.match(jsx, /aria-hidden="true"/);
    assert.doesNotMatch(jsx, /title=|role=/);
    const folha = ler("src/components/ui/Avatar.css");
    for (let n = 1; n <= TOTAL_DE_CORES; n += 1) {
      assert.match(folha, new RegExp(`\\.avatar--cor-${n} \\{[^}]*--color-avatar-${n}\\)[^}]*--color-on-avatar-${n}\\)`));
    }
    assert.match(folha, /\.avatar--pequeno/);
    assert.match(folha, /\.avatar--grande/);
  });
});
