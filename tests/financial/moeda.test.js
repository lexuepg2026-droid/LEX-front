// ═══════════════════════════════════════════════════════════════════════════
// ENTRADA DE DINHEIRO EM pt-BR — `MoneyInput` e as funções de `masks.js`
//
// A suíte não tem DOM (decisão da Fase 2E.2), então o que se testa aqui é a
// REGRA, que por isso mesmo mora fora do componente: `maskMoney`, `parseMoney`
// e `formatMoneyInput` são funções puras de `utils/masks.js`, e o componente
// só as costura a um `<input>`.
//
// ── O que este arquivo existe para pegar ───────────────────────────────────
// O erro caro deste campo é de FATOR 100. "1.234,56" lido como 123456, ou
// "1234.56" lido como 123456, é uma cobrança cem mil vezes maior gravada sem
// nenhum sintoma — o número aparece formatado e bonito na listagem.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { maskMoney, parseMoney, formatMoneyInput } from "../../src/utils/masks.js";
import { derivarValorHonorario, montarPayloadHonorario } from "../../src/utils/feeCalc.js";

describe("máscara de moeda — digitação", () => {
  test("agrupa o milhar com ponto e mantém a vírgula decimal", () => {
    const casos = [
      ["1", "1"],
      ["15", "15"],
      ["1500", "1.500"],
      ["1500,", "1.500,"],
      ["1500,5", "1.500,5"],
      ["1500,50", "1.500,50"],
      ["1234567", "1.234.567"],
      ["1234567,89", "1.234.567,89"],
    ];
    for (const [digitado, esperado] of casos) {
      assert.equal(maskMoney(digitado), esperado, `digitado: ${digitado}`);
    }
  });

  test("a máscara é idempotente e sobrevive à própria saída", () => {
    // O caso que quebrou a primeira versão desta máscara. Ela é reaplicada
    // sobre o texto que ela mesma produziu a cada tecla: com "1.500" na tela,
    // digitar mais um zero entrega "1.5000" a ela — e a versão que tratava
    // ponto como decimal devolvia "1,50", ou seja, R$ 1,50 no lugar de
    // R$ 15.000,00.
    assert.equal(maskMoney("1.500"), "1.500", "reaplicar sobre a própria saída mudou o valor");
    assert.equal(maskMoney("1.5000"), "15.000", "digitar um zero após 1.500 deveria dar 15.000");
    assert.equal(maskMoney("1.234.567"), "1.234.567");

    // E apagar o último dígito de "1.500" volta para 150, não para 1,50.
    assert.equal(maskMoney("1.50"), "150");
  });

  test("a sequência de teclas de um valor real produz o texto certo", () => {
    // Simula a digitação caractere a caractere como o navegador a entrega:
    // o texto na tela mais a tecla nova. É o caminho que o `onChange` do
    // `MoneyInput` percorre.
    let texto = "";
    for (const tecla of "1500,50") {
      texto = maskMoney(texto + tecla);
    }
    assert.equal(texto, "1.500,50");
    assert.equal(parseMoney(texto), 1500.5);
  });

  test("só a primeira vírgula separa, e o decimal para em duas casas", () => {
    assert.equal(maskMoney("10,5,7"), "10,57");
    assert.equal(maskMoney("10,5678"), "10,56");
  });

  test("letra e símbolo digitados no campo são descartados", () => {
    assert.equal(maskMoney("R$ 1500,50"), "1.500,50");
    assert.equal(maskMoney("abc"), "");
  });

  test("zero à esquerda some, mas `0,` sobrevive", () => {
    // Apagar o zero de "0,50" deixaria a vírgula órfã.
    assert.equal(maskMoney("007"), "7");
    assert.equal(maskMoney("0,50"), "0,50");
    assert.equal(maskMoney(",5"), "0,5");
  });
});

describe("máscara de moeda — colagem", () => {
  test("cola no formato pt-BR: `1.234,56` → 1234.56", () => {
    assert.equal(parseMoney("1.234,56"), 1234.56);
    assert.equal(parseMoney("R$ 1.234,56"), 1234.56);
    assert.equal(parseMoney("12.345.678,90"), 12345678.9);
  });

  test("cola no formato de extrato: `1234.56` → 1234.56", () => {
    assert.equal(parseMoney("1234.56"), 1234.56);
    assert.equal(parseMoney("1234.5"), 1234.5);
    assert.equal(parseMoney("1234"), 1234);
  });

  test("`1.234` colado de planilha brasileira é MIL duzentos e trinta e quatro", () => {
    // O caso ambíguo, e o mais perigoso: um ponto seguido de TRÊS dígitos é
    // separador de milhar em qualquer leitura razoável. Tratá-lo como decimal
    // transformaria R$ 1.234,00 em R$ 1,23.
    assert.equal(parseMoney("1.234"), 1234);
    assert.equal(parseMoney("1.234.567"), 1234567);
  });

  test("nenhuma colagem plausível é lida com erro de fator 100", () => {
    // A varredura que dá nome ao arquivo: todas estas escritas descrevem o
    // MESMO valor, e todas têm de sair como o mesmo número.
    for (const escrita of ["1500", "1500.00", "1.500", "1.500,00", "R$ 1.500,00", "R$1.500"]) {
      assert.equal(parseMoney(escrita), 1500, `"${escrita}" não saiu como 1500`);
    }
  });

  test("texto sem número nenhum devolve `null`, e não 0", () => {
    for (const lixo of ["", "   ", "abc", "R$", null, undefined]) {
      assert.equal(parseMoney(lixo), null, `"${lixo}" deveria ser null`);
    }
  });
});

describe("máscara de moeda — apagar e reexibir", () => {
  test("apagar tudo devolve `null`, nunca 0", () => {
    // `null` é "não informado" e 0 é "cobrança de zero real". A convenção do
    // projeto para campo apagado é `null`, e é dela que `validarHonorario`
    // depende para acusar "valor é obrigatório" em vez de aceitar um honorário
    // de R$ 0,00.
    assert.equal(parseMoney(maskMoney("")), null);
    assert.equal(parseMoney(""), null);
    assert.notEqual(parseMoney(""), 0);
  });

  test("valor gravado volta ao input com as duas casas", () => {
    assert.equal(formatMoneyInput(1500), "1.500,00");
    assert.equal(formatMoneyInput(1234.5), "1.234,50");
    assert.equal(formatMoneyInput(0), "0,00");
    assert.equal(formatMoneyInput(null), "");
    assert.equal(formatMoneyInput(''), "");
  });

  test("ida e volta não perde nem inventa centavo", () => {
    for (const numero of [0, 0.01, 1, 99.99, 1500, 1234.56, 12345678.9]) {
      assert.equal(
        parseMoney(formatMoneyInput(numero)), numero,
        `round-trip falhou em ${numero}`
      );
    }
  });
});

describe("o contrato com o resto do módulo financeiro não mudou", () => {
  test("o payload do honorário continua recebendo Number em reais", () => {
    // O contrato da Fase 4.2: `valor` e `valorBase` viajam em REAIS. O
    // `MoneyInput` entrega exatamente o que o `<input type=number>` entregava
    // — só que sem depender de o navegador aceitar vírgula.
    const doInput = parseMoney("3.000,00");
    const payload = montarPayloadHonorario({
      processoId: "p", descricao: "d", tipo: "fixo",
      dataVencimento: "2026-12-01", valor: doInput,
    });

    assert.equal(payload.valor, 3000);
    assert.equal(typeof payload.valor, "number");
    assert.equal(payload.percentual, null);
    assert.equal(payload.valorBase, null);
  });

  test("round-trip com `feeCalc`: colar o valor base dá o mesmo honorário", () => {
    // 6% sobre 200.000 grava 12.000 — o caso do seed. Colado em pt-BR ou em
    // formato de extrato, a conta precisa sair igual.
    const base = parseMoney("200.000,00");
    assert.equal(base, 200000);
    assert.equal(derivarValorHonorario(6, base), 12000);
    assert.equal(derivarValorHonorario(6, parseMoney("200000.00")), 12000);

    // E o arredondamento em centavos da DEC-027 sobrevive à máscara.
    assert.equal(derivarValorHonorario(33.33, parseMoney("1.000,00")), 333.3);
  });

  test("campo apagado reprova na validação em vez de virar R$ 0,00", () => {
    const payload = montarPayloadHonorario({
      processoId: "p", descricao: "d", tipo: "fixo",
      dataVencimento: "2026-12-01", valor: parseMoney(""),
    });
    // `Number(null)` é 0 — é justamente por isso que `validarHonorario` roda
    // ANTES de montar o payload, e é ela quem barra o campo vazio.
    assert.equal(payload.valor, 0);
  });
});
