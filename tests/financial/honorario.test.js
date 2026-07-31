// ═══════════════════════════════════════════════════════════════════════════
// Fase 4.2 — a regra do honorário no cliente
//
// ── Por que estes testes são de FUNÇÃO, e não de render ────────────────────
// A suíte deste repositório é `node --test`, sem DOM e sem testing-library, e a
// fase não autoriza dependência nova. Foi por isso que a regra saiu do JSX para
// `utils/feeCalc.js`: assim ela é executada de verdade em vez de conferida por
// varredura de texto.
//
// A varredura ainda existe (`estatica.test.js`), e prova outra coisa: que o
// componente CONTINUA chamando estas funções. As duas juntas cobrem a cadeia —
// a conta está certa, e é ela que a tela usa.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  camposDoTipo,
  derivarValorHonorario,
  validarHonorario,
  montarPayloadHonorario
} from "../../src/utils/feeCalc.js";
import { formatPercent } from "../../src/utils/formatters.js";

// ═════════════════════════════════════════════════════════════════════════
// Renderização condicional — os três tipos
// ═════════════════════════════════════════════════════════════════════════

describe("o tipo comanda quais campos existem", () => {
  test("fixo: `valor` é entrada, percentual e valor base não são renderizados", () => {
    assert.deepEqual(camposDoTipo("fixo"), {
      valor: "entrada",
      percentual: false,
      valorBase: false
    });
  });

  test("custas: idêntico ao fixo — só o percentual muda de forma", () => {
    assert.deepEqual(camposDoTipo("custas"), {
      valor: "entrada",
      percentual: false,
      valorBase: false
    });
  });

  test("percentual: `valor` vira exibição derivada e as duas parcelas aparecem", () => {
    assert.deepEqual(camposDoTipo("percentual"), {
      valor: "derivado",
      percentual: true,
      valorBase: true
    });
  });

  test("sem tipo escolhido, os campos de percentual não aparecem", () => {
    // Mostrá-los antes de saber se se aplicam convida a preencher o que será
    // recusado pelo hook.
    const campos = camposDoTipo("");
    assert.equal(campos.percentual, false);
    assert.equal(campos.valorBase, false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Derivação de `valor`
// ═════════════════════════════════════════════════════════════════════════

describe("`valor` derivado espelha o hook do backend", () => {
  test("10% de 50.000 = 5.000, e muda ao vivo para 8.000 quando a base vira 80.000", () => {
    // O caso do item 6 da verificação da fase: é esta troca que a advogada vê
    // acontecer enquanto digita.
    assert.equal(derivarValorHonorario(10, 50000), 5000);
    assert.equal(derivarValorHonorario(10, 80000), 8000);
  });

  test("6% de 200.000 = 12.000 — o honorário percentual do seed", () => {
    // Trava a ficha do seed contra o que o backend gravou de fato.
    assert.equal(derivarValorHonorario(6, 200000), 12000);
  });

  test("33,33% de 1.000 sai 333,30, e não 333,3000000000001", () => {
    // A razão de arredondar em CENTAVOS antes de dividir. Dividir primeiro
    // traria o erro de ponto flutuante para dentro do número que ela assina.
    assert.equal(derivarValorHonorario(33.33, 1000), 333.3);
  });

  test("percentual de 100% devolve a base inteira", () => {
    assert.equal(derivarValorHonorario(100, 1234.56), 1234.56);
  });

  test("conta impossível devolve null, e a tela mostra '—'", () => {
    // `null` e não 0: "R$ 0,00" parece um valor combinado, "—" é honesto sobre
    // não haver conta ainda.
    assert.equal(derivarValorHonorario("", 50000), null);
    assert.equal(derivarValorHonorario(10, ""), null);
    assert.equal(derivarValorHonorario(0, 50000), null);
    assert.equal(derivarValorHonorario(101, 50000), null);
    assert.equal(derivarValorHonorario("abc", 50000), null);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Formatação de percentual — os três exemplos canônicos da Fase 4.1
// ═════════════════════════════════════════════════════════════════════════

describe("formatPercent espelha templateFormatters.percentual do backend", () => {
  test('10 → "10%" — zeros à direita descartados', () => {
    assert.equal(formatPercent(10), "10%");
  });

  test('12.5 → "12,5%" — vírgula decimal', () => {
    assert.equal(formatPercent(12.5), "12,5%");
  });

  test('33.33 → "33,33%" — no máximo duas casas', () => {
    assert.equal(formatPercent(33.33), "33,33%");
  });

  test("o símbolo COLA no número — em português não há o que separar", () => {
    // Diferente de `moeda`, que carrega espaço não-separável depois do "R$".
    for (const valor of [10, 12.5, 33.33]) {
      assert.ok(!/\s%/.test(formatPercent(valor)), "apareceu espaço antes do %");
    }
  });

  test("honorário sem percentual (fixo, custas) sai '—'", () => {
    // Diferença deliberada em relação ao backend, onde o vazio sai "" para o
    // marcador virar pendência 422 no documento. Aqui é coluna de tabela, e "—"
    // é o que `formatCurrency` e `formatDate` já fazem.
    assert.equal(formatPercent(null), "—");
    assert.equal(formatPercent(undefined), "—");
    assert.equal(formatPercent(""), "—");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Validação de cliente — espelho do hook, com as mesmas mensagens
// ═════════════════════════════════════════════════════════════════════════

describe("a validação de cliente usa as mensagens do backend, palavra por palavra", () => {
  const base = {
    processoId: "p1",
    descricao: "Contrato",
    tipo: "percentual",
    dataVencimento: "2026-12-01"
  };

  test("percentual ausente no tipo percentual", () => {
    const p = validarHonorario({ ...base, percentual: "", valorBase: 1000 });
    assert.equal(p.campo, "percentual");
    assert.equal(p.mensagem, "Honorário do tipo percentual exige o percentual contratado");
  });

  test("percentual fora da faixa (> 100)", () => {
    const p = validarHonorario({ ...base, percentual: 150, valorBase: 1000 });
    assert.equal(p.campo, "percentual");
    assert.equal(p.mensagem, "O percentual deve ser maior que zero e no máximo 100");
  });

  test("percentual zero também é fora da faixa", () => {
    assert.equal(validarHonorario({ ...base, percentual: 0, valorBase: 1000 }).campo, "percentual");
  });

  test("valorBase ausente quando há percentual", () => {
    const p = validarHonorario({ ...base, percentual: 10, valorBase: "" });
    assert.equal(p.campo, "valorBase");
    assert.equal(p.mensagem, "Informe o valor base sobre o qual o percentual incide");
  });

  test("valorBase negativo", () => {
    const p = validarHonorario({ ...base, percentual: 10, valorBase: -1 });
    assert.equal(p.campo, "valorBase");
    assert.equal(p.mensagem, "O valor base deve ser um número maior ou igual a zero");
  });

  test("percentual válido não reclama de nada", () => {
    assert.equal(validarHonorario({ ...base, percentual: 10, valorBase: 50000 }), null);
  });

  test("um problema por vez — dois inputs destacados escondem o segundo", () => {
    // Percentual E base errados: responde só o percentual, que é o primeiro na
    // ordem de descoberta do hook.
    const p = validarHonorario({ ...base, percentual: 150, valorBase: -1 });
    assert.equal(p.campo, "percentual");
  });

  test("tipo fixo só exige `valor`", () => {
    assert.equal(validarHonorario({ ...base, tipo: "fixo", valor: 3000 }), null);
    assert.equal(validarHonorario({ ...base, tipo: "fixo", valor: "" }).campo, "valor");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Payload
// ═════════════════════════════════════════════════════════════════════════

describe("o payload conhece as três regras que o formulário sozinho erraria", () => {
  const percentual = {
    processoId: "p1",
    descricao: "Êxito",
    tipo: "percentual",
    percentual: 10,
    valorBase: 50000,
    valor: 9999, // o que estiver aqui é ruído: no percentual `valor` é derivado
    dataVencimento: "2026-12-01"
  };

  test("tipo percentual NÃO envia `valor` — ele é derivado pelo backend", () => {
    const payload = montarPayloadHonorario(percentual, { isEditing: true });
    assert.ok(!("valor" in payload), "`valor` vazou no payload do tipo percentual");
    assert.equal(payload.percentual, 10);
    assert.equal(payload.valorBase, 50000);
  });

  test("sair do tipo percentual envia `null` nos dois campos, nunca undefined", () => {
    // A convenção do projeto: campo apagado grava `null`. Omitir os dois no
    // PATCH deixaria o percentual antigo no documento, e o hook recusaria a
    // gravação com "honorário do tipo fixo não admite percentual" — erro que a
    // advogada não teria como entender, porque o campo nem está na tela.
    const payload = montarPayloadHonorario(
      { ...percentual, tipo: "fixo", valor: 3000 },
      { isEditing: true }
    );

    assert.equal(payload.percentual, null);
    assert.equal(payload.valorBase, null);
    assert.equal(payload.valor, 3000);

    // `null` explícito, e não a chave ausente.
    assert.ok("percentual" in payload);
    assert.ok("valorBase" in payload);
    assert.notEqual(payload.percentual, undefined);
    assert.notEqual(payload.valorBase, undefined);
  });

  test("custas se comporta como fixo", () => {
    const payload = montarPayloadHonorario(
      { ...percentual, tipo: "custas", valor: 450 },
      { isEditing: true }
    );
    assert.equal(payload.percentual, null);
    assert.equal(payload.valorBase, null);
    assert.equal(payload.valor, 450);
  });

  test("na criação o status é sempre `pendente`", () => {
    // O backend EXIGE `status` na criação, e "pendente" é o único ponto de
    // partida honesto: honorário que nunca recebeu um centavo não é "pago".
    const payload = montarPayloadHonorario(percentual, { isEditing: false });
    assert.equal(payload.status, "pendente");
  });

  test("na edição, `status` só sai quando é o cancelamento", () => {
    // Os outros três são derivados das parcelas (DEC-028) e qualquer valor
    // enviado é reconciliado — mandá-los seria ruído com aparência de intenção.
    const semMexer = montarPayloadHonorario(
      { ...percentual, cancelado: false, statusOriginal: "parcialmente_pago" },
      { isEditing: true }
    );
    assert.ok(!("status" in semMexer), "`status` derivado vazou no PATCH");

    const cancelando = montarPayloadHonorario(
      { ...percentual, cancelado: true, statusOriginal: "pendente" },
      { isEditing: true }
    );
    assert.equal(cancelando.status, "cancelado");
  });

  test("descancelar é escrita explícita e devolve o registro à derivação", () => {
    // Sem isto a guarda de `recalcularStatusFee` deixaria o honorário preso em
    // `cancelado` para sempre.
    const payload = montarPayloadHonorario(
      { ...percentual, cancelado: false, statusOriginal: "cancelado" },
      { isEditing: true }
    );
    assert.equal(payload.status, "pendente");
  });

  test("`valorPago` não existe em payload de honorário nenhum", () => {
    for (const opcoes of [{ isEditing: false }, { isEditing: true }]) {
      for (const tipo of ["fixo", "percentual", "custas"]) {
        const payload = montarPayloadHonorario({ ...percentual, tipo, valor: 100 }, opcoes);
        assert.ok(!("valorPago" in payload), `valorPago vazou (${tipo})`);
      }
    }
  });
});
