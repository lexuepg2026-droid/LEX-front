// ═══════════════════════════════════════════════════════════════════════════
// FINANCEIRO 2.0 NA TELA — o mínimo da Fase F-1a
//
// A fase tocou o frontend só o suficiente para o app funcionar com o modelo
// novo: o pagamento nasce contra o honorário, as duas rotas de reativação
// morreram, e a listagem passou a ler valor líquido e alocações. A UX rica
// (preview de alocação, estorno em modal, extrato na tela, paginador real) é a
// F-1b, e nada dela é testado aqui — não existe ainda.
//
// ── O que dá para provar sem DOM ──────────────────────────────────────────
// A suíte é `node --test` sem renderizador (decisão da Fase 2E.2). Então:
//
//   • as duas funções PURAS extraídas nesta fase são executadas de verdade —
//     é para isso que elas foram extraídas, e não deixadas dentro do JSX;
//   • o resto é varredura estática, no padrão de `estatica.test.js`: prova que
//     a tela continua chamando o que deve e deixou de chamar o que morreu.
//
// A varredura limpa comentários antes de analisar. Sem isso, o comentário que
// explica "`removePayment` saiu" derrubaria a varredura que procura
// `removePayment` — e a saída óbvia seria apagar o comentário.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { resumoDaAlocacao } from "../../src/pages/payments/allocationSummary.js";
import { rotuloDasParcelas, temEstorno } from "../../src/pages/payments/paymentRow.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ═════════════════════════════════════════════════════════════════════════
describe("resumo do que o motor fez com o dinheiro", () => {
  test("uma parcela afetada, sem sobra", () => {
    const frase = resumoDaAlocacao({
      alocacoes: [{ valor: 1000 }],
      sobra: 0,
      saldoAdiantado: 0
    });

    assert.match(frase, /Pagamento registrado/);
    assert.match(frase, /1 parcela\b/, "singular");
    assert.ok(!/parcelas/.test(frase), "não pode pluralizar com uma só");
    assert.ok(!/saldo adiantado/.test(frase), "sem sobra, não se fala em saldo");
  });

  test("duas parcelas afetadas: a frase pluraliza e soma o total aplicado", () => {
    const frase = resumoDaAlocacao({
      alocacoes: [{ valor: 400 }, { valor: 600 }],
      sobra: 0
    });

    assert.match(frase, /2 parcelas/, "plural");
    assert.match(frase, /aplicados/, "concordância do particípio");
    // O total é a SOMA das alocações, não o valor do pagamento: são iguais
    // quando não há sobra, e diferentes quando há — e é o aplicado que
    // descreve o que aconteceu com as parcelas.
    assert.match(frase, /1\.000,00/);
  });

  test("sobra vira saldo adiantado, e a frase diz para onde foi", () => {
    const frase = resumoDaAlocacao({
      alocacoes: [{ valor: 1000 }],
      sobra: 250,
      saldoAdiantado: 250
    });

    assert.match(frase, /1 parcela\b/);
    assert.match(frase, /250,00/);
    assert.match(
      frase, /saldo adiantado/,
      "sem dizer onde o dinheiro ficou, a advogada pensa que ele se perdeu"
    );
  });

  test("adiantamento sem parcela nenhuma: só o saldo", () => {
    const frase = resumoDaAlocacao({ alocacoes: [], sobra: 800, saldoAdiantado: 800 });

    assert.match(frase, /800,00/);
    assert.match(frase, /saldo adiantado/);
    assert.ok(!/parcela/.test(frase), "não há parcela para nomear");
  });

  test("resposta vazia ou malformada não produz frase vazia", () => {
    // Um toast em branco é pior que um genérico: a advogada não sabe se
    // gravou. O contrato garante que isto não acontece; a função não depende
    // disso para continuar dizendo alguma coisa.
    for (const entrada of [undefined, null, {}, { alocacoes: null }]) {
      const frase = resumoDaAlocacao(entrada);
      assert.match(frase, /Pagamento registrado/);
      assert.ok(frase.trim().length > 20, `frase curta demais para "${JSON.stringify(entrada)}"`);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe("rótulo das parcelas de uma linha de pagamento", () => {
  test("uma parcela", () => {
    assert.equal(
      rotuloDasParcelas({ alocacoes: [{ numeroParcela: 3, ativa: true }] }),
      "Parcela 3"
    );
  });

  test("duas parcelas: a coluna nomeia as DUAS", () => {
    // Era o caso impossível até a F-0, quando o pagamento pertencia a uma
    // parcela só. Exibir uma delas esconderia a outra.
    assert.equal(
      rotuloDasParcelas({
        alocacoes: [{ numeroParcela: 2, ativa: true }, { numeroParcela: 1, ativa: true }]
      }),
      "Parcelas 1 e 2",
      "e em ordem — a de criação não é a de leitura"
    );
  });

  test("três parcelas usam vírgula e `e` antes da última", () => {
    assert.equal(
      rotuloDasParcelas({
        alocacoes: [
          { numeroParcela: 1, ativa: true },
          { numeroParcela: 2, ativa: true },
          { numeroParcela: 3, ativa: true }
        ]
      }),
      "Parcelas 1, 2 e 3"
    );
  });

  test("alocação desfeita por estorno não conta", () => {
    assert.equal(
      rotuloDasParcelas({
        valor: 500,
        valorLiquido: 500,
        alocacoes: [
          { numeroParcela: 1, ativa: false },
          { numeroParcela: 2, ativa: true }
        ]
      }),
      "Parcela 2"
    );
  });

  test("sem alocação ativa e COM líquido: o dinheiro está em saldo adiantado", () => {
    assert.equal(
      rotuloDasParcelas({ valor: 800, valorLiquido: 800, alocacoes: [] }),
      "Saldo adiantado"
    );
  });

  test("sem alocação ativa e SEM líquido: estornado, não adiantado", () => {
    // A distinção importa e é a razão de a função ler o líquido: dizer "saldo
    // adiantado" sobre um pagamento estornado afirmaria que o dinheiro está no
    // caixa da advogada.
    assert.equal(
      rotuloDasParcelas({
        valor: 800,
        valorLiquido: 0,
        alocacoes: [{ numeroParcela: 1, ativa: false }]
      }),
      "—"
    );
  });

  test("parcela não populada: conta, mas não inventa número", () => {
    assert.equal(
      rotuloDasParcelas({ alocacoes: [{ ativa: true }, { ativa: true }] }),
      "2 parcelas"
    );
    assert.ok(
      !/undefined/.test(rotuloDasParcelas({ alocacoes: [{ ativa: true }] })),
      "`Parcela undefined` na tela da advogada"
    );
  });
});

describe("destaque do valor estornado", () => {
  test("líquido menor que o bruto → houve estorno ativo", () => {
    assert.equal(temEstorno({ valor: 1000, valorLiquido: 700 }), true);
  });

  test("líquido igual ao bruto → não houve", () => {
    assert.equal(temEstorno({ valor: 1000, valorLiquido: 1000 }), false);
  });

  test("sem `valorLiquido` na resposta, assume o bruto e não acusa", () => {
    // Um destaque falso é pior que nenhum: a linha diria que houve estorno
    // onde não houve.
    assert.equal(temEstorno({ valor: 1000 }), false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
describe("as telas seguem o modelo novo", () => {
  test("PaymentFormPage seleciona HONORÁRIO, não parcela", () => {
    const codigo = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));

    assert.match(codigo, /name="honorarioId"/, "o seletor de honorário sumiu");
    assert.ok(
      !/name="installmentId"/.test(codigo),
      "o seletor de parcela voltou — o pagamento não pertence a uma parcela desde a DEC-032"
    );
    assert.match(codigo, /honorarioId:\s*formData\.honorarioId/, "o payload perdeu o honorário");
    assert.match(codigo, /tipo:\s*formData\.tipo/, "o payload perdeu o tipo do pagamento");
  });

  test("o payload de EDIÇÃO tem um campo só", () => {
    // A allowlist do backend aceita `observacoes` e mais nada. Um payload maior
    // levaria 400 com `campo`, e a advogada leria "campo não permitido" sobre
    // um input que a tela nem oferece.
    const codigo = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(
      codigo,
      /updatePayment\(\s*id\s*,\s*\{\s*observacoes:\s*formData\.observacoes\s*\}\s*\)/,
      "a edição de pagamento voltou a mandar mais de um campo"
    );
  });

  test("o formulário usa MoneyInput no campo de dinheiro", () => {
    // Regra do projeto desde a 4.3: os campos de dinheiro não voltam a ser
    // `<input type="number">`. O erro que o componente evita é de fator 100 e
    // não tem sintoma — o número aparece certo e a cobrança fica cem vezes
    // errada.
    const codigo = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(codigo, /<MoneyInput/);
    assert.ok(
      !/type="number"/.test(codigo),
      "um campo de dinheiro voltou a ser input numérico cru"
    );
  });

  test("o resultado da criação é mostrado a partir do que o backend devolveu", () => {
    const codigo = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(
      codigo,
      /toast\.success\(\s*resumoDaAlocacao\(/,
      "a tela deixou de dizer o que aconteceu com o dinheiro"
    );
  });

  test("nenhuma tela chama as rotas que morreram", () => {
    const mortos = [
      ["src/pages/payments/PaymentListPage.jsx", /reativarPayment|removePayment/],
      ["src/pages/installments/InstallmentListPage.jsx", /reativarInstallment/],
      ["src/api/paymentService.js", /const\s+(reativarPayment|removePayment)/],
      ["src/api/installmentService.js", /const\s+reativarInstallment/]
    ];

    for (const [arquivo, padrao] of mortos) {
      const codigo = semComentarios(ler(arquivo));
      assert.ok(
        !padrao.test(codigo),
        `${arquivo} ainda usa uma rota que responde 404 desde a DEC-032/DEC-034`
      );
    }
  });

  test("a ficha financeira lê ALOCAÇÕES, não `pagamentos` da parcela", () => {
    const codigo = semComentarios(ler("src/components/financeiro/ProcessFinancialSheet.jsx"));
    assert.match(codigo, /p\.alocacoes/, "a ficha não foi religada às alocações");
    assert.ok(
      !/p\.pagamentos/.test(codigo),
      "a ficha ainda lê `parcela.pagamentos`, que o backend deixou de enviar"
    );
  });

  test("a ficha e o dashboard expõem `saldoAdiantado`", () => {
    // Sem ele, `contratado − recebido` não bate com o em aberto exibido, e a
    // conclusão natural da advogada é que a tela está errada.
    const ficha = semComentarios(ler("src/components/financeiro/ProcessFinancialSheet.jsx"));
    assert.match(ficha, /saldoAdiantado/, "a ficha não expõe o saldo adiantado");

    const dash = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(dash, /saldoAdiantado/, "o dashboard não explica o terceiro termo da conta");
  });

  test("os erros continuam saindo pelos helpers, nunca de `err.response` cru", () => {
    // Regra central do projeto. Repetida aqui porque as telas desta fase foram
    // reescritas, e reescrita é onde o atalho volta.
    for (const arquivo of [
      "src/pages/payments/PaymentFormPage.jsx",
      "src/pages/payments/PaymentListPage.jsx",
      "src/pages/installments/InstallmentListPage.jsx"
    ]) {
      const codigo = semComentarios(ler(arquivo));
      assert.ok(
        !/err\.response\.data/.test(codigo),
        `${arquivo} abre \`err.response.data\` direto`
      );
      assert.match(
        codigo,
        /getFinancialErrorMessage|getApiErrorMessage/,
        `${arquivo} deixou de usar os helpers de erro`
      );
    }
  });
});
