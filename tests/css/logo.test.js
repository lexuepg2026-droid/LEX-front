// ═══════════════════════════════════════════════════════════════════════════
// A LOGO (Fase 1, DEC-074)
//
// `components/ui/LogoLex.jsx` desenha em linha os traços de
// `assets/LEX_horizontal.svg`, com `currentColor` para acompanhar o tema. Duas
// cópias do mesmo desenho divergem na primeira edição de uma delas; esta suíte
// confere que cada traço do arquivo está no componente, e que nenhuma tela
// voltou a importar a JPEG antiga.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../../src", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");

// Atributos de cada `<line>`/`<path>`, sem o que muda entre SVG e JSX.
const tracos = (fonte) =>
  [...fonte.matchAll(/<(line|path)\b([^>]*?)\/?>/g)].map(([, tag, attrs]) => {
    const pares = [...attrs.matchAll(/([\w-]+)="([^"]*)"/g)]
      .map(([, k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v])
      .sort(([a], [b]) => a.localeCompare(b));
    return `${tag} ${pares.map(([k, v]) => `${k}=${v}`).join(" ")}`;
  });

const arquivos = (dir, ext) => readdirSync(dir).flatMap((nome) => {
  const c = join(dir, nome);
  return statSync(c).isDirectory() ? arquivos(c, ext) : nome.endsWith(ext) ? [c] : [];
});

describe("logo", () => {
  test("o componente tem exatamente os traços do arquivo", () => {
    const doArquivo = tracos(ler("assets/LEX_horizontal.svg"));
    const doComponente = tracos(ler("components/ui/LogoLex.jsx"));
    assert.equal(doArquivo.length, 8);
    assert.deepEqual(doComponente, doArquivo);
  });

  test("a cor vem do tema: nenhum traço com cor fixa", () => {
    for (const rel of ["assets/LEX_horizontal.svg", "components/ui/LogoLex.jsx"]) {
      const cores = [...ler(rel).matchAll(/(?:fill|stroke)="(?!none|currentColor)[^"]*"/g)];
      assert.deepEqual(cores.map((m) => m[0]), [], rel);
    }
  });

  test("é anunciada como imagem com nome", () => {
    const fonte = ler("components/ui/LogoLex.jsx");
    assert.match(fonte, /role="img"/);
    assert.match(fonte, /aria-label="Logo LEX"/);
  });

  test("nenhuma tela importa mais a logo-lex.jpeg", () => {
    const culpados = arquivos(RAIZ, ".jsx").filter((c) => readFileSync(c, "utf8").includes("logo-lex.jpeg"));
    assert.deepEqual(culpados, []);
    assert.equal(existsSync(join(RAIZ, "assets/logo-lex.jpeg")), false);
  });
});
