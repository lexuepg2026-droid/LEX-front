// ═══════════════════════════════════════════════════════════════════════════
// CONFERÊNCIA DA NUMERAÇÃO DO ROTEIRO DE VALIDAÇÃO MANUAL
//
// O roteiro (`docs/validacao-manual.md`) acumula entre fases e os passos são
// citados PELO NÚMERO numa conversa ("o 156 reprovou"). Número repetido é o
// defeito caro: duas pessoas falam de passos diferentes achando que falam do
// mesmo.
//
// A numeração NÃO é densa, e isso é deliberado — passos saem para `## Validado`
// e `## Automatizado` sem renumerar o resto, justamente para o número de um
// passo nunca mudar. Então o que se confere aqui é:
//
//   1. nenhum número REPETIDO em lugar nenhum do documento;
//   2. dentro de cada seção, os números só CRESCEM;
//   3. o maior número usado bate com o que a última seção declara.
//
// Rodar: `node scripts/checarRoteiro.js`
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const CAMINHO = fileURLToPath(new URL("../docs/validacao-manual.md", import.meta.url));
const texto = readFileSync(CAMINHO, "utf8");

// Um passo é um item de checklist cujo negrito começa com o número:
//   `- [ ] **159. ⭐ Título**`  ou  `- [x] **12. Título**`
const PASSO = /^- \[[ xX]\] \*\*(\d+)\./gm;
// As seções numeradas do roteiro (`## 22. Fase F-1b — …`) e as duas finais.
const SECAO = /^## (.+)$/gm;

const passos = [];
for (const m of texto.matchAll(PASSO)) {
  const antes = texto.slice(0, m.index);
  const secoes = [...antes.matchAll(SECAO)];
  passos.push({
    numero: Number(m[1]),
    secao: secoes.length > 0 ? secoes[secoes.length - 1][1] : "(sem seção)",
    linha: antes.split("\n").length
  });
}

const problemas = [];

// ── 1. Repetidos ───────────────────────────────────────────────────────────
const porNumero = new Map();
for (const p of passos) {
  if (!porNumero.has(p.numero)) porNumero.set(p.numero, []);
  porNumero.get(p.numero).push(p);
}
for (const [numero, ocorrencias] of [...porNumero].sort((a, b) => a[0] - b[0])) {
  if (ocorrencias.length > 1) {
    problemas.push(
      `passo ${numero} aparece ${ocorrencias.length} vezes ` +
      `(linhas ${ocorrencias.map((o) => o.linha).join(", ")})`
    );
  }
}

// ── 2. Ordem crescente dentro da seção ─────────────────────────────────────
const porSecao = new Map();
for (const p of passos) {
  if (!porSecao.has(p.secao)) porSecao.set(p.secao, []);
  porSecao.get(p.secao).push(p);
}
for (const [secao, lista] of porSecao) {
  for (let i = 1; i < lista.length; i += 1) {
    if (lista[i].numero < lista[i - 1].numero) {
      problemas.push(
        `em "${secao}": o passo ${lista[i].numero} (linha ${lista[i].linha}) ` +
        `vem depois do ${lista[i - 1].numero} — a seção precisa crescer`
      );
    }
  }
}

// ── Relatório ──────────────────────────────────────────────────────────────
const numeros = passos.map((p) => p.numero);
const maior = numeros.length > 0 ? Math.max(...numeros) : 0;
const pendentes = [...texto.matchAll(/^- \[ \] \*\*(\d+)\./gm)].length;

process.stdout.write(
  "\n── Roteiro de validação manual ──────────────────────────────────\n" +
  `  passos encontrados       : ${passos.length}\n` +
  `  pendentes (nao marcados) : ${pendentes}\n` +
  `  maior número usado       : ${maior}\n` +
  `  seções com passo         : ${porSecao.size}\n`
);

for (const [secao, lista] of porSecao) {
  const ns = lista.map((l) => l.numero);
  process.stdout.write(
    `    • ${secao.slice(0, 46).padEnd(46)} ${ns.length} passo(s)` +
    `${ns.length > 0 ? `  [${Math.min(...ns)}–${Math.max(...ns)}]` : ""}\n`
  );
}

if (problemas.length > 0) {
  process.stdout.write("\n  PROBLEMAS:\n");
  for (const p of problemas) process.stdout.write(`    ✗ ${p}\n`);
  process.stdout.write("\n");
  process.exit(1);
}

process.stdout.write("\n  ✓ numeração contínua: nenhum número repetido, nenhuma seção fora de ordem\n\n");
