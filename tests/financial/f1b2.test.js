// ═══════════════════════════════════════════════════════════════════════════
// FASE F-1b.2 — ler e caber
//
// Três naturezas de prova, na divisão que a suíte usa desde a 4.2:
//
//   1. FUNÇÃO PURA — as frases novas do extrato (alocação desfeita, alocação
//      substituta, referência do pagamento), o trecho distintivo do honorário
//      e o aviso preventivo do estorno. É onde há regra de verdade.
//
//   2. VARREDURA DE CSS — a responsividade. Ela NÃO prova aparência: prova que
//      a regra existe, que o mecanismo do defeito não voltou, e que a folha
//      não contradiz a decisão. Onde só o olho decide, o roteiro tem passo.
//
//   3. VARREDURA DE JSX — que a tela usa as funções e consome os campos que a
//      DEC-044 acrescentou ao contrato.
//
// ── O que a suíte NÃO consegue provar, e está no roteiro ──────────────────
// Que em 360 px reais nada estoura, que o teclado virtual não cobre o botão do
// modal, que o badge cabe na coluna e que ninguém soma 6.000 lendo o extrato.
// São os passos **165 a 171** do roteiro. Dizer isso aqui é o que impede a
// varredura de ser lida como prova visual — ela alcança regra, não pixel.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  vinculoDoEvento,
  refDoPagamento,
  alocacaoDesfeita,
  alocacaoSubstituta,
  eventoAtenuado,
  TIPO_EVENTO
} from "../../src/components/financeiro/statementEntry.js";
import {
  acimaDoEstornavel,
  descricaoDoEfeito
} from "../../src/components/financeiro/reversalEffect.js";
import {
  trechoDistintivo,
  rotuloCurtoDoHonorario
} from "../../src/utils/feeLabel.js";
import { visualDoStatus, tomDoStatus } from "../../src/utils/statusVisual.js";
import { formatCurrency } from "../../src/utils/formatters.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// O CSS sem comentário. A folha desta fase EXPLICA os defeitos que corrige,
// citando `overflow-wrap: anywhere` e `100vh` pelo nome — sem limpar, a
// varredura que proíbe os dois cairia no texto que os proíbe, e a saída óbvia
// seria apagar a explicação. Mesma armadilha registrada em `f1b.test.js`.
const css = (caminho) => ler(caminho).replace(/\/\*[\s\S]*?\*\//g, "");

// O caso do Daniel, na forma em que o contrato o entrega.
const ALOCACAO_VIVA = {
  tipo: TIPO_EVENTO.ALOCACAO,
  data: "2026-05-08T00:00:00.000Z",
  dataPagamento: "2026-05-08T00:00:00.000Z",
  pagamentoId: "68a1b2c3d4e5f61ebee9",
  valor: 3000,
  numeroParcela: 1,
  origem: "pagamento",
  ativa: true,
  desfeitaEm: null,
  estornoQueDesfezId: null,
  valorEstornoQueDesfez: null,
  substituiAlocacaoId: null,
  estornoQueGerouId: null,
  valorEstornoQueGerou: null
};

const ALOCACAO_DESFEITA = {
  ...ALOCACAO_VIVA,
  valor: 1500,
  numeroParcela: 2,
  ativa: false,
  desfeitaEm: "2026-08-18T00:00:00.000Z",
  estornoQueDesfezId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  valorEstornoQueDesfez: 1000
};

const ALOCACAO_SUBSTITUTA = {
  ...ALOCACAO_VIVA,
  valor: 500,
  numeroParcela: 2,
  substituiAlocacaoId: "bbbbbbbbbbbbbbbbbbbbbbbb",
  estornoQueGerouId: "aaaaaaaaaaaaaaaaaaaaaaaa",
  valorEstornoQueGerou: 1000
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. A ALOCAÇÃO DESFEITA DIZ QUE FOI DESFEITA (DEC-044)
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — a linha que deixou de valer diz que deixou de valer", () => {
  test("a alocação desfeita nomeia QUANDO e por qual estorno", () => {
    const frase = vinculoDoEvento(ALOCACAO_DESFEITA);
    assert.match(frase, /desfeita/i, "a frase diz que foi desfeita");
    assert.match(frase, /18\/08\/2026/, "com a data do desfazimento");
    assert.match(frase, /R\$\s*1\.000,00/, "e o valor do estorno que a desfez");
    assert.match(frase, /não entra na soma/i, "e o que isso significa para quem lê");
  });

  test("a alocação VIVA não ganha ressalva nenhuma", () => {
    const frase = vinculoDoEvento(ALOCACAO_VIVA);
    assert.doesNotMatch(frase, /desfeita/i, "linha viva não fala em desfazimento");
    assert.doesNotMatch(frase, /restou/i, "nem em substituição");
    assert.match(frase, /Do pagamento de/, "só o vínculo de sempre");
  });

  test("`alocacaoDesfeita` pergunta por `ativa`, que é o campo do contrato", () => {
    assert.equal(alocacaoDesfeita(ALOCACAO_DESFEITA), true);
    assert.equal(alocacaoDesfeita(ALOCACAO_VIVA), false);
    // Um estorno na linha não é a resposta: a desalocação também carrega
    // `estornoId` e NÃO é uma alocação desfeita — é o outro lado dela.
    assert.equal(
      alocacaoDesfeita({ tipo: TIPO_EVENTO.DESALOCACAO, ativa: false }), false,
      "desalocação não é alocação desfeita"
    );
  });

  test("a linha desfeita é ATENUADA, e só ela", () => {
    assert.equal(eventoAtenuado(ALOCACAO_DESFEITA), true);
    assert.equal(eventoAtenuado(ALOCACAO_VIVA), false);
    assert.equal(eventoAtenuado(ALOCACAO_SUBSTITUTA), false, "a substituta VALE — não se atenua");
  });

  test("sem os campos novos a frase não inventa data nem valor", () => {
    // Contrato antigo, ou linha em que o backend não resolveu o estorno.
    const semDetalhe = { ...ALOCACAO_DESFEITA, desfeitaEm: null, valorEstornoQueDesfez: null };
    const frase = vinculoDoEvento(semDetalhe);
    assert.match(frase, /desfeita/i, "continua dizendo o que importa");
    assert.match(frase, /por um estorno/, "sem nomear um valor que não tem");
    assert.doesNotMatch(frase, /undefined|NaN|Invalid/, "e sem vazar buraco de dado");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. A ALOCAÇÃO SUBSTITUTA DIZ DE ONDE VEIO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — a substituta não se passa por alocação original", () => {
  test("a frase diz que ela é o resto de uma alocação maior", () => {
    const frase = vinculoDoEvento(ALOCACAO_SUBSTITUTA);
    assert.match(frase, /restou/i, "diz que é o que sobrou");
    assert.match(frase, /R\$\s*1\.000,00/, "nomeando o estorno que a produziu");
    assert.match(
      frase, /não é uma alocação nova do dia do pagamento/i,
      "e desfaz exatamente a leitura errada: ela herda a data do pagamento"
    );
  });

  test("`alocacaoSubstituta` só é verdade com o vínculo gravado", () => {
    assert.equal(alocacaoSubstituta(ALOCACAO_SUBSTITUTA), true);
    assert.equal(alocacaoSubstituta(ALOCACAO_VIVA), false);
    assert.equal(alocacaoSubstituta(ALOCACAO_DESFEITA), false);
  });

  test("desfeita e substituta ao mesmo tempo: prevalece o que muda a soma", () => {
    // Uma substituta pode ser desfeita por um estorno posterior. Nesse caso a
    // informação urgente é que ela não conta mais — de onde ela veio é
    // história, e história não muda o total.
    const ambas = { ...ALOCACAO_SUBSTITUTA, ativa: false,
      desfeitaEm: "2026-09-01T00:00:00.000Z", valorEstornoQueDesfez: 500 };
    const frase = vinculoDoEvento(ambas);
    assert.match(frase, /não entra na soma/i);
    assert.equal(eventoAtenuado(ambas), true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. A REFERÊNCIA DO PAGAMENTO — DOIS PAGAMENTOS NO MESMO DIA
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — a linha diz de QUAL pagamento veio", () => {
  test("o vínculo soma a referência curta à data, sem substituí-la", () => {
    const frase = vinculoDoEvento(ALOCACAO_VIVA);
    assert.match(frase, /08\/05\/2026/, "a data continua lá: é o que situa a linha na história");
    assert.match(frase, /#1ebee9/, "e o sufixo curto, que é o que desempata");
  });

  test("DOIS pagamentos no mesmo dia produzem frases DIFERENTES", () => {
    const a = { ...ALOCACAO_VIVA, pagamentoId: "68a1b2c3d4e5f61ebee9" };
    const b = { ...ALOCACAO_VIVA, pagamentoId: "68a1b2c3d4e5f6aa0042" };
    const fa = vinculoDoEvento(a);
    const fb = vinculoDoEvento(b);
    assert.notEqual(fa, fb, "era exatamente isto que a frase só com data não conseguia");
    assert.match(fa, /#1ebee9/);
    assert.match(fb, /#aa0042/);
  });

  test("o formato da referência é o MESMO que a linha do pagamento exibe", () => {
    assert.equal(refDoPagamento("68a1b2c3d4e5f61ebee9"), "#1ebee9");
    const tela = semComentarios(ler("src/components/financeiro/FeeStatement.jsx"));
    // Uma segunda fatia escrita à mão no JSX seria um segundo formato para a
    // mesma referência — e aí ela deixa de referenciar.
    assert.doesNotMatch(tela, /slice\(-6\)/, "a tela não repete a fatia");
    // ── F-1b.3 (DEC-045) ─────────────────────────────────────────────────
    // O sufixo do id deixou de ser a referência PRINCIPAL e virou desempate,
    // dentro de uma identidade maior (valor, forma, data, id). Quem monta essa
    // identidade é `identidadeDoPagamento`, e as DUAS linhas — a do vínculo e a
    // do próprio pagamento — passam por ela. A regra protegida é a mesma:
    // formato único, num lugar só.
    assert.match(
      tela,
      /referenciaDaLinhaDePagamento/,
      "a linha do pagamento deixou de usar a identidade compartilhada"
    );
  });

  test("sem `pagamentoId` a frase não escreve `#undefined`", () => {
    assert.equal(refDoPagamento(null), null);
    const semId = { ...ALOCACAO_VIVA, pagamentoId: null };
    const frase = vinculoDoEvento(semId);
    assert.doesNotMatch(frase, /#|undefined/, "só a data, que é o que se sabe");
  });

  test("a data do vínculo é a do PAGAMENTO, não a da alocação", () => {
    // A alocação nascida de uma anulação carrega a data da anulação. A frase
    // antiga dizia "Do pagamento de 18/08/2026" para um pagamento de maio.
    const daAnulacao = {
      ...ALOCACAO_VIVA,
      data: "2026-08-18T00:00:00.000Z",
      dataPagamento: "2026-05-08T00:00:00.000Z",
      valor: 1000
    };
    const frase = vinculoDoEvento(daAnulacao);
    assert.match(frase, /Do pagamento de 08\/05\/2026/, "a data real do pagamento");
    assert.doesNotMatch(frase, /Do pagamento de 18\/08\/2026/, "e nunca a do evento");
  });

  test("contrato sem `dataPagamento` cai na data do evento, e não em vazio", () => {
    const { dataPagamento, ...antigo } = ALOCACAO_VIVA;
    assert.match(vinculoDoEvento(antigo), /08\/05\/2026/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. A DESALOCAÇÃO CUJO ESTORNO FOI ANULADO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — a desalocação avisa quando o estorno dela foi anulado", () => {
  const DESALOCACAO = {
    tipo: TIPO_EVENTO.DESALOCACAO,
    numeroParcela: 2,
    motivo: "Devolução parcial acordada",
    estornoAnulado: false
  };

  test("estorno vivo: a frase é a de sempre", () => {
    const frase = vinculoDoEvento(DESALOCACAO);
    assert.match(frase, /Saiu da parcela 2 por estorno: Devolução parcial acordada\./);
    assert.doesNotMatch(frase, /anulado/i);
  });

  test("estorno anulado: a linha diz que o valor voltou", () => {
    const frase = vinculoDoEvento({ ...DESALOCACAO, estornoAnulado: true });
    assert.match(frase, /anulado depois/i, "simetria com a linha do estorno");
    assert.match(frase, /o valor voltou e foi realocado/i, "e o que aconteceu com o dinheiro");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. A TELA CONSOME OS CAMPOS NOVOS — E CONTINUA SEM FAZER CONTA
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — varredura do extrato na tela", () => {
  test("o extrato aplica a classe de atenuação a partir da função pura", () => {
    const tela = semComentarios(ler("src/components/financeiro/FeeStatement.jsx"));
    assert.match(tela, /eventoAtenuado/, "a decisão vem da função, não de `evento.ativa` no JSX");
    assert.match(tela, /extrato__item--desfeita/, "e vira classe");
  });

  test("a classe de atenuação tem regra na folha do extrato", () => {
    const folha = css("src/components/financeiro/FeeStatement.css");
    assert.match(folha, /\.extrato__item--desfeita\s*\{/, "a regra existe");
    assert.match(folha, /\.extrato__item--desfeita\s*\{[^}]*opacity/, "e atenua");
    assert.match(
      folha, /\.extrato__item--desfeita\s+\.extrato__valor\s*\{[^}]*line-through/,
      "o valor sai riscado: o sinal que chega antes da frase"
    );
  });

  test("a tela NÃO decide sozinha o que é desfeito nem soma o extrato", () => {
    const tela = semComentarios(ler("src/components/financeiro/FeeStatement.jsx"));
    assert.doesNotMatch(tela, /\.reduce\s*\(/, "somar o extrato na tela abriria a segunda fonte (DEC-040)");
    assert.doesNotMatch(tela, /\.filter\s*\(\s*\(?\s*e\w*\s*\)?\s*=>\s*e\w*\.ativa/,
      "e não recorta a lista por conta própria — o backend manda tudo, marcado");
  });

  test("REGRESSÃO: a tela continua sem repetir o rateio do estorno parcial", () => {
    // Decisão nº 7 da F-1b. O rateio da desalocação é espelhado e mora no
    // backend; reproduzi-lo aqui seria a segunda fonte de verdade sobre
    // dinheiro que o preview existe para não criar.
    const efeito = semComentarios(ler("src/components/financeiro/reversalEffect.js"));
    assert.doesNotMatch(efeito, /Math\.min|Math\.max/, "não decide quanto sai de cada parcela");
    assert.doesNotMatch(efeito, /restante|sobra\s*=/, "não distribui valor");
    assert.doesNotMatch(efeito, /\.sort\s*\(/, "e não reordena as parcelas");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6. MOEDA NUNCA TRUNCA — AGORA NAS LISTAGENS
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — nenhuma coluna de dinheiro trunca", () => {
  // TODAS as listagens, não só as financeiras: a regra tem de valer para a
  // coluna de dinheiro que a próxima listagem ganhar.
  const LISTAGENS = [
    "src/pages/payments/PaymentListPage.jsx",
    "src/pages/installments/InstallmentListPage.jsx",
    "src/pages/fees/FeeListPage.jsx",
    "src/pages/clients/ClientListPage.jsx",
    "src/pages/processes/ProcessListPage.jsx",
    "src/pages/documents/DocumentListPage.jsx",
    "src/pages/secoes/SecaoListPage.jsx"
  ];

  test("`.col-money` existe, é mais larga que `col-sm` e não trunca", () => {
    const folha = css("src/styles/modules.css");
    const m = folha.match(/\.col-money\s*\{\s*width:\s*(\d+)px/);
    assert.ok(m, "`.col-money` precisa de regra em modules.css");
    const largura = Number(m[1]);
    const sm = Number(folha.match(/\.col-sm\s*\{\s*width:\s*(\d+)px/)[1]);
    assert.ok(largura > sm, `col-money (${largura}px) tem de ser maior que col-sm (${sm}px)`);
    // 150 px descontados padding e borda dão ~122 px de conteúdo — o bastante
    // para "R$ 1.234.567,89". A conta está no comentário da folha.
    assert.ok(largura >= 150, `col-money com ${largura}px não comporta a casa dos milhões`);
  });

  for (const arquivo of LISTAGENS) {
    test(`${arquivo.split("/").pop()}: nenhuma célula é de dinheiro E truncada`, () => {
      const codigo = semComentarios(ler(arquivo));
      // `cell-num` é a classe da célula numérica; `cell-truncate` é o
      // mecanismo do corte. Na MESMA célula, os dois são o defeito "R$ 3.50…".
      const conflitos = [...codigo.matchAll(/className="([^"]*cell-num[^"]*)"/g)]
        .map((m) => m[1])
        .filter((classes) => classes.includes("cell-truncate"));
      assert.deepEqual(conflitos, [], `células de dinheiro truncadas: ${conflitos.join(", ")}`);

      // A forma com template string, que a listagem de pagamentos usa para o
      // realce do estornado — o mesmo conflito, escrito de outro jeito.
      const conflitosTpl = [...codigo.matchAll(/className=\{`([^`]*cell-num[^`]*)`\}/g)]
        .map((m) => m[1])
        .filter((classes) => classes.includes("cell-truncate"));
      assert.deepEqual(conflitosTpl, [], `células de dinheiro truncadas: ${conflitosTpl.join(", ")}`);
    });
  }

  test("nas listagens financeiras, toda coluna de dinheiro usa `col-money`", () => {
    // A largura é o outro meio pelo qual o corte acontece: numa tabela
    // `table-layout: fixed`, coluna estreita trunca sem `cell-truncate`
    // nenhum, porque `.data-table--fixed td` já traz `text-overflow`.
    const ESPERADO = {
      "src/pages/payments/PaymentListPage.jsx": 2,      // Valor, Líquido
      "src/pages/installments/InstallmentListPage.jsx": 3, // Valor, Recebido, Em aberto
      "src/pages/fees/FeeListPage.jsx": 2               // Valor base, Valor
    };
    for (const [arquivo, quantas] of Object.entries(ESPERADO)) {
      const codigo = ler(arquivo);
      const achadas = (codigo.match(/className="col-money"/g) ?? []).length;
      assert.equal(achadas, quantas, `${arquivo}: ${achadas} colunas de dinheiro, esperado ${quantas}`);
    }
  });

  test("a coluna do LÍQUIDO deixou de ser `col-xs` — o defeito nominal da fase", () => {
    const codigo = ler("src/pages/payments/PaymentListPage.jsx");
    const colgroup = codigo.match(/<colgroup>([\s\S]*?)<\/colgroup>/)[1];
    const cols = [...colgroup.matchAll(/<col(?:\s+className="([^"]*)")?\s*\/>/g)]
      .map((m) => m[1] ?? "auto");
    const cabecalhos = [...codigo.matchAll(/<th>([^<]+)<\/th>/g)].map((m) => m[1].trim());

    assert.equal(cols.length, cabecalhos.length,
      "colgroup e cabeçalho têm de ter o mesmo número de colunas — foi o desalinho que escondeu o defeito");

    const larguraDe = (titulo) => cols[cabecalhos.indexOf(titulo)];
    assert.equal(larguraDe("Líquido"), "col-money", "era `col-xs`, e cortava em ~8 caracteres");
    assert.equal(larguraDe("Valor"), "col-money");
    assert.equal(larguraDe("Data"), "col-data");
    assert.equal(larguraDe("Honorário"), "col-lg", "era `col-xs`, e toda linha dizia \"Honorári…\"");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7. A COLUNA "HONORÁRIO" PASSA A DIFERENCIAR HONORÁRIOS
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — o trecho distintivo do honorário", () => {
  // As descrições reais do seed. Quatro delas compartilham 23 caracteres de
  // prefixo — é o motivo de alargar a coluna, sozinho, não resolver.
  const REAIS = [
    "Honorários advocatícios — fase inicial",
    "Honorários advocatícios — divórcio litigioso",
    "Honorários advocatícios — usucapião urbano",
    "Honorários advocatícios — ação de cobrança",
    "Honorários de êxito — 10% sobre o valor da causa",
    "Honorários — inventário e partilha (% sobre monte)",
    "Honorários contratuais — disputa com fornecedor",
    "Honorários complementares — recurso administrativo",
    "Assessoria tributária — processo administrativo",
    "Custas administrativas — taxas e emolumentos",
    "Consultoria e revisão contratual",
    "Custas processuais e despesas cartorárias"
  ];

  test("os doze honorários do seed ficam distinguíveis nos primeiros 22 caracteres", () => {
    // 22 é o que `col-lg` (220 px) comporta. A asserção é a da fase: a coluna
    // tem de DIFERENCIAR — não basta caber.
    const recortes = REAIS.map((d) => trechoDistintivo(d).slice(0, 22));
    assert.equal(new Set(recortes).size, REAIS.length,
      `houve colisão nos 22 primeiros caracteres:\n  ${recortes.join("\n  ")}`);

    // E a prova do contrário: sem o trecho distintivo, quatro deles colidem.
    const crus = REAIS.map((d) => d.slice(0, 22));
    assert.ok(new Set(crus).size < REAIS.length,
      "se a descrição crua já distinguisse, esta fase não precisaria existir");
  });

  test("sem separador, a descrição sai inteira — nada de corte inventado", () => {
    assert.equal(trechoDistintivo("Consultoria e revisão contratual"), "Consultoria e revisão contratual");
  });

  test("hífen que LIGA palavra não é separador", () => {
    // "pré-pago" e "extra-judicial" não podem ser partidos: o separador exige
    // espaço dos dois lados.
    assert.equal(trechoDistintivo("Honorários pré-pagos"), "Honorários pré-pagos");
    assert.equal(trechoDistintivo("Usucapião extra-judicial"), "Usucapião extra-judicial");
  });

  test("separador sem específico depois devolve o texto, não uma célula vazia", () => {
    assert.equal(trechoDistintivo("Honorários —"), "Honorários —");
  });

  test("descrição ausente cai na retaguarda que a listagem já usava", () => {
    assert.equal(rotuloCurtoDoHonorario(undefined), "Honorário");
    assert.equal(rotuloCurtoDoHonorario(""), "Honorário");
    assert.equal(rotuloCurtoDoHonorario(null), "Honorário");
  });

  test("a descrição INTEIRA continua no `title` das duas listagens", () => {
    // O trecho distintivo escolhe o que aparece; não apaga o resto.
    const pagamentos = ler("src/pages/payments/PaymentListPage.jsx");
    assert.match(pagamentos, /title=\{p\.honorarioId\?\.descricao \?\? undefined\}/);
    const parcelas = ler("src/pages/installments/InstallmentListPage.jsx");
    assert.match(parcelas, /title=\{inst\.feeId\?\.descricao \|\| undefined\}/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 8. O BADGE "ESTORNADO INTEGRALMENTE"
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — o badge de estornado integralmente", () => {
  test("o rótulo e o tom saem do `statusVisual`, a fonte única desde a 4.3", () => {
    const visual = visualDoStatus("estornado_integralmente");
    assert.equal(visual.label, "Estornado integralmente");
    assert.equal(visual.tom, "danger");
    // Distinto do estorno PARCIAL, que usa o realce de aviso na célula.
    assert.notEqual(tomDoStatus("estornado_integralmente"), "warning");
  });

  test("a listagem usa o componente e o status, nunca uma string à mão", () => {
    const codigo = semComentarios(ler("src/pages/payments/PaymentListPage.jsx"));
    assert.match(codigo, /<StatusBadge status="estornado_integralmente"/);
    assert.match(codigo, /estornadoIntegralmente\(p\)/, "a condição sai da função pura");
    // O segundo mapa que a 4.3 eliminou: rótulo escrito no JSX.
    assert.doesNotMatch(codigo, /["'>]Estornado integralmente/,
      "o texto do badge não pode ser escrito na tela");
  });

  test("o badge cabe na coluna de dinheiro porque QUEBRA linha ali", () => {
    const folha = css("src/styles/modules.css");
    assert.match(
      folha, /\.data-table \.cell-num \.status-badge\s*\{[^}]*white-space:\s*normal/,
      "sem isto o `nowrap` de `.status-badge` estoura a col-money"
    );
    assert.match(folha, /\.data-table \.cell-num \.status-badge\s*\{[^}]*display:\s*block/,
      "o badge desce para baixo do valor, e não disputa a linha com ele");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 9. O AVISO PREVENTIVO DO MODAL DE ESTORNO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — o modal avisa antes de o servidor recusar", () => {
  const PAGAMENTO = {
    valor: 4500,
    valorLiquido: 4500,
    alocacoes: [{ numeroParcela: 1, ativa: true }, { numeroParcela: 2, ativa: true }]
  };

  test("acima do estornável, o quadro para de descrever um efeito impossível", () => {
    const frase = descricaoDoEfeito(PAGAMENTO, 5000);
    assert.doesNotMatch(frase, /Estorno integral/, "era isto que ele dizia até o 422 chegar");
    assert.match(frase, /passa do que ainda é estornável/i);
    assert.match(frase, /R\$\s*4\.500,00/, "e nomeia o teto que a tela conhece");
  });

  test("NO TETO exato ainda é estorno integral — a borda que float erraria", () => {
    assert.equal(acimaDoEstornavel(PAGAMENTO, 4500), false);
    assert.match(descricaoDoEfeito(PAGAMENTO, 4500), /Estorno integral/);
    // 45,00 sobre 45,00: o caso em que comparar float com float daria aviso
    // falso, porque 45.00 * 100 não é 4500 em toda aritmética.
    assert.equal(acimaDoEstornavel({ valor: 45.0, valorLiquido: 45.0 }, 45.0), false);
  });

  test("abaixo do teto nada muda: o parcial continua sem inventar rateio", () => {
    assert.equal(acimaDoEstornavel(PAGAMENTO, 1000), false);
    const frase = descricaoDoEfeito(PAGAMENTO, 1000);
    assert.match(frase, /da mais recente para a mais antiga/);
  });

  test("valor vazio, zero ou inválido NÃO dispara aviso", () => {
    // O campo começa preenchido, mas a advogada apaga para digitar outro
    // número — avisar no meio da digitação seria alarme a cada tecla.
    for (const v of ["", null, undefined, 0, -5, "abc", NaN]) {
      assert.equal(acimaDoEstornavel(PAGAMENTO, v), false, `valor ${JSON.stringify(v)}`);
    }
  });

  test("o aviso NÃO impede o envio — o servidor continua sendo a autoridade", () => {
    const codigo = semComentarios(ler("src/components/financeiro/ReversalModal.jsx"));
    // O botão de submit não pode ganhar condição de valor: entre abrir o
    // modal e confirmar, o estornável pode ter mudado (padrão do passo 102).
    const submit = codigo.match(/type="submit"[\s\S]{0,240}?>/)[0];
    assert.match(submit, /disabled=\{salvando\}/, "só o envio em curso desabilita");
    assert.doesNotMatch(submit, /acimaDoEstornavel|valor >|estornavel/,
      "a tela não barra o envio pelo número que leu");
    // E continua sem reescrever a mensagem do 422.
    assert.doesNotMatch(codigo, /estornavel\s*[:=]/, "a recusa é a do backend, com o limite dele");
  });

  test("o quadro muda de TOM junto com a frase", () => {
    const codigo = semComentarios(ler("src/components/financeiro/ReversalModal.jsx"));
    assert.match(codigo, /estorno-efeito--aviso/);
    const folha = css("src/components/financeiro/ReversalModal.css");
    assert.match(folha, /\.estorno-efeito--aviso\s*\{/, "a classe tem regra");
    assert.match(folha, /\.estorno-efeito--aviso\s*\{[^}]*--color-warning/,
      "tom de aviso, não de perigo: nada foi recusado ainda");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 10. CABER NA TELA — o que a varredura CONSEGUE provar
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — responsividade: os mecanismos, não a aparência", () => {
  test("`span-*` vale para QUALQUER filho do grid, e volta a 1 coluna em 767", () => {
    // O defeito: as larguras eram escritas por par (`.form-group.span-3`), e o
    // bloco do preview (`.plano span-3`) e a `.form-info-box` ficavam de fora.
    // A `form-info-box` recebia `span 2` em ≤1023 e NADA a devolvia para 1 em
    // ≤767 — num grid de uma coluna, `span 2` cria coluna implícita e estoura
    // a largura da página. Era a rolagem horizontal do passo 159.
    const folha = css("src/pages/clients/ClientPage.css");
    assert.match(folha, /^\.span-3\s*\{\s*grid-column:\s*span 3/m, "a classe sozinha tem largura");

    const estreito = folha.match(/@media \(max-width: 767px\)\s*\{([\s\S]*?)\n\}/)[1];
    assert.match(estreito, /\.span-3\s*\{\s*grid-column:\s*1|\.span-1,[\s\S]*?\.span-3\s*\{\s*grid-column:\s*1/,
      "em 767 os `span-*` voltam para a coluna única");
    assert.match(estreito, /\.form-info-box\s*\{\s*grid-column:\s*1/,
      "e a caixa de informação também — era ela que criava a coluna implícita");
  });

  test("o valor em reais NÃO quebra no meio no bloco do plano", () => {
    // `overflow-wrap: anywhere` parte dentro do número ("R$ 3.0" / "00,00").
    // `formatCurrency` já usa espaço não-separável entre "R$" e os dígitos, e
    // dígito não tem oportunidade de quebra — sem `anywhere`, o valor é
    // indivisível por construção.
    const folha = css("src/pages/payments/PaymentFormPage.css");
    assert.doesNotMatch(folha, /overflow-wrap:\s*anywhere/,
      "`anywhere` corta dentro do valor — é o truncamento com outra aparência");
    assert.match(folha, /\.plano__linha\s*\{[^}]*overflow-wrap:\s*break-word/,
      "`break-word` cobre a palavra sem espaço e NÃO parte o valor");
  });

  test("o formatador de moeda usa espaço NÃO-SEPARÁVEL — a base da regra acima", () => {
    // A regra "o valor não quebra no meio" se apoia NISTO: `Intl` pt-BR separa
    // "R$" dos dígitos com U+00A0, e dígito não tem oportunidade de quebra. Se
    // o formatador passasse a emitir espaço comum, "R$" e o número cairiam em
    // linhas diferentes e tirar `overflow-wrap: anywhere` deixaria de bastar.
    const texto = formatCurrency(3000);
    assert.ok(texto.includes("\u00A0"), `\`${texto}\` deveria ter espaço não-separável`);
    assert.ok(!/R\$ \d/.test(texto), "e nunca um espaço comum entre o símbolo e o número");
  });

  test("o modal cabe em 360 px e sobrevive ao teclado virtual", () => {
    const folha = css("src/components/ui/Modal.css");
    // O afastamento das bordas é PADDING da moldura. Como `margin` no modal
    // (que tem `width: 100%`), ele somava 32 px à largura da tela.
    assert.match(folha, /\.modal-overlay\s*\{[^}]*padding:/, "a moldura afasta o modal das bordas");
    assert.doesNotMatch(folha, /\.modal\s*\{[^}]*margin:\s*var\(--space-4\)/,
      "o modal não pode ter margem: `width: 100%` mais margem estoura a tela");
    // `100vh` ignora o teclado; `100dvh` não.
    assert.match(folha, /max-height:\s*calc\(100dvh/, "a altura acompanha a viewport visível");
    assert.match(folha, /max-height:\s*calc\(100vh/, "com `vh` de retaguarda para quem não tem `dvh`");
    assert.match(folha, /\.modal-overlay\s*\{[^}]*overflow-y:\s*auto/,
      "conteúdo mais alto que a tela rola pela moldura, e não fica inalcançável");
  });

  test("os quatro números do honorário EMPILHAM em vez de espremer", () => {
    const folha = css("src/pages/fees/FeeDetailPage.css");
    assert.match(folha, /grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(/,
      "`auto-fit` + `minmax`: as caixas descem antes de o número encolher");
    assert.doesNotMatch(folha, /grid-template-columns:\s*repeat\(4,/,
      "quatro colunas fixas cortariam o valor em tela estreita");
    assert.match(folha, /\.honorario-total__valor\s*\{[^}]*white-space:\s*nowrap/,
      "e o valor não quebra no meio");
  });

  test("no extrato, o valor desce para linha própria em tela estreita", () => {
    const folha = css("src/components/financeiro/FeeStatement.css");
    const estreito = folha.match(/@media \(max-width: 767px\)\s*\{([\s\S]*)\}/)[1];
    assert.match(estreito, /\.extrato__valor\s*\{[^}]*width:\s*100%/,
      "linha própria, em vez de espremer a descrição");
    assert.match(folha, /\.extrato__valor\s*\{[^}]*white-space:\s*nowrap/);
  });

  test("tabela larga rola DENTRO do container, nunca na página (regra do passo 111)", () => {
    const folha = css("src/styles/modules.css");
    assert.match(folha, /\.table-wrapper\s*\{[^}]*overflow-x:\s*auto/);
    assert.match(folha, /\.table-wrapper\s*\{[^}]*max-width:\s*100%/,
      "sem o teto, a tabela empurra o container e quem rola é o documento");

    // E toda listagem embrulha a tabela.
    for (const arquivo of [
      "src/pages/payments/PaymentListPage.jsx",
      "src/pages/installments/InstallmentListPage.jsx",
      "src/pages/fees/FeeListPage.jsx"
    ]) {
      const codigo = ler(arquivo);
      assert.match(codigo, /className="table-wrapper"/, `${arquivo} sem container rolável`);
    }
  });

  test("o breadcrumb longo encurta e não empurra o bloco do usuário", () => {
    const folha = css("src/components/layout/Header.css");
    assert.match(folha, /\.breadcrumb\s*\{[^}]*min-width:\s*0/);
    assert.match(folha, /\.breadcrumb-current\s*\{[^}]*text-overflow:\s*ellipsis/);
    assert.match(folha, /@media \(max-width: 480px\)[\s\S]*?\.breadcrumb-current\s*\{[^}]*max-width/,
      "e um teto em 360 px, para o corte acontecer antes de a linha estourar");
  });

  test(":focus-visible preservado em tudo que ganhou CSS novo", () => {
    // Regra do projeto desde a auditoria de acessibilidade (achado #9).
    for (const folha of [
      "src/components/financeiro/FeeStatement.css",
      "src/components/financeiro/ReversalModal.css",
      "src/pages/fees/FeeDetailPage.css"
    ]) {
      assert.match(css(folha), /:focus-visible/, `${folha} perdeu o anel de foco`);
    }
    // E ninguém apagou o anel nas folhas tocadas nesta fase.
    for (const folha of [
      "src/styles/modules.css",
      "src/components/ui/Modal.css",
      "src/pages/clients/ClientPage.css",
      "src/pages/payments/PaymentFormPage.css"
    ]) {
      assert.doesNotMatch(css(folha), /outline:\s*none/, `${folha} zera o foco`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 11. REGRESSÕES OBRIGATÓRIAS
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.2 — o que não pode ter voltado", () => {
  test("passo 155: nenhuma listagem com filtro tem `return <Loading/>` antecipado", () => {
    // O defeito: `if (loading) return <Loading/>` acima do JSX troca a árvore
    // inteira a cada digitação no filtro, e o input perde o foco. As listagens
    // desta fase ganharam colunas novas — o refactor distraído reintroduz.
    //
    // A lista é a MESMA de `regressions/f1a1.test.js`, e de propósito: são as
    // listagens que refazem a consulta a partir de um controle da própria
    // tela. `DocumentListPage` fica de fora porque não tem filtro — o
    // `loading` dela só vai a `true` na carga inicial, e o `return` antecipado
    // que ela tem não desmonta controle nenhum. Incluí-la aqui transformaria
    // uma regressão real numa proibição decorativa.
    const COM_FILTRO = [
      "src/pages/payments/PaymentListPage.jsx",
      "src/pages/installments/InstallmentListPage.jsx",
      "src/pages/fees/FeeListPage.jsx",
      "src/pages/clients/ClientListPage.jsx",
      "src/pages/processes/ProcessListPage.jsx",
      "src/pages/secoes/SecaoListPage.jsx"
    ];
    for (const arquivo of COM_FILTRO) {
      const codigo = semComentarios(ler(arquivo));
      assert.doesNotMatch(
        codigo,
        /if\s*\(\s*loading\s*\)\s*(\{\s*)?return\s+</,
        `${arquivo} voltou a trocar a árvore por <Loading/> (passo 155)`
      );
    }
  });

  test("a página do honorário continua sem fazer conta (DEC-040)", () => {
    const codigo = semComentarios(ler("src/pages/fees/FeeDetailPage.jsx"));
    assert.doesNotMatch(codigo, /\.reduce\s*\(/);
  });

  test("nenhuma tela desta fase abre `err.response` por conta própria", () => {
    for (const arquivo of [
      "src/components/financeiro/ReversalModal.jsx",
      "src/components/financeiro/FeeStatement.jsx",
      "src/pages/payments/PaymentListPage.jsx",
      "src/pages/installments/InstallmentListPage.jsx"
    ]) {
      const codigo = semComentarios(ler(arquivo));
      assert.doesNotMatch(codigo, /err\.response\.data/, `${arquivo}`);
    }
  });
});
