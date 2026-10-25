// ═══════════════════════════════════════════════════════════════════════════
// OS ÍCONES DELA (Fase 2a, DEC-077)
//
// `components/ui/Icone.jsx` desenha em linha os 12 SVG de `assets/icons/`, a
// partir de `components/ui/iconesDados.js`. É o padrão de `logo.test.js`: duas
// cópias do mesmo desenho divergem na primeira edição de uma delas, e esta
// suíte confere, traço a traço, que o dado é o arquivo — e que nenhum dos dois
// voltou a ter cor fixa, que some no modo claro.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { ICONES } from "../../src/components/ui/iconesDados.js";

const RAIZ = new URL("../../src", import.meta.url).pathname;
const PASTA = join(RAIZ, "assets/icons");
const arquivos = readdirSync(PASTA).filter((n) => n.endsWith(".svg")).sort();

const lerArquivo = (nome) => {
  const svg = readFileSync(join(PASTA, nome), "utf8");
  const caminhos = [...svg.matchAll(/<path\b([^>]*)\/?>/g)].map(([, attrs]) => {
    const a = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    return a;
  });
  return { svg, viewBox: svg.match(/viewBox="([^"]+)"/)[1], caminhos };
};

describe("ícones", () => {
  test("são os 12 da Raniele, e o dado tem exatamente os mesmos nomes", () => {
    assert.equal(arquivos.length, 12);
    assert.deepEqual(Object.keys(ICONES).sort(), arquivos.map((n) => n.replace(/\.svg$/, "")));
  });

  for (const arquivo of arquivos) {
    const nome = arquivo.replace(/\.svg$/, "");

    test(`${nome}: caixa, espessura e caminhos iguais aos do arquivo`, () => {
      const { viewBox, caminhos } = lerArquivo(arquivo);
      const dado = ICONES[nome];
      assert.equal(dado.viewBox, viewBox);
      assert.deepEqual(dado.caminhos, caminhos.map((c) => c.d));
      for (const c of caminhos) {
        assert.equal(Number(c["stroke-width"]), dado.traco);
        assert.equal(c["stroke-linecap"], "round");
        assert.equal(c["stroke-linejoin"], "round");
      }
    });

    test(`${nome}: nenhum traço com cor fixa`, () => {
      const { svg } = lerArquivo(arquivo);
      const cores = [...svg.matchAll(/(?:fill|stroke)="(?!none|currentColor)[^"]*"/g)].map((m) => m[0]);
      assert.deepEqual(cores, []);
    });
  }

  test("o componente pinta com currentColor e esconde o decorativo do leitor de tela", () => {
    const fonte = readFileSync(join(RAIZ, "components/ui/Icone.jsx"), "utf8");
    assert.match(fonte, /stroke="currentColor"/);
    assert.doesNotMatch(fonte, /(?:fill|stroke)="#/);
    assert.match(fonte, /'aria-hidden': 'true'/);
    assert.match(fonte, /role: 'img', 'aria-label': rotulo/);
    assert.match(fonte, /tamanho = 20/);
  });
});
