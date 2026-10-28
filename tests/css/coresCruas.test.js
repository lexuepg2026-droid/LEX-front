// ═══════════════════════════════════════════════════════════════════════════
// NENHUMA COR CRUA FORA DE `variables.css` (Fase 3.10, DEC-152)
//
// Cor escrita direto numa folha não acompanha o tema, não entra na medição de
// contraste (`contraste.test.js` mede tokens) e é a próxima a divergir. A
// 3.10 levou os fundos de diálogo a `--color-scrim`, as sombras aos
// `--shadow-*` e o verde sobre o papel a `--color-papel-realce`.
//
// A ÚNICA exceção é o PAPEL da montagem: a folha A4 é branca nos dois modos,
// por decisão (DEC-145), e as cores dentro dela são as do documento impresso,
// não as do tema. A lista é FECHADA, valor a valor, com o motivo — e uma
// entrada que deixou de ser usada derruba o teste (lista com entrada morta
// vira licença para o próximo).
//
// Comentários são limpos antes: a explicação de um par de cor ("#174034 mede
// 1,5:1…") não é uso.
// ═══════════════════════════════════════════════════════════════════════════
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("../../src", import.meta.url).pathname;

const PAPEL = "components/documents/DocumentCanvas.css";
const PERMITIDOS_NO_PAPEL = {
  "#ffffff": "o papel e o fundo dos botões da folha",
  "#1a1a18": "o texto do documento impresso",
  "#cccccc": "o fio do timbrado",
  "#6b6b6b": "o texto discreto sobre o papel (5,3:1)",
  "#666666": "o estado vazio e o tipo da seção",
  "#dddddd": "as bordas dos blocos e dos botões da folha",
  "#fafafa": "o bloco em hover",
  "#e5e5e5": "o tracejado da barra do bloco",
  "#8a8a8a": "a alça de arrastar (3:1, não texto)",
  "#444444": "o texto dos botões e das linhas do timbrado",
  "#f0f0f0": "o botão da folha em hover",
  "#bbbbbb": "a borda do botão da folha em hover",
  "#eeeeee": "o fio do rodapé da folha",
};

const COR_CRUA = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\bhsla?\([^)]*\)|(?<![-\w])(?:white|black|red|green|blue|gr[ae]y|orange|yellow|purple)\b(?![-\w])/g;

const arquivos = (dir) => readdirSync(dir).flatMap((nome) => {
  const c = join(dir, nome);
  if (statSync(c).isDirectory()) return arquivos(c);
  return nome.endsWith(".css") ? [c] : [];
});
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

// Só o VALOR das declarações (o que vem depois de `:` até `;`): nomes de
// classe e seletores não contam.
const coresDe = (css) => {
  const achadas = [];
  for (const [, valor] of semComentarios(css).matchAll(/:\s*([^;{}]+);/g)) {
    for (const m of valor.matchAll(COR_CRUA)) achadas.push(m[0].toLowerCase());
  }
  return achadas;
};

describe("nenhuma cor crua fora de variables.css (DEC-152)", () => {
  const usos = arquivos(RAIZ)
    .map((c) => [relative(RAIZ, c), coresDe(readFileSync(c, "utf8"))])
    .filter(([rel]) => rel !== "styles/variables.css");

  test("nenhuma folha, fora do papel, tem cor escrita direto", () => {
    const fora = usos.filter(([rel, cores]) => rel !== PAPEL && cores.length > 0)
      .map(([rel, cores]) => `${rel}: ${[...new Set(cores)].join(", ")}`);
    assert.deepEqual(fora, [], "use um token de variables.css (--color-scrim, --shadow-*, …):\n  " + fora.join("\n  "));
  });

  test("o papel usa só as cores da lista fechada", () => {
    const [, cores] = usos.find(([rel]) => rel === PAPEL);
    const fora = [...new Set(cores)].filter((c) => !(c in PERMITIDOS_NO_PAPEL));
    assert.deepEqual(fora, [], "cor nova na folha: acrescente à lista com o motivo, ou use token");
  });

  test("a lista do papel não guarda cor que já sumiu", () => {
    const [, cores] = usos.find(([rel]) => rel === PAPEL);
    const mortas = Object.keys(PERMITIDOS_NO_PAPEL).filter((c) => !cores.includes(c));
    assert.deepEqual(mortas, []);
  });

  test("a varredura pega o que deve pegar (contraprova)", () => {
    assert.deepEqual(coresDe(".a { box-shadow: 0 0 1px rgba(0, 0, 0, 0.5); color: #FFF; }"), ["rgba(0, 0, 0, 0.5)", "#fff"]);
    assert.deepEqual(coresDe(".b { background: white; }"), ["white"]);
    assert.deepEqual(coresDe("/* #174034 mede 1,5:1 */ .c { color: var(--color-text-primary); white-space: nowrap; }"), []);
  });
});
