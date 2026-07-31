// ═══════════════════════════════════════════════════════════════════════════
// Regressões da Fase 2E.1, convertidas de passo manual em teste.
//
// Substituem os passos 79, 80, 81 e 83 do roteiro de validação manual — os
// quatro que a 2E.1 marcou `[automatizável]`.
//
// ── O que estes testes provam, e o que NÃO provam ──────────────────────────
// São análise ESTÁTICA de arquivo, sem navegador. Eles não pintam pixel e não
// clicam em nada: não provam que a borda vermelha aparece na tela.
//
// O que provam é a REGRESSÃO ESPECÍFICA que cada passo existia para pegar —
// a mensagem fixa voltando por cima do helper, o formulário deixando de ler
// `campo`, os rótulos voltando a ser literal repetido. É essa volta que um
// refactor distraído causa, e é ela que ficava sem guarda nenhuma.
//
// A parte visual do passo 81 fica coberta por outro caminho, e é o que torna
// a conversão honesta em vez de teatro:
//   - o backend emite `campo` nos 409 → travado em
//     `lex-backend/tests/financial/chain.test.js`;
//   - o formulário lê `campo` e aplica `input-erro` → travado aqui;
//   - `input-erro` TEM regra alcançável por aquela página → travado na
//     varredura de `tests/css/appliedClasses.test.js`, que é justamente o
//     elo que estava quebrado na 2E.1 e fazia o destaque sair inerte.
// Os três juntos cobrem a cadeia inteira menos o pixel.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { RAIZ, cssAlcancavel, classesGlobais } from "../helpers/cssScan.js";

const ler = (relativo) => readFileSync(resolve(RAIZ, relativo), "utf8");
const globais = classesGlobais();

// ═════════════════════════════════════════════════════════════════════════
// Passos 79 e 80 — a tela de detalhe mostra o erro REAL, não a fixa
// ═════════════════════════════════════════════════════════════════════════

describe("passos 79 e 80: detalhe mostra o erro real, não a mensagem fixa", () => {
  const TELAS = [
    ["src/pages/clients/ClientDetailPage.jsx", "Cliente não encontrado"],
    ["src/pages/processes/ProcessDetailPage.jsx", "Falha ao carregar dados do processo"]
  ];

  for (const [arquivo, mensagemAntiga] of TELAS) {
    test(`${arquivo.split("/").pop()} passa o erro por getApiErrorMessage`, () => {
      const codigo = ler(arquivo);

      assert.match(
        codigo,
        /import\s*\{[^}]*getApiErrorMessage[^}]*\}\s*from\s*['"][^'"]*apiError['"]/,
        "a tela deixou de importar getApiErrorMessage"
      );

      // Todo `setError(...)` tem de passar pelo helper. Um `setError('texto')`
      // cru é exatamente a regressão: volta a dizer a mesma coisa em 500, em
      // 404 e em falha de rede.
      const chamadas = [...codigo.matchAll(/setError\(\s*([^)]*)/g)].map((m) => m[1].trim());
      assert.ok(chamadas.length > 0, "nenhum setError encontrado — a tela mudou de forma");

      for (const argumento of chamadas) {
        if (argumento.startsWith("null") || argumento.startsWith("''") || argumento.startsWith('""')) {
          continue; // limpar o erro é legítimo
        }
        assert.ok(
          argumento.startsWith("getApiErrorMessage"),
          `setError(${argumento}…) não passa por getApiErrorMessage`
        );
      }
    });

    test(`${arquivo.split("/").pop()}: a mensagem antiga só sobrevive como fallback`, () => {
      const codigo = ler(arquivo);
      const ocorrencias = [...codigo.matchAll(new RegExp(mensagemAntiga, "g"))];

      for (const ocorrencia of ocorrencias) {
        // A frase pode continuar existindo — como SEGUNDO argumento do helper,
        // que é o texto de último recurso. O que não pode é ela ser o único
        // caminho. Comentário explicando a mudança também é aceitável.
        const linha = codigo.slice(0, ocorrencia.index).split("\n").length;
        const conteudo = codigo.split("\n")[linha - 1];
        assert.ok(
          conteudo.includes("getApiErrorMessage") || conteudo.trimStart().startsWith("//"),
          `"${mensagemAntiga}" voltou a ser mensagem fixa na linha ${linha}: ${conteudo.trim()}`
        );
      }
    });
  }
});

// ═════════════════════════════════════════════════════════════════════════
// Passo 81 — destaque do campo no 409
// ═════════════════════════════════════════════════════════════════════════

describe("passo 81: os formulários leem `campo` do 409 e destacam o input", () => {
  // [arquivo, campo que o backend emite].
  //
  // ── O honorário deixou de ser `null` — Fase 4.2 ──────────────────────────
  // Até a 4.1 o `feeService` não emitia `campo` em erro nenhum, e este
  // formulário estava ligado ao helper sem ter o que destacar. O item 3 da
  // DEC-027 corrigiu isso: `campo` sai nos **400** do hook condicional (o `Fee`
  // não tem índice único, e portanto não tem 409 de conflito de campo — o
  // roteiro da 4.1 partia de premissa errada nesse ponto).
  //
  // `percentual` é o campo que o hook mais nomeia, e é o que a Fase 4.2 passou
  // a destacar de verdade.
  const FORMULARIOS = [
    ["src/pages/processes/ProcessFormPage.jsx", "numeroProcesso"],
    ["src/pages/installments/InstallmentFormPage.jsx", "numeroParcela"],
    ["src/pages/payments/PaymentFormPage.jsx", "valorPago"],
    ["src/pages/fees/FeeFormPage.jsx", "percentual"]
  ];

  for (const [arquivo, campo] of FORMULARIOS) {
    test(`${arquivo.split("/").pop()} lê getApiErrorField e aplica input-erro`, () => {
      const codigo = ler(arquivo);

      assert.match(
        codigo,
        /import\s*\{[^}]*getApiErrorField[^}]*\}\s*from\s*['"][^'"]*apiError['"]/,
        "o formulário deixou de importar getApiErrorField"
      );
      assert.match(
        codigo,
        /setCampoComErro\(\s*getApiErrorField\(/,
        "o formulário não guarda mais o campo do 409"
      );
      assert.match(
        codigo,
        /'input-erro'|"input-erro"/,
        "o formulário não aplica mais a classe de destaque"
      );

      if (campo) {
        assert.match(
          codigo,
          new RegExp(`campoComErro\\s*===\\s*'${campo}'`),
          `o input de \`${campo}\` deixou de ser destacado — é o campo que o backend emite`
        );
      }
    });

    test(`${arquivo.split("/").pop()} alcança a regra .input-erro`, () => {
      // O elo que faltava na 2E.1: a classe era aplicada e a regra vivia num
      // CSS que a tela não importava. Sem esta asserção, o destaque continua
      // podendo sair inerte com todos os outros testes verdes.
      const { classes } = cssAlcancavel(resolve(RAIZ, arquivo));
      const disponiveis = new Set([...classes, ...globais]);
      assert.ok(
        disponiveis.has("input-erro"),
        `${arquivo} aplica input-erro mas não alcança regra nenhuma para ela`
      );
    });
  }

  test("o honorário SAIU de inerte — o helper agora tem o que destacar", () => {
    // Este teste travava o estado anterior ("continua sem campo destacado, e
    // isso está correto") e existia para cair quando a Fase 4 fizesse o
    // `feeService` emitir `campo`. Caiu, e foi invertido em vez de apagado: o
    // histórico do Git mostra a transição deliberada.
    const codigo = ler("src/pages/fees/FeeFormPage.jsx");

    assert.match(codigo, /getApiErrorField/, "o helper deixou de estar ligado");

    // Os quatro campos que o hook condicional e a validação escrita à mão
    // nomeiam. Destacar só um deles deixaria os outros três sem roteamento.
    for (const campo of ["percentual", "valorBase", "valor", "tipo"]) {
      assert.match(
        codigo,
        new RegExp(`campoComErro\\s*===\\s*'${campo}'`),
        `o input de \`${campo}\` não é destacado, e o backend o nomeia`
      );
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Passo 83 — rádios de tipo de pessoa vindos do enum
// ═════════════════════════════════════════════════════════════════════════

describe("passo 83: os rádios de tipo de pessoa saem do enum", () => {
  test("ClientFormPage monta os rádios a partir de TIPO_PESSOA_OPTIONS", () => {
    const codigo = ler("src/pages/clients/ClientFormPage.jsx");

    assert.match(
      codigo,
      /import\s*\{[^}]*TIPO_PESSOA_OPTIONS[^}]*\}\s*from\s*['"][^'"]*enums['"]/,
      "a tela deixou de importar TIPO_PESSOA_OPTIONS"
    );
    assert.match(
      codigo,
      /TIPO_PESSOA_OPTIONS\.map\(/,
      "os rádios voltaram a ser escritos um a um em vez de sair do enum"
    );
    assert.match(
      codigo,
      /labelDe\(\s*TIPO_PESSOA_OPTIONS/,
      "o texto 'Tipo: …' da edição não sai mais do enum"
    );

    // E os rótulos NÃO voltam como literal repetido na tela — que é o defeito
    // que o passo existia para pegar. A fonte única é `utils/enums.js`.
    for (const rotulo of ["Pessoa Física", "Pessoa Jurídica"]) {
      assert.ok(
        !codigo.includes(rotulo),
        `"${rotulo}" voltou a ser literal em ClientFormPage — a fonte é utils/enums.js`
      );
    }
  });

  test("utils/enums.js tem os dois valores, com os rótulos certos", () => {
    const enums = ler("src/utils/enums.js");
    assert.match(enums, /value:\s*'fisica',\s*label:\s*'Pessoa Física'/);
    assert.match(enums, /value:\s*'juridica',\s*label:\s*'Pessoa Jurídica'/);
  });
});
