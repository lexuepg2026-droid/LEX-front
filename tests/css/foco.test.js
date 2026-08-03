// ═══════════════════════════════════════════════════════════════════════════
// FOCO VISÍVEL (achado #9 — Fase 4.5)
//
// A suíte não tem DOM, por decisão registrada na Fase 2E.2. O que dá para
// provar sem renderizador é o que este arquivo prova: que o anel EXISTE como
// regra alcançável e que ninguém voltou a apagá-lo.
//
// ── O defeito que originou o arquivo ──────────────────────────────────────
// Havia SEIS `outline: none` no projeto, e DOIS deles estavam dentro de regras
// `:focus-visible` — a regra escrita para desenhar o foco era a que o apagava:
//
//     .secao-preview__close:hover,
//     .secao-preview__close:focus-visible { … outline: none; }
//
//     .var-item:hover:not(:disabled),
//     .var-item:focus-visible { … outline: none; }
//
// Quem navega por teclado perdia a posição, sobretudo no tema escuro, que é o
// padrão do app.
//
// ── Por que a varredura procura a DECLARAÇÃO, e não a string ──────────────
// O comentário que explica o defeito contém a expressão `outline: none` várias
// vezes. Uma varredura ingênua pela string derrubaria a própria explicação, e a
// saída óbvia seria apagar o comentário — o mesmo raciocínio que a Fase 4.2
// registrou para as varreduras estáticas do módulo financeiro.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../../src", import.meta.url).pathname;

const arquivosCss = (dir) => {
  const achados = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) achados.push(...arquivosCss(caminho));
    else if (nome.endsWith(".css")) achados.push(caminho);
  }
  return achados;
};

// Tira comentários /* … */ antes de analisar.
const semComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const relativo = (caminho) => caminho.replace(RAIZ, "src");

describe("foco visível", () => {
  const folhas = arquivosCss(RAIZ);

  test("há folhas de estilo para varrer", () => {
    assert.ok(folhas.length > 10, `esperava dezenas de .css, achei ${folhas.length}`);
  });

  test("nenhuma folha declara `outline: none`", () => {
    const culpadas = [];

    for (const caminho of folhas) {
      const css = semComentarios(readFileSync(caminho, "utf8"));
      // Declaração de verdade: `outline` seguido de `:` e `none`, terminando em
      // `;` ou `}`. Pega `outline:none` e `outline : none` do mesmo jeito.
      const regex = /(^|[;{])\s*outline\s*:\s*none\s*(?=[;}])/gm;
      const ocorrencias = [...css.matchAll(regex)];
      if (ocorrencias.length > 0) {
        culpadas.push(`${relativo(caminho)} (${ocorrencias.length}×)`);
      }
    }

    assert.deepEqual(
      culpadas, [],
      "voltou `outline: none` — quem quiser tirar o anel do clique de mouse já é atendido " +
      "por `:focus-visible`, que só desenha em foco de teclado:\n  " + culpadas.join("\n  ")
    );
  });

  test("`outline-color: transparent` também não é usado como disfarce", () => {
    // O jeito óbvio de burlar a varredura acima sem escrever `outline: none`.
    for (const caminho of folhas) {
      const css = semComentarios(readFileSync(caminho, "utf8"));
      assert.ok(
        !/outline(-color)?\s*:\s*transparent/.test(css),
        `${relativo(caminho)}: anel transparente é "outline: none" com outro nome`
      );
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // A regra global e os tokens
  // ═════════════════════════════════════════════════════════════════════════
  test("existe uma regra `:focus-visible` global", () => {
    const global = readFileSync(join(RAIZ, "styles/global.css"), "utf8");
    const css = semComentarios(global);

    assert.match(
      css, /(^|\})\s*:focus-visible\s*\{/m,
      "a regra global de foco sumiu de styles/global.css"
    );
    assert.match(css, /outline:\s*var\(--focus-ring-width\)/, "o anel usa o token de espessura");
    assert.match(css, /var\(--color-focus\)/, "o anel usa o token de cor");
    assert.match(css, /outline-offset:/, "o anel precisa de offset para não colar na borda do input");
  });

  test("`--color-focus` está declarado nos dois temas", () => {
    const variaveis = semComentarios(
      readFileSync(join(RAIZ, "styles/variables.css"), "utf8")
    );

    // O tema escuro é o `:root` (padrão do app); o claro é `body.light-mode`.
    const escuro = variaveis.slice(variaveis.indexOf(":root"), variaveis.indexOf("body.light-mode"));
    const claro = variaveis.slice(variaveis.indexOf("body.light-mode"));

    assert.match(escuro, /--color-focus:/, "o tema escuro precisa declarar --color-focus");
    assert.match(
      claro, /--color-focus:/,
      "o tema claro precisa de um valor próprio: o dourado da marca perde contraste contra o branco"
    );
    assert.match(escuro, /--focus-ring-width:/);
    assert.match(escuro, /--focus-ring-offset:/);
  });

  test("os dois temas usam valores DIFERENTES de --color-focus", () => {
    const variaveis = semComentarios(
      readFileSync(join(RAIZ, "styles/variables.css"), "utf8")
    );
    const valores = [...variaveis.matchAll(/--color-focus:\s*([^;]+);/g)].map((m) => m[1].trim());

    assert.equal(valores.length, 2, "esperava uma declaração por tema");
    assert.notEqual(
      valores[0], valores[1],
      "se os dois temas usassem a mesma cor, o override do tema claro seria decorativo"
    );
  });
});
