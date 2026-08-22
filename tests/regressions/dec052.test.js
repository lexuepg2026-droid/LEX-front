// ═══════════════════════════════════════════════════════════════════════════
// DEC-052 (frontend) — REATIVAR SEM ADIVINHAR
//
// ── O que a tela precisa garantir ────────────────────────────────────────
// 1. As duas ações são MUTUAMENTE exclusivas: "Reativar" só em registro
//    desativado, "Desativar" só em ativo. Oferecer a errada é oferecer uma ação
//    que o backend responde 404.
// 2. Os modais dizem a CONTAGEM antes de confirmar. A advogada precisa saber o
//    tamanho do efeito antes de causá-lo — é a regra do modal de estorno
//    (passo 161).
// 3. A ausência de cascata é dita EM VOZ ALTA. Sem a frase, a advogada reativa
//    o cliente e presume que os processos voltaram.
// 4. Os desativados precisam ser ALCANÇÁVEIS. Sem o filtro de situação, a
//    listagem os esconde e um menu com "Reativar" não tem linha onde existir.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  mensagemDesativarProcesso,
  mensagemReativarProcesso,
  mensagemDesativarCliente,
  mensagemReativarCliente
} from "../../src/utils/activationMessages.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const LISTAGENS = [
  "src/pages/clients/ClientListPage.jsx",
  "src/pages/processes/ProcessListPage.jsx"
];

// ═══════════════════════════════════════════════════════════════════════════
// 1 — As frases, que são função pura
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-052 — as frases de desativar e reativar", () => {
  test("a desativação do processo diz QUANTOS vínculos caem", () => {
    assert.match(mensagemDesativarProcesso(3), /3 participantes/);
    assert.match(mensagemDesativarProcesso(1), /1 participante\b/);
  });

  test("singular e plural, sem `1 participante(s)`", () => {
    for (const n of [0, 1, 2, 7]) {
      for (const frase of [mensagemDesativarProcesso(n), mensagemReativarProcesso(n)]) {
        assert.doesNotMatch(frase, /\(s\)/, `n=${n}: a frase saiu com "(s)"`);
      }
    }
    assert.match(mensagemReativarProcesso(1), /1 participante volta\b/);
    assert.match(mensagemReativarProcesso(2), /2 participantes voltam\b/);
  });

  test("sem participantes, a frase não promete gente que não existe", () => {
    const zero = mensagemDesativarProcesso(0);
    assert.match(zero, /não tem participantes/i);
    assert.doesNotMatch(zero, /voltam com ele|volta com ele/);
  });

  test("a desativação NÃO promete mais que a ação é irreversível", () => {
    // A frase antiga — "Esta ação não pode ser desfeita" — virou mentira quando
    // a reativação passou a existir. Prometer irreversibilidade numa ação
    // reversível faz a advogada evitar uma operação segura.
    for (const frase of [mensagemDesativarProcesso(2), mensagemDesativarCliente()]) {
      assert.doesNotMatch(frase, /não pode ser desfeita/i);
      assert.match(frase, /reativá-lo/i, "precisa dizer que dá para reativar");
    }
  });

  test("a reativação do processo avisa que os removidos à mão NÃO voltam", () => {
    // Sem isto, "voltam 2" parece errado para quem lembra que havia 3.
    assert.match(mensagemReativarProcesso(2), /removeu à mão/i);
    assert.match(mensagemReativarProcesso(2), /NÃO voltam/);
  });

  test("a reativação do cliente avisa que os processos NÃO voltam", () => {
    // A frase mais importante das quatro: a ausência de cascata precisa ser
    // dita ANTES da confirmação, não descoberta depois.
    const frase = mensagemReativarCliente();
    assert.match(frase, /processos/i);
    assert.match(frase, /NÃO voltam/);
    assert.match(frase, /cada processo se reativa por si/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — O menu ⋮: uma ação ou a outra, nunca as duas
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-052 — o menu ⋮ oferece só a ação que o estado permite", () => {
  test("as duas listagens têm 'Reativar' e 'Desativar'", () => {
    for (const arquivo of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /rotulo: 'Reativar'/, `${arquivo}: falta "Reativar"`);
      assert.match(codigo, /rotulo: 'Desativar'/, `${arquivo}: falta "Desativar"`);
    }
  });

  test("a escolha entre elas é condicionada a `ativo === false`", () => {
    // Um menu que mostrasse as duas ofereceria, em metade dos casos, uma ação
    // que o backend responde 404.
    for (const arquivo of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo,
        /ativo === false\s*\n?\s*\?\s*\{\s*\n?\s*rotulo: 'Reativar'/,
        `${arquivo}: "Reativar" precisa aparecer SÓ em registro desativado, num ternário sobre \`ativo\``
      );
    }
  });

  test("'Excluir' saiu das duas — o nome mentia depois da reativação", () => {
    for (const arquivo of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));
      assert.doesNotMatch(
        codigo, /rotulo: 'Excluir'/,
        `${arquivo}: a ação é soft delete e tem volta; "Excluir" mente`
      );
    }
  });

  test("'Desativar' continua marcado como destrutivo; 'Reativar' não", () => {
    for (const arquivo of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /rotulo: 'Desativar',\s*\n\s*destrutivo: true/,
        `${arquivo}: desativar continua sendo a ação de peso`
      );
      // Reativar é construtivo: pintá-lo de vermelho ensinaria a advogada a
      // hesitar diante da ação que conserta o engano.
      const trecho = codigo.slice(codigo.indexOf("rotulo: 'Reativar'"));
      const ateProximo = trecho.slice(0, trecho.indexOf("}"));
      assert.doesNotMatch(ateProximo, /destrutivo/, `${arquivo}: "Reativar" não é destrutivo`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — Os modais dizem a contagem antes de confirmar
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-052 — a contagem vem antes da confirmação", () => {
  test("o processo consulta o preview ANTES de abrir o modal", () => {
    const codigo = semComentarios(ler("src/pages/processes/ProcessListPage.jsx"));
    assert.match(
      codigo, /getActivationPreview/,
      "sem o preview, o modal não teria número para mostrar"
    );
    // A mensagem sai das funções compartilhadas, não de texto solto na tela.
    assert.match(codigo, /mensagemDesativarProcesso/);
    assert.match(codigo, /mensagemReativarProcesso/);
  });

  test("o cliente usa as frases compartilhadas", () => {
    const codigo = semComentarios(ler("src/pages/clients/ClientListPage.jsx"));
    assert.match(codigo, /mensagemDesativarCliente/);
    assert.match(codigo, /mensagemReativarCliente/);
  });

  test("nenhuma listagem escreve a frase à mão", () => {
    // Texto duplicado diverge na primeira revisão de redação — e aqui divergir
    // significa uma tela prometer que os processos voltam e a outra dizer que
    // não.
    for (const arquivo of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));
      assert.doesNotMatch(
        codigo, /message="[^"]*participante/i,
        `${arquivo}: a frase precisa vir de \`utils/activationMessages.js\``
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 — Os desativados precisam ser alcançáveis
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-052 — o filtro de situação", () => {
  test("as duas listagens têm o seletor de situação", () => {
    for (const arquivo of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /setSituacao/, `${arquivo}: falta o filtro de situação`);
      for (const valor of ["ativos", "inativos", "todos"]) {
        assert.match(
          codigo, new RegExp(`value="${valor}"`),
          `${arquivo}: falta a opção "${valor}"`
        );
      }
    }
  });

  test("o padrão continua sendo só os ativos", () => {
    // Nada muda para quem não pede: a listagem de sempre continua a de sempre.
    for (const arquivo of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /useState\('ativos'\)/,
        `${arquivo}: o padrão do filtro precisa continuar "ativos"`
      );
    }
  });

  test("a situação é enviada à API pelos dois serviços", () => {
    for (const arquivo of ["src/api/clientService.js", "src/api/processService.js"]) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /params\.situacao = situacao/, `${arquivo}: não envia \`situacao\``);
    }
  });

  test("a linha desativada é distinguível — tag E esmaecimento", () => {
    for (const arquivo of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /tag-desativado/, `${arquivo}: falta a tag`);
      assert.match(codigo, /linha-desativada/, `${arquivo}: falta o esmaecimento`);
    }

    const css = ler("src/styles/modules.css");
    assert.match(css, /\.linha-desativada\s*\{[^}]*opacity/);
    // Cor sozinha não serve: é a única pista para quem não distingue matizes,
    // e some numa impressão em preto e branco. Por isso a tag tem TEXTO.
    assert.match(css, /\.tag-desativado\s*\{/);
  });
});
