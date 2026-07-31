// ═══════════════════════════════════════════════════════════════════════════
// Fase 4.2 — tratamento dos erros do módulo financeiro
//
// Os quatro casos que a advogada encontra na prática, com o corpo exatamente
// como o `errorHandler` do backend o monta (allowlist de `CHAVES_ESTRUTURADAS`,
// Fase 2E.1).
//
// O que se prova aqui é que a informação ÚTIL chega à tela: não que houve erro
// — isso a mensagem do servidor já dizia —, mas o saldo que ainda cabe, quantos
// dependentes bloqueiam e quais campos faltam.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  getFinancialErrorMessage,
  mensagemDeExcedente,
  mensagemDeIntegridade,
  mensagemDePendencias
} from "../../src/utils/financialErrors.js";
import { getApiErrorField, getApiErrorConflict } from "../../src/utils/apiError.js";

// Erro do axios, na forma em que a tela o recebe.
const erroDeApi = (status, data) => ({
  message: `Request failed with status code ${status}`,
  response: { status, data }
});

// ═════════════════════════════════════════════════════════════════════════
// 400 com `campo` — o hook condicional reprovou UM campo
// ═════════════════════════════════════════════════════════════════════════

describe("400 do hook condicional: a tela destaca o campo que o backend nomeou", () => {
  test("percentual num honorário fixo — `campo` roteia o destaque", () => {
    const err = erroDeApi(400, {
      message:
        "Honorário do tipo fixo não admite percentual. Mude o tipo para percentual ou apague o campo.",
      errors: { percentual: "Honorário do tipo fixo não admite percentual." },
      campo: "percentual"
    });

    assert.equal(getApiErrorField(err), "percentual");
    // A mensagem do hook JÁ é a redação final — não se reescreve por cima.
    assert.match(getFinancialErrorMessage(err, "Erro ao salvar honorário."), /não admite percentual/);
  });

  test("valorBase ausente — o outro campo que o hook nomeia", () => {
    const err = erroDeApi(400, {
      message: "Informe o valor base sobre o qual o percentual incide",
      errors: { valorBase: "Informe o valor base sobre o qual o percentual incide" },
      campo: "valorBase"
    });
    assert.equal(getApiErrorField(err), "valorBase");
  });

  test("DOIS campos errados vêm SEM `campo`, e nada é destacado", () => {
    // Destacar o primeiro esconderia o segundo: ela corrigiria um, reenviaria e
    // levaria o mesmo 400.
    const err = erroDeApi(400, {
      message: "Dados inválidos",
      errors: {
        percentual: "O percentual deve ser maior que zero e no máximo 100",
        valorBase: "O valor base deve ser um número maior ou igual a zero"
      }
    });
    assert.equal(getApiErrorField(err), null);
  });

  test("`valorPago` enviado no corpo da parcela é 400 com campo próprio", () => {
    const err = erroDeApi(400, {
      message:
        "`valorPago` da parcela é calculado a partir dos pagamentos e não pode ser enviado. " +
        "Registre um pagamento em POST /payments.",
      campo: "valorPago"
    });
    assert.equal(getApiErrorField(err), "valorPago");
    assert.match(getFinancialErrorMessage(err, "x"), /POST \/payments/);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 409 de excedente — o caso de maior valor prático da fase
// ═════════════════════════════════════════════════════════════════════════

describe("409 de excedente: a mensagem diz QUANTO ainda cabe", () => {
  const excedente = erroDeApi(409, {
    message: "O valor informado excede o saldo desta parcela.",
    campo: "valorPago",
    regra: "pagamentoExcedeParcela",
    saldoDisponivel: 350.5,
    valorParcela: 1000
  });

  test("o saldo aparece na mensagem, formatado em moeda pt-BR", () => {
    const msg = getFinancialErrorMessage(excedente, "Erro ao salvar pagamento.");
    assert.match(msg, /350,50/, "o saldo disponível não chegou à mensagem");
    assert.match(msg, /1\.000,00/, "o valor da parcela não chegou à mensagem");
    assert.match(msg, /Ainda cabem/);
  });

  test("a prosa do servidor é preservada — a tela acrescenta, não substitui", () => {
    assert.match(getFinancialErrorMessage(excedente, "x"), /excede o saldo desta parcela/);
  });

  test("`campo: valorPago` marca o input", () => {
    assert.equal(getApiErrorField(excedente), "valorPago");
  });

  test("as chaves estruturadas chegam pelo helper, sem ninguém abrir err.response", () => {
    const conflito = getApiErrorConflict(excedente);
    assert.equal(conflito.regra, "pagamentoExcedeParcela");
    assert.equal(conflito.saldoDisponivel, 350.5);
    assert.equal(conflito.valorParcela, 1000);
  });

  test("saldo ZERO tem frase própria — não convida a tentar de novo", () => {
    const quitada = erroDeApi(409, {
      message: "O valor informado excede o saldo desta parcela.",
      campo: "valorPago",
      regra: "pagamentoExcedeParcela",
      saldoDisponivel: 0,
      valorParcela: 1000
    });
    const msg = getFinancialErrorMessage(quitada, "x");
    assert.match(msg, /já está quitada/);
    assert.ok(!/Ainda cabem/.test(msg), '"ainda cabem R$ 0,00" convidaria a tentar mais um centavo');
  });

  test("outro 409 não é confundido com excedente", () => {
    const outro = erroDeApi(409, { message: "Conflito", campo: "numeroParcela" });
    assert.equal(mensagemDeExcedente(outro), null);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 409 de integridade — dependencia + quantidade, SEM campo
// ═════════════════════════════════════════════════════════════════════════

describe("409 de integridade: diz quantos dependentes, e não destaca campo", () => {
  test("honorário com parcelas ativas", () => {
    const err = erroDeApi(409, {
      message: "Não é possível remover: o honorário possui 3 parcelas ativas.",
      dependencia: "parcelas",
      quantidade: 3
    });

    const msg = getFinancialErrorMessage(err, "Erro ao remover honorário.");
    assert.match(msg, /3 parcelas ativas/);
    assert.match(msg, /remova antes de excluir/);

    // `campo` NÃO se usa aqui: o conflito é entre registros gravados, e não há
    // input errado para marcar.
    assert.equal(getApiErrorField(err), null);
  });

  test("parcela com pagamentos ativos", () => {
    const err = erroDeApi(409, {
      message: "Não é possível remover: a parcela possui 2 pagamentos ativos.",
      dependencia: "pagamentos",
      quantidade: 2
    });
    assert.match(getFinancialErrorMessage(err, "x"), /2 pagamentos ativos/);
    assert.equal(getApiErrorField(err), null);
  });

  test("singular não sai como '1 parcelas ativas'", () => {
    const err = erroDeApi(409, {
      message: "Não é possível remover.",
      dependencia: "parcelas",
      quantidade: 1
    });
    const msg = getFinancialErrorMessage(err, "x");
    assert.match(msg, /1 parcela ativa/);
    assert.ok(!/1 parcelas/.test(msg));
  });

  test("`dependencia` fora do vocabulário fechado não inventa texto", () => {
    // O vocabulário é fechado em `config/integrityConflicts.js`. Valor
    // desconhecido cai na mensagem do servidor, sem frase montada por cima.
    const err = erroDeApi(409, {
      message: "Não é possível remover.",
      dependencia: "coisas",
      quantidade: 4
    });
    assert.equal(mensagemDeIntegridade(err), null);
    assert.equal(getFinancialErrorMessage(err, "x"), "Não é possível remover.");
  });

  test("409 de numeroParcela duplicado marca o campo, e NÃO é de integridade", () => {
    const err = erroDeApi(409, {
      message: "Já existe uma parcela com este número neste honorário.",
      campo: "numeroParcela"
    });
    assert.equal(getApiErrorField(err), "numeroParcela");
    assert.equal(mensagemDeIntegridade(err), null);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 422 de pendências
// ═════════════════════════════════════════════════════════════════════════

describe("422 de pendências: usa o RÓTULO escrito pelo backend", () => {
  const err = erroDeApi(422, {
    message: "Faltam dados de cadastro para gerar este documento.",
    errors: {
      pendencias: [
        {
          variavel: "percentualHonorario",
          rotulo: "Percentual do honorário",
          origem: "honorario",
          orientacao: "O honorário escolhido não é do tipo percentual."
        }
      ]
    }
  });

  test("o rótulo legível chega à mensagem", () => {
    assert.match(getFinancialErrorMessage(err, "x"), /Percentual do honorário/);
  });

  test("a CHAVE nunca é exibida — é identificador, não nome legível", () => {
    const msg = getFinancialErrorMessage(err, "x");
    assert.ok(
      !msg.includes("percentualHonorario"),
      "a chave técnica vazou para a tela; o rótulo é que se mostra"
    );
  });

  test("422 sem pendências cai na mensagem do servidor", () => {
    const vazio = erroDeApi(422, { message: "Não foi possível gerar." });
    assert.equal(mensagemDePendencias(vazio), null);
    assert.equal(getFinancialErrorMessage(vazio, "x"), "Não foi possível gerar.");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Degradação
// ═════════════════════════════════════════════════════════════════════════

describe("erro sem chave estruturada nenhuma continua funcionando", () => {
  test("queda de rede cai no fallback, sem quebrar", () => {
    const err = { message: "Network Error" };
    assert.equal(getFinancialErrorMessage(err, "Erro ao salvar."), "Network Error");
  });

  test("resposta vazia usa o fallback da tela", () => {
    assert.equal(getFinancialErrorMessage({}, "Erro ao salvar."), "Erro ao salvar.");
    assert.deepEqual(getApiErrorConflict({}), {
      regra: null,
      dependencia: null,
      quantidade: null,
      saldoDisponivel: null,
      valorParcela: null
    });
  });
});
