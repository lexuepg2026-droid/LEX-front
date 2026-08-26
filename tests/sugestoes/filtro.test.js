// ═══════════════════════════════════════════════════════════════════════════
// O CAMPO QUE SUGERE E NÃO OBRIGA — o filtro, e a garantia central (F-4)
//
// A suíte não tem DOM (decisão da Fase 2E.2). A regra do campo mora por isso
// em `utils/sugestoes.js`, função pura, e é ela que este arquivo exercita de
// verdade. O componente é conferido por leitura logo abaixo, para o que só o
// código pode dizer: que não existe caminho de recusa.
//
// ── O que este arquivo existe para pegar ───────────────────────────────────
// **A regressão cara desta fase é o campo virar porteiro.** Alguém "melhora"
// o autocomplete fazendo o `onBlur` limpar o que não casa com a tabela, ou
// põe um `required` contra a lista — e no dia em que o TJPR criar uma comarca
// nova, ou a advogada precisar cadastrar um processo de outro estado, o
// sistema simplesmente não deixa salvar. A tabela é de 22/08/2026 e envelhece
// sozinha; o campo não pode envelhecer com ela.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  filtrarSugestoes,
  semAcento,
  casaExatamente,
  LIMITE_PADRAO,
} from "../../src/utils/sugestoes.js";
import { RAIZ, SRC } from "../helpers/cssScan.js";

const COMARCAS = [
  "Almirante Tamandaré",
  "Curitiba",
  "Maringá",
  "Ponta Grossa",
  "São José dos Pinhais",
  "Umuarama",
];

const semComentarios = (texto) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const fonte = (caminho) => semComentarios(readFileSync(resolve(SRC, caminho), "utf8"));

describe("filtro de sugestão — acha do jeito que se digita", () => {
  test("acha SEM ACENTO — 'sao jose' encontra 'São José dos Pinhais'", () => {
    assert.deepEqual(filtrarSugestoes(COMARCAS, "sao jose"), ["São José dos Pinhais"]);
    assert.deepEqual(filtrarSugestoes(COMARCAS, "maringa"), ["Maringá"]);
    assert.deepEqual(filtrarSugestoes(COMARCAS, "tamandare"), ["Almirante Tamandaré"]);
  });

  test("acha SEM CAIXA — e o acento digitado também funciona", () => {
    assert.deepEqual(filtrarSugestoes(COMARCAS, "PONTA GROSSA"), ["Ponta Grossa"]);
    assert.deepEqual(filtrarSugestoes(COMARCAS, "MaRiNgÁ"), ["Maringá"]);
    assert.deepEqual(filtrarSugestoes(COMARCAS, "São José"), ["São José dos Pinhais"]);
  });

  test("acha NO MEIO DA PALAVRA, e não só no começo", () => {
    // Quem lembra do meio do nome e não do começo é o caso comum. Um filtro de
    // PREFIXO passaria em "ponta" e falharia aqui — é esta asserção que o
    // separa de um `startsWith`.
    assert.deepEqual(filtrarSugestoes(COMARCAS, "grossa"), ["Ponta Grossa"]);
    assert.deepEqual(filtrarSugestoes(COMARCAS, "riti"), ["Curitiba"]);
    assert.deepEqual(filtrarSugestoes(COMARCAS, "pinhais"), ["São José dos Pinhais"]);
    assert.deepEqual(filtrarSugestoes(COMARCAS, "uara"), ["Umuarama"]);
  });

  test("devolve NO MÁXIMO N — a CBO tem 2.725 e o DOM não leva 2.725 nós", () => {
    const muitos = Array.from({ length: 500 }, (_, i) => `Comarca ${i}`);
    assert.equal(filtrarSugestoes(muitos, "comarca").length, LIMITE_PADRAO);
    assert.equal(filtrarSugestoes(muitos, "comarca", { limite: 3 }).length, 3);
    // Limite inválido cai no padrão em vez de devolver a lista inteira.
    assert.equal(filtrarSugestoes(muitos, "comarca", { limite: 0 }).length, LIMITE_PADRAO);
    assert.equal(filtrarSugestoes(muitos, "comarca", { limite: -5 }).length, LIMITE_PADRAO);
  });

  test("devolve VAZIO sem quebrar, em toda entrada degenerada", () => {
    for (const entrada of [null, undefined, "", "   ", 0, false]) {
      assert.deepEqual(filtrarSugestoes(COMARCAS, entrada), [], `termo: ${String(entrada)}`);
    }
    for (const lista of [null, undefined, "não é lista", 42, {}]) {
      assert.deepEqual(filtrarSugestoes(lista, "curitiba"), [], `lista: ${String(lista)}`);
    }
    assert.deepEqual(filtrarSugestoes([], "curitiba"), []);
  });

  test("funciona sobre OBJETOS, pelo rótulo — é como as tabelas do Davi vêm", () => {
    const itens = [
      { nome: "Ponta Grossa", entrancia: "final" },
      { nome: "Curitiba", entrancia: "final" },
    ];
    const achados = filtrarSugestoes(itens, "grossa", { rotulo: (i) => i.nome });
    assert.deepEqual(achados, [{ nome: "Ponta Grossa", entrancia: "final" }]);
  });

  test("`semAcento` normaliza igual à busca de seções do backend", () => {
    assert.equal(semAcento("São José"), "sao jose");
    assert.equal(semAcento("  Maringá  "), "maringa");
    assert.equal(semAcento(null), "");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// A GARANTIA CENTRAL DA FASE
// ═══════════════════════════════════════════════════════════════════════════

describe("valor FORA da tabela é aceito — a regra que a fase existe para dar", () => {
  test("um valor que não casa devolve zero sugestões, e NÃO lança", () => {
    // Zero sugestões é uma tela sem lista, não um erro. Se isto lançasse, o
    // formulário quebraria exatamente no caso que a fase existe para permitir.
    assert.doesNotThrow(() => filtrarSugestoes(COMARCAS, "Comarca Que Não Existe"));
    assert.deepEqual(filtrarSugestoes(COMARCAS, "Comarca Que Não Existe"), []);
    assert.deepEqual(filtrarSugestoes(COMARCAS, "Ponta Grosa"), []); // um "s" só
  });

  test("o campo REPASSA o que foi digitado, sem condição nenhuma", () => {
    const jsx = fonte("components/ui/CampoComSugestoes.jsx");

    // O `onChange` do input chama `onChange(e.target.value)` cru. Qualquer
    // filtragem, normalização ou recusa nesse caminho é a regressão.
    assert.match(
      jsx,
      /onChange\(e\.target\.value\)/,
      "o campo precisa repassar o texto digitado exatamente como veio"
    );
  });

  test("NÃO existe caminho que recuse, limpe ou reverta o digitado", () => {
    const jsx = fonte("components/ui/CampoComSugestoes.jsx");

    // A mutação obrigatória (a) da fase: "recusar valor fora da tabela". Ela
    // teria que aparecer como uma destas formas.
    const proibidos = [
      [/onBlur=\{[^}]*onChange\(/, "o blur não pode reescrever o valor"],
      [/onChange\(\s*['"`]\s*['"`]\s*\)/, "nada pode limpar o campo"],
      [/\brequired\b/, "o campo não é obrigatório contra a tabela"],
      [/\bpattern=/, "não há pattern validando contra a tabela"],
      [/casaExatamente\s*\(/, "`casaExatamente` não pode virar guarda aqui"],
      [/sugestoes\.length\s*===\s*0\s*\)\s*\{?\s*onChange/, "lista vazia não pode alterar o valor"],
    ];
    for (const [padrao, porque] of proibidos) {
      assert.ok(!padrao.test(jsx), `${porque} — achei ${padrao} em CampoComSugestoes.jsx`);
    }
  });

  test("nenhuma TELA usa a tabela como validação antes de salvar", () => {
    for (const tela of [
      "pages/processes/ProcessFormPage.jsx",
      "pages/clients/ClientFormPage.jsx",
    ]) {
      const jsx = fonte(tela);
      assert.ok(
        !/casaExatamente/.test(jsx),
        `${tela} não pode conferir o valor contra a tabela antes de salvar`
      );
    }
  });

  test("`casaExatamente` existe, responde certo, e não é usada como guarda", () => {
    // Ela fica disponível para um selo discreto de "confere". O que o teste
    // trava é o uso dela como porteiro (asserção acima).
    assert.equal(casaExatamente(COMARCAS, "ponta grossa"), true);
    assert.equal(casaExatamente(COMARCAS, "Ponta Grosa"), false);
    assert.equal(casaExatamente(COMARCAS, ""), false);
    assert.equal(casaExatamente(null, "x"), false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TECLADO E FOCO — DEC-046/DEC-047 continuam valendo
// ═══════════════════════════════════════════════════════════════════════════

describe("teclado, foco e semântica", () => {
  const jsx = () => fonte("components/ui/CampoComSugestoes.jsx");

  test("setas, Enter e Esc estão todos tratados", () => {
    const t = jsx();
    for (const tecla of ["ArrowDown", "ArrowUp", "Enter", "Escape"]) {
      assert.match(t, new RegExp(`['"]${tecla}['"]`), `falta tratar ${tecla}`);
    }
  });

  test("Esc não vaza para o modal em volta", () => {
    assert.match(jsx(), /stopPropagation\(\)/,
      "o Esc que fecha a lista não pode fechar o modal em volta");
  });

  test("NENHUM autoFocus — nem no campo, nem nas telas que o usam", () => {
    for (const arquivo of [
      "components/ui/CampoComSugestoes.jsx",
      "pages/processes/ProcessFormPage.jsx",
      "pages/clients/ClientFormPage.jsx",
    ]) {
      assert.ok(!/autoFocus/.test(fonte(arquivo)), `${arquivo} não pode roubar o foco`);
    }
  });

  test("o anel de foco NÃO é removido — a regra global continua mandando", () => {
    const css = readFileSync(
      resolve(SRC, "components/ui/CampoComSugestoes.css"), "utf8"
    );
    assert.ok(
      !/outline\s*:\s*(none|0)\b/.test(css),
      "remover o outline aqui desfaz a regra global de :focus-visible"
    );
  });

  test("a lista é um combobox de verdade, e não uma `div` decorada", () => {
    const t = jsx();
    for (const papel of ['role="combobox"', 'role="listbox"', 'role="option"']) {
      assert.ok(t.includes(papel), `falta ${papel}`);
    }
    assert.match(t, /aria-activedescendant/, "o leitor de tela precisa saber qual item está ativo");
    assert.match(t, /aria-expanded/, "falta aria-expanded");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// NENHUMA TELA MONTA LISTA DE SUGESTÃO POR CONTA PRÓPRIA
// ═══════════════════════════════════════════════════════════════════════════

describe("uma implementação só", () => {
  const CAMPOS = [
    ["pages/processes/ProcessFormPage.jsx", ["comarca", "tipoAcao", "area"]],
    ["pages/clients/ClientFormPage.jsx", ["profissao", "nacionalidade"]],
  ];

  test("os cinco campos passam pelo componente, e não por `<input>` cru", () => {
    for (const [tela, campos] of CAMPOS) {
      const jsx = fonte(tela);
      for (const campo of campos) {
        assert.ok(
          !new RegExp(`<input[^>]*\\bname="${campo}"`).test(jsx),
          `${tela}: ${campo} voltou a ser <input> cru`
        );
        assert.match(
          jsx,
          new RegExp(`<CampoComSugestoes[\\s\\S]{0,400}?name="${campo}"`),
          `${tela}: ${campo} precisa usar CampoComSugestoes`
        );
      }
    }
  });

  test("nenhuma das telas normaliza acento ou monta listbox por conta própria", () => {
    for (const [tela] of CAMPOS) {
      const jsx = fonte(tela);
      assert.ok(!/normalize\(\s*['"]NFD['"]\s*\)/.test(jsx),
        `${tela} não pode ter a própria normalização de acento`);
      assert.ok(!/role="listbox"/.test(jsx),
        `${tela} não pode montar a própria lista de sugestão`);
      assert.ok(!/filtrarSugestoes/.test(jsx),
        `${tela} não filtra por conta própria — quem filtra é o componente`);
    }
  });
});
