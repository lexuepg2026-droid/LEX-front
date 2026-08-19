// ═══════════════════════════════════════════════════════════════════════════
// FASE F-1b — a UX do dinheiro
//
// Duas naturezas de prova, na divisão que a suíte usa desde a 4.2:
//
//   1. FUNÇÃO PURA — as frases do extrato, do efeito do estorno e do plano de
//      alocação. Aqui há concordância, plural, casos de borda e, sobretudo, os
//      VÍNCULOS: é a regra de verdade, e é testada de verdade.
//
//   2. VARREDURA ESTÁTICA — que a tela usa essas funções, que consome os
//      campos certos do contrato e que não reintroduz os defeitos das fases
//      anteriores. Não prova pixel; prova a REGRESSÃO específica que um
//      refactor distraído causaria.
//
// ── A varredura limpa comentários ANTES de analisar ───────────────────────
// Sem isso, o comentário que EXPLICA por que o preview não é recalculado —
// citando o que não se deve fazer — derrubaria a varredura que o explica, e a
// saída óbvia seria apagar a explicação. Mesma armadilha registrada em
// `regressions/f1a1.test.js` e em `css/foco.test.js`.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  rotuloDoEvento,
  vinculoDoEvento,
  temValor,
  podeAnular,
  TIPO_EVENTO
} from "../../src/components/financeiro/statementEntry.js";
import {
  descricaoDoEfeito,
  descricaoDaAnulacao,
  parcelasSustentadas
} from "../../src/components/financeiro/reversalEffect.js";
import {
  podeConsultarPreview,
  linhasDoPlano,
  frasePlanoDaLinha,
  fraseDaSobra,
  resumoDoPlano
} from "../../src/pages/payments/allocationPreview.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ═══════════════════════════════════════════════════════════════════════════
// 1. O EXTRATO LÊ OS VÍNCULOS DO CONTRATO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b — os vínculos do extrato", () => {
  test("os sete tipos do vocabulário do backend têm rótulo legível", () => {
    // O vocabulário é FECHADO e vem de `services/statementService.js`. Um tipo
    // sem rótulo apareceria como a chave crua no meio do extrato.
    for (const tipo of Object.values(TIPO_EVENTO)) {
      const rotulo = rotuloDoEvento(tipo);
      assert.notEqual(rotulo, tipo, `\`${tipo}\` saiu sem rótulo legível`);
      assert.ok(rotulo.length > 0);
    }
  });

  test("estorno e anulação são tipos DIFERENTES, com rótulos diferentes", () => {
    // Um tira dinheiro, o outro devolve. Chamá-los pelo mesmo nome faria a
    // advogada somar na direção errada ao ler a coluna.
    assert.notEqual(
      rotuloDoEvento(TIPO_EVENTO.ESTORNO),
      rotuloDoEvento(TIPO_EVENTO.ANULACAO_ESTORNO)
    );
  });

  test("a ALOCAÇÃO diz de qual pagamento veio e para qual parcela foi", () => {
    const frase = vinculoDoEvento({
      tipo: TIPO_EVENTO.ALOCACAO,
      numeroParcela: 2,
      data: "2026-05-15T00:00:00.000Z",
      origem: "pagamento"
    });
    assert.match(frase, /pagamento/i, "diz de onde veio");
    assert.match(frase, /parcela 2/i, "diz para onde foi");
  });

  test("a alocação vinda de SALDO ADIANTADO diz que a origem é o crédito", () => {
    // É a frase que explica por que um dinheiro de meses atrás encostou numa
    // parcela criada hoje (DEC-036).
    const frase = vinculoDoEvento({
      tipo: TIPO_EVENTO.ALOCACAO,
      numeroParcela: 1,
      origem: "saldoAdiantado"
    });
    assert.match(frase, /saldo adiantado/i);
    assert.match(frase, /parcela 1/i);
  });

  test("a DESALOCAÇÃO diz por qual estorno a parcela voltou a dever", () => {
    const frase = vinculoDoEvento({
      tipo: TIPO_EVENTO.DESALOCACAO,
      numeroParcela: 3,
      motivo: "Boleto devolvido pelo banco"
    });
    assert.match(frase, /parcela 3/i);
    assert.match(frase, /estorno/i);
    assert.match(frase, /Boleto devolvido pelo banco/, "o motivo do estorno aparece");
  });

  test("o ESTORNO diz de qual pagamento saiu, e avisa quando já foi anulado", () => {
    const vivo = vinculoDoEvento({
      tipo: TIPO_EVENTO.ESTORNO,
      valorPagamento: 2500,
      motivo: "Devolvido"
    });
    assert.match(vivo, /2\.500,00/, "o valor do pagamento de origem");

    const anulado = vinculoDoEvento({
      tipo: TIPO_EVENTO.ESTORNO,
      valorPagamento: 2500,
      motivo: "Devolvido",
      anulado: true
    });
    assert.match(anulado, /anulado/i, "um estorno anulado não conta mais no líquido");
  });

  test("a ANULAÇÃO diz qual estorno desfez e qual é o efeito", () => {
    const frase = vinculoDoEvento({
      tipo: TIPO_EVENTO.ANULACAO_ESTORNO,
      valorEstornoAnulado: 1200,
      motivo: "Compensou depois"
    });
    assert.match(frase, /1\.200,00/, "o valor do estorno anulado");
    // A confirmação textual do efeito que a Parte 5 exige.
    assert.match(frase, /volta(ram)? a ser considerado recebido|recebido/i);
    assert.match(frase, /realocad/i);
  });

  test("o REPARCELAMENTO diz quantas parcelas saíram e quantas nasceram", () => {
    const frase = vinculoDoEvento({
      tipo: TIPO_EVENTO.REPARCELAMENTO,
      parcelasCanceladas: [{ numeroParcela: 1 }, { numeroParcela: 2 }],
      parcelasNovas: [{}, {}, {}]
    });
    assert.match(frase, /2 parcela/i);
    assert.match(frase, /3 nasceram|3 nova/i);
    assert.match(frase, /1, 2/, "quais saíram, pelo número");
  });

  test("a MUDANÇA DE STATUS não tem valor em dinheiro, e a tela não escreve R$ 0,00", () => {
    const evento = { tipo: TIPO_EVENTO.MUDANCA_STATUS, valor: null, de: "pendente", para: "pago" };
    assert.equal(temValor(evento), false, "sem valor, a linha não imprime número");
    assert.equal(temValor({ tipo: TIPO_EVENTO.PAGAMENTO, valor: 0 }), true, "zero é um valor");
    assert.match(vinculoDoEvento(evento), /pendente.*pago/);
  });

  test("só um estorno NÃO ANULADO pode ser anulado — a tela não oferece 409", () => {
    // As duas recusas que o backend dá: anulação de anulação e anulação dupla.
    assert.equal(podeAnular({ tipo: TIPO_EVENTO.ESTORNO, anulado: false }), true);
    assert.equal(podeAnular({ tipo: TIPO_EVENTO.ESTORNO, anulado: true }), false);
    assert.equal(podeAnular({ tipo: TIPO_EVENTO.ANULACAO_ESTORNO }), false);
    assert.equal(podeAnular({ tipo: TIPO_EVENTO.PAGAMENTO }), false);
  });

  test("parcela que não veio populada não vira \"parcela undefined\"", () => {
    const frase = vinculoDoEvento({ tipo: TIPO_EVENTO.ALOCACAO, numeroParcela: null });
    assert.doesNotMatch(frase, /undefined|null/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. O EFEITO DO ESTORNO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b — o modal de estorno diz o efeito antes de confirmar", () => {
  const pagamento = {
    valor: 2500,
    valorLiquido: 2500,
    alocacoes: [
      { numeroParcela: 1, ativa: true },
      { numeroParcela: 2, ativa: true }
    ]
  };

  test("o estorno INTEGRAL afirma que as parcelas voltam a ficar em aberto", () => {
    const frase = descricaoDoEfeito(pagamento, 2500);
    assert.match(frase, /em aberto/i);
    assert.match(frase, /parcelas 2 e 1|parcelas 1 e 2/);
  });

  test("o estorno PARCIAL não inventa o rateio — só a ordem, que é contrato", () => {
    // O rateio da desalocação é do backend (espelhado, do mais recente para o
    // mais antigo). Reproduzi-lo aqui seria a segunda fonte de verdade sobre
    // dinheiro que o preview existe para evitar.
    const frase = descricaoDoEfeito(pagamento, 800);
    assert.match(frase, /mais recente para a mais antiga/i);
    assert.doesNotMatch(frase, /800/, "a tela não afirma quanto sai de cada parcela");
  });

  test("alocação já desfeita não conta: ela não volta a ficar em aberto de novo", () => {
    const comDesfeita = {
      valor: 1000,
      valorLiquido: 1000,
      alocacoes: [
        { numeroParcela: 1, ativa: false },
        { numeroParcela: 2, ativa: true }
      ]
    };
    const sustentadas = parcelasSustentadas(comDesfeita);
    assert.equal(sustentadas.length, 1);
    assert.equal(sustentadas[0].numeroParcela, 2);
  });

  test("pagamento sem alocação diz que o valor sai do saldo adiantado", () => {
    const frase = descricaoDoEfeito({ valor: 1000, valorLiquido: 1000, alocacoes: [] }, 500);
    assert.match(frase, /saldo adiantado/i);
  });

  test("a ANULAÇÃO confirma o efeito por extenso, e que só se anula uma vez", () => {
    const frase = descricaoDaAnulacao({ valor: 2500 });
    assert.match(frase, /2\.500,00/);
    assert.match(frase, /recebido/i, "o valor volta a ser considerado recebido");
    assert.match(frase, /realocad/i);
    assert.match(frase, /uma vez/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. O PREVIEW DE ALOCAÇÃO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b — o preview vem da API e é apenas formatado", () => {
  const preview = {
    destinos: [
      { parcelaId: "a", numeroParcela: 3, valor: 2000, quita: true, dataVencimento: "2026-07-15T00:00:00.000Z" },
      { parcelaId: "b", numeroParcela: 4, valor: 1000, quita: false }
    ],
    sobra: 0
  };

  test("enquanto o valor está incompleto NÃO se consulta — e o bloco não aparece", () => {
    // No espírito do `"—"` da 4.3: um preview de zero reais afirmaria que nada
    // vai acontecer, o que é diferente de "ainda não sei".
    assert.equal(podeConsultarPreview("", 100), false, "sem honorário");
    assert.equal(podeConsultarPreview("id", 0), false, "valor zero");
    assert.equal(podeConsultarPreview("id", null), false, "valor vazio");
    assert.equal(podeConsultarPreview("id", -5), false, "valor negativo");
    assert.equal(podeConsultarPreview("id", 150), true);
  });

  test("a linha diz o que QUITA e o que ABATE, com o valor de cada parcela", () => {
    const linhas = linhasDoPlano(preview);
    assert.equal(linhas.length, 2);
    assert.match(frasePlanoDaLinha(linhas[0]), /Parcela 3/);
    assert.match(frasePlanoDaLinha(linhas[0]), /quita/i);
    assert.match(frasePlanoDaLinha(linhas[1]), /abate/i);
    assert.match(frasePlanoDaLinha(linhas[0]), /2\.000,00/);
  });

  test("o REALIZADO usa o mesmo formatador do previsto", () => {
    // `alocacoes` (201) e `destinos` (preview) passam pela mesma função: dois
    // formatadores poderiam discordar sobre números que precisam bater.
    const realizado = { alocacoes: [{ parcelaId: "a", numeroParcela: 3, valor: 2000 }], sobra: 0 };
    const linhas = linhasDoPlano(realizado);
    assert.equal(linhas.length, 1);
    // `\s` e não um espaço literal: o `Intl` separa "R$" do número com espaço
    // NÃO-QUEBRÁVEL (U+00A0), e um espaço comum no padrão nunca casaria.
    assert.match(frasePlanoDaLinha(linhas[0]), /Parcela 3: R\$\s2\.000,00/);
    // Sem `quita` no contrato do 201, a tela não afirma que quitou.
    assert.equal(linhas[0].efeito, null);
  });

  test("ADIANTAMENTO SEM PARCELAS: o valor inteiro fica como crédito, e a frase diz quando será usado", () => {
    const frase = fraseDaSobra({ destinos: [], sobra: 2000 });
    assert.match(frase, /saldo adiantado/i);
    assert.match(frase, /quando as parcelas forem criadas/i);
    assert.equal(resumoDoPlano({ destinos: [], sobra: 2000 }), "O valor inteiro fica como saldo adiantado.");
  });

  test("sem sobra não há frase de sobra — nada de \"R$ 0,00 sobram\"", () => {
    assert.equal(fraseDaSobra(preview), null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. VARREDURAS — a tela usa o que foi testado acima
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b — varreduras estáticas", () => {
  test("a página do honorário existe e está roteada em /dashboard/honorarios/:id", () => {
    const rotas = semComentarios(ler("src/routes/AppRoutes.jsx"));
    assert.match(rotas, /path="honorarios\/:id"/, "a rota da página nova");
    assert.match(rotas, /FeeDetailPage/, "e o componente dela");
    // As rotas estáticas continuam antes: `novo` não pode ser capturado por
    // `:id`.
    assert.ok(
      rotas.indexOf('path="honorarios/novo"') < rotas.indexOf('path="honorarios/:id"'),
      "`novo` é declarada antes de `:id`"
    );
  });

  test("a página consome os campos que a F-1b acrescentou ao contrato", () => {
    const pagina = ler("src/pages/fees/FeeDetailPage.jsx");
    for (const campo of ["totais", "cliente", "parcelas", "contagemParcelas"]) {
      assert.match(pagina, new RegExp(campo), `a página lê \`${campo}\``);
    }
    // Os quatro números da DEC-040, cada um pelo nome do contrato.
    for (const chave of ["contratado", "pago", "emAberto", "saldoAdiantado"]) {
      assert.match(pagina, new RegExp(`totais[?.]*\\.${chave}|totais\\?\\.${chave}`),
        `exibe \`totais.${chave}\``);
    }
  });

  test("a página NÃO soma nada: os totais vêm calculados do backend", () => {
    const codigo = semComentarios(ler("src/pages/fees/FeeDetailPage.jsx"));
    assert.doesNotMatch(codigo, /\.reduce\s*\(/, "somar na tela abriria a segunda fonte de verdade (DEC-040)");
  });

  test("o crédito é exibido À PARTE, com nome próprio", () => {
    const pagina = ler("src/pages/fees/FeeDetailPage.jsx");
    assert.match(pagina, /Saldo adiantado/, "o crédito aparece nomeado, nunca dentro de recebido");
  });

  test("o status sai pelo statusVisual, nunca por classe montada à mão", () => {
    const codigo = semComentarios(ler("src/pages/fees/FeeDetailPage.jsx"));
    assert.match(codigo, /StatusBadge/, "o badge é o componente do projeto");
    assert.doesNotMatch(codigo, /className={`status-[^`]*\$\{/, "nada de classe de status montada por template");
  });

  test("o extrato usa as funções de vínculo, e não monta a frase no JSX", () => {
    const codigo = semComentarios(ler("src/components/financeiro/FeeStatement.jsx"));
    assert.match(codigo, /vinculoDoEvento/, "o vínculo sai da função pura");
    assert.match(codigo, /rotuloDoEvento/);
    assert.match(codigo, /temValor/);
  });

  test("o extrato tem estado vazio com frase própria, nunca tabela em branco", () => {
    const codigo = ler("src/components/financeiro/FeeStatement.jsx");
    assert.match(codigo, /EmptyState/);
    assert.match(codigo, /Nenhuma movimentação registrada/);
  });

  test("o extrato pagina pelo contrato do backend (page/limit da F-0)", () => {
    const codigo = semComentarios(ler("src/components/financeiro/FeeStatement.jsx"));
    assert.match(codigo, /page:/, "manda `page`");
    assert.match(codigo, /limit:/, "e `limit`");
    assert.match(codigo, /Carregar mais/, "o padrão honesto declarado para esta fase");
  });

  test("o preview vem da API e NÃO é recalculado na tela", () => {
    const codigo = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(codigo, /preverAlocacao/, "o plano vem de POST /payments/preview");
    // O que caracterizaria o recálculo: a tela varrendo parcelas para decidir
    // sozinha para onde o dinheiro vai.
    assert.doesNotMatch(codigo, /\.sort\s*\(\s*\(.*dataVencimento/, "a tela não ordena parcelas por vencimento");
    assert.doesNotMatch(codigo, /emAberto\s*-\s*|restante/, "a tela não distribui valor entre parcelas");

    const helper = semComentarios(ler("src/pages/payments/allocationPreview.js"));
    assert.doesNotMatch(helper, /\.sort\s*\(/, "o formatador não reordena o plano");
    assert.doesNotMatch(helper, /Math\.min|Math\.max/, "o formatador não decide quanto cabe em cada parcela");
  });

  test("o preview tem debounce e não remonta o formulário (o foco da F-1a.1)", () => {
    const codigo = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(codigo, /setTimeout/, "há debounce");
    assert.match(codigo, /clearTimeout/, "e ele é limpo no cleanup");
    // A causa da perda de foco: trocar a árvore por `<Loading/>` num return
    // antecipado disparado por estado que muda a cada tecla.
    assert.doesNotMatch(
      codigo,
      /if\s*\(\s*previewCarregando\s*\)\s*(\{\s*)?return\s+</,
      "o carregamento do preview NUNCA substitui o formulário"
    );
  });

  test("o modal de estorno envia motivo e lê campo/mensagem pelos helpers", () => {
    const codigo = semComentarios(ler("src/components/financeiro/ReversalModal.jsx"));
    assert.match(codigo, /motivo/, "manda o motivo");
    assert.match(codigo, /getApiErrorField/, "o campo vem do helper");
    assert.match(codigo, /getFinancialErrorMessage|getApiErrorMessage/, "a mensagem também");
    // A regra do projeto desde a 2E.1: nenhuma tela abre o corpo da resposta.
    assert.doesNotMatch(codigo, /err\.response\.data/, "não abre `err.response` por conta própria");
    assert.doesNotMatch(codigo, /estornavel\s*[:=]/, "não reescreve a mensagem do 422");
  });

  test("a anulação não oferece campo de valor — não existe anulação parcial", () => {
    const codigo = semComentarios(ler("src/components/financeiro/ReversalModal.jsx"));
    assert.match(codigo, /ehAnulacao/, "a tela distingue os dois modos");
    assert.match(codigo, /!ehAnulacao && \(/, "o campo de valor é exclusivo do estorno");
  });

  test("o pagamento estornado integralmente não deixa buraco silencioso", () => {
    const codigo = ler("src/pages/payments/PaymentListPage.jsx");
    // ── O que mudou na F-1b.2, e por que a asserção mudou junto ───────────
    // A F-1b escreveu "estornado integralmente — sem recibo" na coluna de
    // AÇÕES porque não havia badge; o badge era escopo declarado da fase
    // seguinte. Agora ele existe (`statusVisual.estornado_integralmente`) e
    // mora na coluna do valor, que é onde o fato acontece — repetir a mesma
    // frase duas vezes na mesma linha seria ruído.
    //
    // O que este teste protege continua idêntico: a linha NÃO pode ficar com
    // uma célula vazia onde as outras têm botão. Hoje ela tem as duas coisas —
    // o badge dizendo o que houve, e a nota dizendo por que não há recibo.
    assert.match(codigo, /estornadoIntegralmente\(p\)/, "a linha reconhece o caso");
    assert.match(codigo, /status="estornado_integralmente"/, "e exibe o badge do statusVisual");
    assert.match(codigo, /sem recibo/, "a ausência do botão continua explicada por escrito");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. O NOME DO HONORÁRIO É SEMPRE UM LINK (Parte 6)
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b — o nome do honorário leva à página dele", () => {
  // O mapeamento da Parte 1: TODA tela em que o nome/descrição do honorário
  // aparece como texto. Os `<option>` dos formulários ficam de fora e é
  // deliberado — HTML não permite link dentro de `<option>`, e a seleção JÁ
  // leva ao honorário por outro caminho.
  const PONTOS = [
    ["src/pages/fees/FeeListPage.jsx", "listagem de honorários"],
    ["src/pages/installments/InstallmentListPage.jsx", "listagem de parcelas"],
    ["src/pages/payments/PaymentListPage.jsx", "listagem de pagamentos"],
    ["src/components/financeiro/ProcessFinancialSheet.jsx", "ficha do processo"],
    ["src/pages/dashboard/DashboardHomePage.jsx", "dashboard"],
    ["src/pages/payments/PaymentFormPage.jsx", "formulário de pagamento (modo edição)"]
  ];

  for (const [arquivo, onde] of PONTOS) {
    test(`${onde}: o nome do honorário aponta para /dashboard/honorarios/`, () => {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo,
        /to=\{`\/dashboard\/honorarios\/\$\{/,
        `${arquivo} deveria linkar o nome do honorário para a página dele`
      );
    });
  }

  test("a página do honorário não é beco sem saída: leva ao processo e ao cliente", () => {
    const codigo = semComentarios(ler("src/pages/fees/FeeDetailPage.jsx"));
    assert.match(codigo, /\/dashboard\/processos\/detalhe\//, "link para o processo");
    assert.match(codigo, /\/dashboard\/clientes\/detalhe\//, "link para o cliente");
    assert.match(codigo, /\/dashboard\/parcelas\/editar\//, "e cada parcela leva ao formulário dela");
  });

  test("\"Registrar pagamento\" chega com o honorário pré-selecionado", () => {
    const pagina = semComentarios(ler("src/pages/fees/FeeDetailPage.jsx"));
    assert.match(pagina, /pagamentos\/novo\?honorarioId=/, "a página manda o honorário na URL");

    const form = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(form, /searchParams\.get\('honorarioId'\)/, "e o formulário o lê");
  });

  test("\"Reparcelar\" está desabilitado COM explicação de que chega na F-1c", () => {
    const pagina = ler("src/pages/fees/FeeDetailPage.jsx");
    assert.match(pagina, /Reparcelar/);
    assert.match(pagina, /disabled/);
    assert.match(pagina, /F-1c/, "a explicação diz quando chega");
  });

  test("não há item de menu novo: a página se alcança pelos links", () => {
    const sidebar = semComentarios(ler("src/components/layout/Sidebar.jsx"));
    assert.doesNotMatch(
      sidebar,
      /honorarios\/[^"'`\s]*\$\{|honorarios\/detalhe/,
      "a página do honorário não vira entrada de menu"
    );
  });

  test("a trilha do cabeçalho mostra a descrição, não \"Detalhe\"", () => {
    const header = semComentarios(ler("src/components/layout/Header.jsx"));
    assert.match(header, /useBreadcrumbLabel/, "o cabeçalho lê o rótulo publicado");
    assert.match(header, /rotuloDaPagina \|\| action/, "e ele substitui o genérico");

    const pagina = semComentarios(ler("src/pages/fees/FeeDetailPage.jsx"));
    assert.match(pagina, /usePublicarBreadcrumb/, "a página publica o próprio nome");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. MOEDA NUNCA TRUNCA (regra nova da F-1b)
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b — nas telas desta fase, valor em reais não é cortado", () => {
  // As folhas escritas nesta fase. A regra: onde há valor em reais, ou o
  // número sai inteiro, ou a coluna cede espaço — nunca reticências.
  const FOLHAS = [
    "src/pages/fees/FeeDetailPage.css",
    "src/components/financeiro/FeeStatement.css",
    "src/components/financeiro/ReversalModal.css",
    "src/pages/payments/PaymentFormPage.css"
  ];

  // As classes que exibem dinheiro nas telas desta fase.
  const CLASSES_DE_MOEDA = [
    "honorario-total__valor",
    "extrato__valor",
    "plano__resumo",
    "plano__linha"
  ];

  for (const folha of FOLHAS) {
    test(`${folha.split("/").pop()} não corta valor com reticências`, () => {
      const css = ler(folha);
      // `text-overflow: ellipsis` é o mecanismo exato do truncamento que a
      // coluna Líquido sofre hoje ("R$ 3.50…") e que a F-1b.2 vai corrigir nas
      // listagens. Nas telas desta fase ele não pode existir.
      assert.doesNotMatch(
        css.replace(/\/\*[\s\S]*?\*\//g, ""),
        /text-overflow\s*:\s*ellipsis/,
        `${folha} trunca texto — e nesta fase há valor em reais nessas regras`
      );
    });
  }

  test("as classes de dinheiro têm regra e não são truncadas em lugar nenhum", () => {
    const todoCss = FOLHAS.map(ler).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const classe of CLASSES_DE_MOEDA) {
      assert.match(todoCss, new RegExp(`\\.${classe}\\b`), `\`.${classe}\` precisa de regra`);
    }
    // O par que garante o número inteiro no cabeçalho e no extrato.
    assert.match(todoCss, /\.honorario-total__valor\s*\{[^}]*white-space:\s*nowrap/,
      "o total do cabeçalho não quebra nem corta");
    assert.match(todoCss, /\.extrato__valor\s*\{[^}]*white-space:\s*nowrap/,
      "o valor do extrato não quebra nem corta");
  });

  test("a listagem de honorários NÃO ficou com o link dentro de célula truncada sem title", () => {
    // `cell-truncate` continua valendo para a DESCRIÇÃO (texto livre, sem
    // teto), e o `title` é o que devolve o texto inteiro. O que a regra nova
    // proíbe é truncar MOEDA — a descrição pode.
    const codigo = ler("src/pages/fees/FeeListPage.jsx");
    assert.match(codigo, /title=\{fee\.descricao\}/, "a descrição truncada mantém o title");
  });
});
