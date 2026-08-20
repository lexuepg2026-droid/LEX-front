// ═══════════════════════════════════════════════════════════════════════════
// FASE F-1b.3 — ACHAR O LANÇAMENTO (frontend)
//
// ── O que dá para provar sem DOM, e o que não dá ─────────────────────────
// A suíte é `node --test` sem renderizador (decisão da Fase 2E.2). Não há como
// provar por script que o foco permanece no input, que o menu devolve o foco
// ao gatilho ou que nenhuma ação ficou fora da tela em 360 px — isso exige
// árvore montada, evento disparado e `document.activeElement`.
//
// O que dá para provar são as CAUSAS, que são estruturais:
//   • nenhuma listagem com filtro troca a própria árvore por `<Loading/>` num
//     `return` antecipado (a causa da perda de foco — regressão do passo 155);
//   • o paginador não tem estado próprio de filtro, e mudar filtro volta à
//     página 1 (a conta vive num hook só, e o hook é testado como função);
//   • o menu registra `keydown`/Escape e devolve o foco ao gatilho;
//   • nenhuma coluna de moeda ganhou truncamento (regressão da F-1b.2).
//
// E as FUNÇÕES PURAS, que são testadas como funções: as contas do paginador,
// os presets de período, a frase do recorte e a identidade do pagamento
// (DEC-045).
//
// O resto está no roteiro, a partir do passo 172.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { resumoDaPagina, frasePosicao } from "../../src/components/ui/paginacao.js";
import {
  PRESETS_PERIODO,
  intervaloDoPreset,
  descricaoDoPeriodo
} from "../../src/components/ui/periodo.js";
import { descricaoDoRecorteFinanceiro } from "../../src/components/financeiro/filterSummary.js";
import {
  identidadeDoPagamento,
  referenciaDaLinhaDePagamento,
  vinculoDoEvento
} from "../../src/components/financeiro/statementEntry.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// As três listagens financeiras que esta fase reescreveu. O rótulo é o do
// paginador e está no SINGULAR desde a F-1b.3.1 — a concordância passou a ser
// de `pluralizar`, e era o plural fixo aqui que escrevia "1 parcelas".
const LISTAGENS_FINANCEIRAS = [
  ["src/pages/payments/PaymentListPage.jsx", "pagamento"],
  ["src/pages/installments/InstallmentListPage.jsx", "parcela"],
  ["src/pages/fees/FeeListPage.jsx", "honorário"]
];

// ═══════════════════════════════════════════════════════════════════════════
// 1 — AS CONTAS DO PAGINADOR
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3 — as contas do paginador", () => {
  test("a posição do primeiro e do último item da página", () => {
    const p1 = resumoDaPagina({ page: 1, limit: 20, total: 137 });
    assert.equal(p1.primeiro, 1);
    assert.equal(p1.ultimo, 20);
    assert.equal(p1.totalPages, 7);
    assert.equal(p1.temAnterior, false, "não há página antes da primeira");
    assert.equal(p1.temProxima, true);

    // O off-by-one clássico: a última página, que não é cheia.
    const p7 = resumoDaPagina({ page: 7, limit: 20, total: 137 });
    assert.equal(p7.primeiro, 121);
    assert.equal(p7.ultimo, 137, "o último item é o total, não `page * limit`");
    assert.equal(p7.temProxima, false, "não há página depois da última");
  });

  test("conjunto vazio tem UMA página, e não zero", () => {
    const vazio = resumoDaPagina({ page: 1, limit: 20, total: 0 });
    assert.equal(vazio.totalPages, 1, "`página 1 de 0` não é uma posição em que se possa estar");
    assert.equal(vazio.primeiro, 0);
    assert.equal(vazio.ultimo, 0);
    assert.equal(vazio.temAnterior, false);
    assert.equal(vazio.temProxima, false);
  });

  test("página além do fim é presa no fim — o caso de filtrar depois de navegar", () => {
    const presa = resumoDaPagina({ page: 9, limit: 20, total: 25 });
    assert.equal(presa.page, 2, "a pessoa está na página 2, e é o que a tela tem de dizer");
    assert.equal(presa.ultimo, 25);
  });

  test("a frase de posição diz o intervalo e o total", () => {
    assert.match(frasePosicao(resumoDaPagina({ page: 2, limit: 20, total: 137 }), "pagamentos"),
      /21–40 de 137 pagamentos/);
    assert.match(frasePosicao(resumoDaPagina({ total: 0 }), "pagamentos"), /Nenhum resultado/);
    assert.match(frasePosicao(resumoDaPagina({ total: 1 }), "pagamento"), /^1 pagamento$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — OS PRESETS DE PERÍODO
//
// `agora` é injetado: um teste de data que só passa no mês em que foi escrito
// é um teste que quebra em silêncio no mês seguinte.
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3 — os presets de período", () => {
  const agosto = new Date(Date.UTC(2026, 7, 19));

  test("mês atual é do primeiro ao último dia do mês", () => {
    assert.deepEqual(
      intervaloDoPreset(PRESETS_PERIODO.MES_ATUAL, agosto),
      { de: "2026-08-01", ate: "2026-08-31" }
    );
  });

  test("últimos 6 meses CONTAM o mês corrente", () => {
    assert.deepEqual(
      intervaloDoPreset(PRESETS_PERIODO.ULTIMOS_6_MESES, agosto),
      { de: "2026-03-01", ate: "2026-08-31" }
    );
  });

  test("o último dia do mês sai do calendário, não de uma tabela", () => {
    // Fevereiro de 2028 é bissexto. Uma tabela 28/30/31 erraria aqui, e erraria
    // em silêncio — devolvendo uma lista curta com cara de completa.
    const fevereiroBissexto = new Date(Date.UTC(2028, 1, 10));
    assert.equal(intervaloDoPreset(PRESETS_PERIODO.MES_ATUAL, fevereiroBissexto).ate, "2028-02-29");

    const fevereiroComum = new Date(Date.UTC(2026, 1, 10));
    assert.equal(intervaloDoPreset(PRESETS_PERIODO.MES_ATUAL, fevereiroComum).ate, "2026-02-28");
  });

  test("`todos` e `personalizado` não inventam intervalo", () => {
    assert.deepEqual(intervaloDoPreset(PRESETS_PERIODO.TODOS, agosto), {});
    assert.deepEqual(intervaloDoPreset(PRESETS_PERIODO.PERSONALIZADO, agosto), {});
  });

  test("a descrição do período fala português, com a data na ordem brasileira", () => {
    assert.equal(descricaoDoPeriodo(PRESETS_PERIODO.MES_ATUAL), "neste mês");
    assert.equal(
      descricaoDoPeriodo(PRESETS_PERIODO.PERSONALIZADO, { de: "2026-06-01", ate: "2026-06-30" }),
      "entre 01/06/2026 e 30/06/2026"
    );
    assert.equal(
      descricaoDoPeriodo(PRESETS_PERIODO.PERSONALIZADO, { de: "2026-06-01" }),
      "a partir de 01/06/2026"
    );
    assert.equal(descricaoDoPeriodo(PRESETS_PERIODO.TODOS), null, "sem recorte, sem frase");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — A FRASE QUE DIZ O QUE ESTÁ FILTRANDO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3 — o estado vazio diz o RECORTE", () => {
  const honorarios = [{ _id: "abc", descricao: "Honorários advocatícios — execução fiscal" }];

  test("nomeia busca, honorário e período, nessa ordem", () => {
    const frase = descricaoDoRecorteFinanceiro({
      filtros: { honorarioId: "abc", preset: PRESETS_PERIODO.MES_ATUAL },
      busca: "pix",
      honorarios
    });
    assert.match(frase, /com "pix"/);
    assert.match(frase, /execução fiscal/);
    assert.match(frase, /neste mês$/, "o período fecha a frase");
  });

  test("sem filtro nenhum, frase nenhuma", () => {
    assert.equal(descricaoDoRecorteFinanceiro({ filtros: { preset: PRESETS_PERIODO.TODOS } }), "");
  });

  test("honorário fora da lista do seletor não é INVENTADO", () => {
    // O seletor carrega 100 honorários; o filtro pode ter vindo de um link.
    // "para este honorário" é menos preciso e continua verdadeiro.
    const frase = descricaoDoRecorteFinanceiro({
      filtros: { honorarioId: "id-que-nao-esta-na-lista" },
      honorarios
    });
    assert.match(frase, /para este honorário/);
    assert.doesNotMatch(frase, /undefined/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 — DEC-045: O VÍNCULO SE LÊ POR VALOR E FORMA
//
// O caso do passo 166, refeito como função pura.
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3 — DEC-045: a referência do pagamento", () => {
  // Os DOIS ids do caso real: `...e66b7a` e `...e66b7c`. Diferem no último
  // caractere, porque os últimos bytes do ObjectId são um contador.
  const ID_A = "68a1b2c3d4e5e66b7a";
  const ID_B = "68a1b2c3d4e5e66b7c";

  const alocacaoDe = (pagamentoId, valorPagamento, formaPagamento) => ({
    tipo: "alocacao",
    pagamentoId,
    valorPagamento,
    formaPagamento,
    dataPagamento: "2026-06-10T00:00:00.000Z",
    numeroParcela: 2
  });

  test("a frase nomeia o pagamento por VALOR e FORMA, além da data", () => {
    const frase = vinculoDoEvento(alocacaoDe(ID_A, 300, "dinheiro"));
    assert.match(frase, /R\$\s*300,00/, "o valor, que é o que a advogada procura");
    assert.match(frase, /em dinheiro/, "e a forma, que separa dois valores iguais");
    assert.match(frase, /10\/06\/2026/, "a data continua situando a linha");
    assert.match(frase, /aplicado na parcela 2/);
  });

  test("dois pagamentos do mesmo dia se distinguem SEM depender do id", () => {
    const emDinheiro = vinculoDoEvento(alocacaoDe(ID_A, 300, "dinheiro"));
    const emPix = vinculoDoEvento(alocacaoDe(ID_B, 750, "pix"));

    assert.notEqual(emDinheiro, emPix);

    // A prova de que a distinção NÃO vem do id: apagando os sufixos das duas
    // frases, elas continuam diferentes. Era exatamente isto que a referência
    // da DEC-044 não conseguia — `#e66b7a` e `#e66b7c` diferem no último
    // caractere, e ninguém casa isso de relance.
    const semId = (frase) => frase.replace(/#[0-9a-f]{6}/gi, "");
    assert.notEqual(
      semId(emDinheiro),
      semId(emPix),
      "sem o id, as duas frases voltaram a ser iguais — a DEC-045 não foi aplicada"
    );
  });

  test("o caso DEGENERADO continua desempatado pelo id", () => {
    // Mesmo valor, mesma forma, mesmo dia: duas notas de R$ 300 entregues no
    // mesmo dia é um caso real, e é por isso que o sufixo não saiu da frase.
    const a = vinculoDoEvento(alocacaoDe(ID_A, 300, "dinheiro"));
    const b = vinculoDoEvento(alocacaoDe(ID_B, 300, "dinheiro"));
    assert.notEqual(a, b, "o id continua sendo o desempate do caso degenerado");
    assert.match(a, /#e66b7a/);
    assert.match(b, /#e66b7c/);
  });

  test("a linha do PAGAMENTO e a do vínculo se casam — é a mesma identidade", () => {
    const linha = referenciaDaLinhaDePagamento({
      tipo: "pagamento",
      pagamentoId: ID_A,
      valor: 300,
      formaPagamento: "dinheiro",
      data: "2026-06-10T00:00:00.000Z"
    });
    const vinculo = vinculoDoEvento(alocacaoDe(ID_A, 300, "dinheiro"));

    assert.ok(
      vinculo.includes(linha),
      `a frase do vínculo (${vinculo}) precisa conter a mesma identidade que a ` +
      `linha do pagamento exibe (${linha}) — dois formatos para a mesma coisa ` +
      "não seriam referência"
    );
  });

  test("sem valor no contrato, a frase NÃO escreve R$ 0,00", () => {
    // Alocação de saldo adiantado não tem pagamento por trás. Inventar um valor
    // ali afirmaria um pagamento que não aconteceu.
    const deSaldo = vinculoDoEvento({
      tipo: "alocacao",
      origem: "saldoAdiantado",
      numeroParcela: 3
    });
    assert.match(deSaldo, /De saldo adiantado/);
    assert.doesNotMatch(deSaldo, /R\$\s*0,00/);

    assert.doesNotMatch(
      identidadeDoPagamento({ data: "2026-06-10T00:00:00.000Z", pagamentoId: ID_A }),
      /R\$/,
      "sem valor, a identidade cai para data e id — o formato da DEC-044"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 — AS REGRESSÕES ESTRUTURAIS
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3 — o paginador não perde os filtros", () => {
  test("as três listagens têm paginador e passam a página do estado", () => {
    for (const [arquivo, rotulo] of LISTAGENS_FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /<Paginador/, `${arquivo}: sem paginador`);
      assert.match(codigo, /page=\{page\}/, `${arquivo}: o paginador precisa ler a página do estado`);
      assert.match(
        codigo, /onMudarPagina=\{setPage\}/,
        `${arquivo}: trocar de página tem de mexer no MESMO estado que a consulta lê`
      );
      assert.match(
        codigo, new RegExp(`rotulo="${rotulo}"`),
        `${arquivo}: o rótulo do paginador é o SINGULAR do item (F-1b.3.1)`
      );
    }
  });

  test("a página é parâmetro da consulta, junto dos filtros", () => {
    // É isto que faz trocar de página não perder filtro nem busca: a página é
    // mais um campo do mesmo objeto de consulta, e não um estado paralelo.
    for (const [arquivo] of LISTAGENS_FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /\n\s*page,\n/, `${arquivo}: a consulta precisa mandar a página`);
      assert.match(
        codigo, /busca:\s*buscaDebounced\s*\|\|\s*undefined/,
        `${arquivo}: a busca precisa continuar na consulta quando a página muda`
      );
    }
  });

  test("mudar filtro volta à página 1 — num lugar só", () => {
    // A regra vive no hook, e não copiada nas três telas: a terceira tela a ser
    // escrita copia a segunda e esquece o `setPage(1)`.
    const hook = semComentarios(ler("src/hooks/useListFilters.js"));

    const definir = hook.slice(hook.indexOf("const definirFiltro"));
    assert.match(
      definir.slice(0, 300), /setPage\(1\)/,
      "mudar filtro tem de voltar à página 1 — senão a pessoa cai numa página " +
      "vazia sem entender por quê"
    );

    const preset = hook.slice(hook.indexOf("const aplicarPreset"));
    assert.match(preset.slice(0, 500), /setPage\(1\)/, "trocar o preset também");

    const limpar = hook.slice(hook.indexOf("const limpar"));
    assert.match(limpar.slice(0, 400), /setPage\(1\)/, "limpar os filtros também");

    // E as três telas usam o hook, em vez de reescrever o estado à mão.
    for (const [arquivo] of LISTAGENS_FINANCEIRAS) {
      assert.match(
        semComentarios(ler(arquivo)), /useListFilters\(/,
        `${arquivo}: o estado dos filtros precisa vir do hook que carrega a regra`
      );
    }
  });
});

describe("F-1b.3 — a regressão do passo 155: o foco da busca", () => {
  test("nenhuma listagem com filtro tem `return <Loading/>` antecipado", () => {
    // A mesma varredura de `f1a1.test.js`, repetida aqui sobre as telas que
    // esta fase REESCREVEU — é numa reescrita que o padrão volta.
    const returnAntecipado = /if\s*\(\s*!?\s*\w*[Ll]oading\w*\s*\)\s*(\{\s*)?return\s+</;

    for (const [arquivo] of LISTAGENS_FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.ok(
        !returnAntecipado.test(codigo),
        `${arquivo} voltou a trocar a árvore inteira por <Loading/>. Isso desmonta ` +
        "os controles de filtro a cada consulta, e o foco do input se perde."
      );
      assert.match(
        codigo, /\{\s*loading\s*\?\s*\(?\s*<Loading/,
        `${arquivo}: o carregamento precisa continuar sendo exibido, dentro do JSX`
      );
    }
  });

  test("a barra de filtros é um componente de módulo, e não uma função aninhada", () => {
    // Um componente declarado DENTRO do render do pai é um tipo novo a cada
    // consulta: o React desmonta e remonta a árvore inteira dele, e o input
    // perde o foco — o mesmo defeito do `return` antecipado, por outra porta.
    for (const [arquivo] of LISTAGENS_FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /<FinancialFilters/,
        `${arquivo}: a barra de filtros precisa ser o componente compartilhado`
      );
      assert.ok(
        !/function\s+FinancialFilters/.test(codigo),
        `${arquivo}: declarou a barra dentro da página — ela precisa vir de fora`
      );
    }

    const barra = semComentarios(ler("src/components/financeiro/FinancialFilters.jsx"));
    assert.match(barra, /^function FinancialFilters/m, "a barra é declarada no escopo do módulo");
  });

  test("ninguém contorna o defeito com autoFocus ou .focus() na listagem", () => {
    for (const [arquivo] of LISTAGENS_FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.ok(!/autoFocus/.test(codigo), `${arquivo} usa autoFocus`);
      assert.ok(!/\.focus\(\)/.test(codigo), `${arquivo} chama .focus() — trate a causa`);
    }
    const barra = semComentarios(ler("src/components/financeiro/FinancialFilters.jsx"));
    assert.ok(!/autoFocus/.test(barra), "a barra de filtros usa autoFocus");
    assert.ok(!/\.focus\(\)/.test(barra), "a barra de filtros rouba o foco");
  });
});

describe("F-1b.3 — o menu de ações", () => {
  const menu = semComentarios(ler("src/components/ui/ActionMenu.jsx"));

  test("fecha com Esc", () => {
    assert.match(menu, /addEventListener\(\s*["']keydown["']/, "escuta o teclado");
    assert.match(menu, /["']Escape["']/, "e reconhece o Esc — a mesma tecla do Modal do projeto");
    assert.match(
      menu, /removeEventListener\(\s*["']keydown["']/,
      "e solta o ouvinte: numa tabela de trinta linhas, trinta ouvintes vazados"
    );
  });

  test("fecha com clique fora, por `mousedown`", () => {
    // `click` não serve: um item que navega desmonta a linha antes de o evento
    // chegar ao documento, e o menu ficaria aberto sobre a tela seguinte.
    assert.match(menu, /addEventListener\(\s*["']mousedown["']/);
    assert.match(menu, /contains\(/, "compara o alvo com a raiz do menu");
  });

  test("devolve o foco ao botão que o abriu", () => {
    assert.match(menu, /gatilhoRef/, "guarda a referência do gatilho");
    assert.match(
      menu, /gatilhoRef\.current\?\.focus\(\)/,
      "sem a devolução, quem navega por teclado é jogado para o início do documento"
    );
    // E não rouba o foco na montagem: em trinta linhas, seriam trinta roubos.
    assert.match(menu, /abriuAlgumaVez/, "a devolução é condicionada a ter sido aberto");
  });

  test("é um botão de verdade, com o estado anunciado", () => {
    assert.match(menu, /aria-haspopup="menu"/);
    assert.match(menu, /aria-expanded=\{aberto\}/);
    assert.match(menu, /role="menu"/);
    assert.match(menu, /role="menuitem"/);
    assert.match(menu, /type="button"/, "botão sem `type` dentro de form submete o form");
  });

  test("não apaga o anel de foco", () => {
    const css = ler("src/components/ui/ActionMenu.css").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(
      !/outline\s*:\s*none/.test(css),
      "o anel de foco vem da regra global; apagá-lo dentro de `:focus-visible` " +
      "foi exatamente o defeito que a 4.5 mediu"
    );
  });

  test("ação destrutiva é visualmente distinta", () => {
    assert.match(menu, /destrutivo/, "o componente conhece a distinção");
    const css = ler("src/components/ui/ActionMenu.css");
    assert.match(
      css, /\.action-menu__item--destrutivo\s*\{/,
      "a classe aplicada precisa ter regra"
    );
    assert.match(css, /--color-danger/, "e a regra precisa usar a cor de perigo do tema");
  });

  test("as três listagens usam o menu, e a coluna tem largura de um botão", () => {
    for (const [arquivo] of LISTAGENS_FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /<ActionMenu/, `${arquivo}: as ações continuam soltas na célula`);
      assert.match(
        codigo, /col-acoes-menu/,
        `${arquivo}: a coluna precisa ter a largura do menu, e não a da fileira de botões`
      );
    }
    assert.match(
      ler("src/styles/modules.css"), /\.col-acoes-menu\s*\{/,
      "a classe aplicada precisa ter regra"
    );
  });

  test("a nota `sem recibo` NÃO foi escondida dentro do menu", () => {
    // Ela é EXPLICAÇÃO, não ação: escondê-la devolveria o buraco silencioso que
    // a F-1b fechou, com um passo a mais — a advogada teria de abrir um menu
    // para descobrir por que falta um botão.
    const codigo = semComentarios(ler("src/pages/payments/PaymentListPage.jsx"));
    const posNota = codigo.indexOf("sem-recibo");
    const posMenu = codigo.indexOf("<ActionMenu");
    assert.ok(posNota > 0, "a nota sumiu da listagem");
    assert.ok(posMenu > 0, "o menu sumiu da listagem");
    assert.ok(
      posNota < posMenu,
      "a nota `sem recibo` foi parar dentro do menu — ela é explicação, não ação"
    );
  });
});

describe("F-1b.3 — a regressão da F-1b.2: moeda nunca trunca", () => {
  test("nenhuma célula de moeda ganhou `cell-truncate`", () => {
    // A regra da F-1b.2: coluna de dinheiro usa `.col-money` e NUNCA recebe
    // `cell-truncate`. Valor cortado é pior que valor ausente — "R$ 3.50…"
    // parece um número e é lido como um.
    for (const [arquivo] of LISTAGENS_FINANCEIRAS) {
      const codigo = ler(arquivo);
      for (const celula of codigo.matchAll(/className="[^"]*cell-num[^"]*"/g)) {
        assert.ok(
          !celula[0].includes("cell-truncate"),
          `${arquivo}: célula de dinheiro com truncamento — ${celula[0]}`
        );
      }
    }
  });

  test("as larguras da F-1b.2 continuam declaradas", () => {
    const css = ler("src/styles/modules.css");
    assert.match(css, /\.col-money\s*\{\s*width:\s*150px/, "a coluna de dinheiro encolheu");
    assert.match(css, /\.col-data\s*\{\s*width:\s*130px/, "a coluna de data encolheu");
    assert.match(css, /\.col-status\s*\{\s*width:\s*160px/, "a coluna de status encolheu");
  });

  test("as colunas de moeda das três listagens continuam em `col-money`", () => {
    for (const [arquivo] of LISTAGENS_FINANCEIRAS) {
      const codigo = ler(arquivo);
      assert.match(
        codigo, /<col className="col-money" \/>/,
        `${arquivo}: perdeu a coluna de dinheiro com largura própria`
      );
    }
  });
});
