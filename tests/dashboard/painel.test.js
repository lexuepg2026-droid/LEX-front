// ═══════════════════════════════════════════════════════════════════════════
// O PAINEL QUE DIZ O QUE FAZER — e o número que não pode divergir do sino (F-4)
//
// ── O que este arquivo existe para pegar ───────────────────────────────────
// **Dois números diferentes para a mesma coisa na mesma tela.** O passo 135 já
// pegou isso uma vez ("Honorários a Receber" contra "Honorários contratados"),
// e o sino da F-3 recriou a condição: ele conta parcelas vencidas no cabeçalho
// enquanto o painel as conta no corpo, ao mesmo tempo, na mesma tela.
//
// Antes desta fase o painel chegava ao número por três caminhos — o resumo
// financeiro, um filtro no cliente sobre todas as parcelas, e o sino. Os três
// concordavam por coincidência de consultas escritas à mão. A F-4 deixou um
// caminho só, e é isto que a suíte trava: o dia em que alguém reintroduzir um
// `status === 'vencido'` no painel, este arquivo cai.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  contarParcelasVencidas,
  parcelasVencidasDoAviso,
  lerBlocosFechados,
  gravarBlocosFechados,
} from "../../src/utils/painel.js";
import { SRC } from "../helpers/cssScan.js";

const semComentarios = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/^\s*\/\/.*$/gm, "");
const fonte = (caminho) => semComentarios(readFileSync(resolve(SRC, caminho), "utf8"));
const cru = (caminho) => readFileSync(resolve(SRC, caminho), "utf8");

const PAINEL = "pages/dashboard/DashboardHomePage.jsx";
const SINO = "components/layout/NotificationBell.jsx";

describe("a contagem de vencidas tem UMA fonte", () => {
  test("`contarParcelasVencidas` conta o que o sino traz, e aguenta payload torto", () => {
    assert.equal(contarParcelasVencidas({ parcelasVencidas: [{}, {}, {}] }), 3);
    assert.equal(contarParcelasVencidas({ parcelasVencidas: [] }), 0);
    for (const torto of [null, undefined, {}, { parcelasVencidas: null }, { parcelasVencidas: "x" }]) {
      assert.equal(contarParcelasVencidas(torto), 0, `payload: ${JSON.stringify(torto)}`);
    }
    assert.deepEqual(parcelasVencidasDoAviso(null), []);
    assert.deepEqual(parcelasVencidasDoAviso({ parcelasVencidas: [{ _id: "a" }] }), [{ _id: "a" }]);
  });

  test("painel e sino chamam A MESMA função — nenhum lê a lista na mão", () => {
    const painel = fonte(PAINEL);
    const sino = fonte(SINO);

    assert.match(painel, /contarParcelasVencidas\(/, "o painel precisa contar pela função compartilhada");
    assert.match(painel, /parcelasVencidasDoAviso\(/, "o painel precisa ler a lista pela função compartilhada");
    assert.match(sino, /parcelasVencidasDoAviso\(/, "o sino precisa ler a lista pela função compartilhada");

    for (const [arquivo, texto] of [[PAINEL, painel], [SINO, sino]]) {
      assert.ok(
        !/avisos\??\.\s*parcelasVencidas/.test(texto),
        `${arquivo} lê \`avisos.parcelasVencidas\` direto — é o segundo caminho para o mesmo número`
      );
    }
  });

  test("o painel NÃO filtra parcela por status por conta própria", () => {
    const painel = fonte(PAINEL);
    // O filtro que existia antes da F-4: `inst.status === 'vencido'`.
    assert.ok(
      !/status\s*===\s*['"]vencido['"]/.test(painel),
      "o painel voltou a decidir sozinho o que é vencido — é a divergência do passo 135 de volta"
    );
    // A contagem do resumo financeiro também não pode voltar a ser a fonte.
    assert.ok(
      !/resumoFinanceiro\??\.\s*vencidas/.test(painel),
      "`resumoFinanceiro.vencidas` é um terceiro caminho para o mesmo número"
    );
  });

  test("o painel usa a MESMA rota do sino para os avisos", () => {
    for (const arquivo of [PAINEL, SINO]) {
      const texto = fonte(arquivo);
      assert.match(texto, /from '.*\/api\/calendarService'/, `${arquivo}: falta o serviço do calendário`);
      // A chamada pode vir encadeada em outra linha — o que importa é que os
      // dois batam na MESMA rota, e não que a chamada esteja escrita igual.
      assert.match(texto, /\.getAvisos\(\)/, `${arquivo}: precisa ler de /calendar/avisos`);
    }
  });

  test("o painel continua sem escrever nada — ele mostra e leva, não altera", () => {
    const painel = fonte(PAINEL);
    for (const escrita of [".post(", ".patch(", ".delete(", ".put("]) {
      assert.ok(!painel.includes(escrita), `o painel não pode ${escrita} — ele lê e navega`);
    }
  });
});

describe("blocos colapsáveis, com a escolha lembrada", () => {
  test("a preferência sobrevive a `localStorage` ausente ou corrompido", () => {
    // A suíte roda em `node --test`, sem `localStorage`: é exatamente o caso
    // do navegador em navegação privada com armazenamento bloqueado. Um painel
    // que não abrisse por causa disso seria defeito bem pior que não lembrar.
    assert.doesNotThrow(() => lerBlocosFechados());
    assert.deepEqual(lerBlocosFechados(), {});
    assert.doesNotThrow(() => gravarBlocosFechados({ resumo: true }));
    assert.doesNotThrow(() => gravarBlocosFechados(null));
  });

  test("o cabeçalho do bloco é um BOTÃO de verdade, e diz se está aberto", () => {
    const bloco = fonte("components/dashboard/BlocoDoPainel.jsx");
    assert.match(bloco, /<button/, "um <h2> com onClick não recebe foco nem responde a Enter");
    assert.match(bloco, /type="button"/, "sem type, um botão dentro de form submete");
    assert.match(bloco, /aria-expanded=\{aberto\}/);
    assert.match(bloco, /aria-controls=/);
  });

  test("o anel de foco não é removido em lugar nenhum do bloco", () => {
    const css = cru("components/dashboard/BlocoDoPainel.css");
    assert.ok(!/outline\s*:\s*(none|0)\b/.test(css),
      "remover o outline aqui desfaz a regra global de :focus-visible");
  });

  test("fechado DESMONTA o conteúdo — é o que poupa o chunk dos gráficos", () => {
    const bloco = fonte("components/dashboard/BlocoDoPainel.jsx");
    assert.match(bloco, /\{aberto && \(/,
      "esconder por CSS manteria `DashboardCharts` montado e desfaria metade do motivo");
    assert.ok(!/display:\s*none/.test(cru("components/dashboard/BlocoDoPainel.css")));
  });
});

describe("atenção primeiro, estatística depois", () => {
  const painel = () => fonte(PAINEL);

  test("os seis blocos aparecem na ordem que a pergunta do dia pede", () => {
    const ordem = [...painel().matchAll(/chave="([a-z]+)"/g)].map((m) => m[1]);
    assert.deepEqual(ordem, ["atencao", "mes", "proximos", "acumulado", "resumo", "graficos"]);
  });

  test("o que exige atenção nasce ABERTO; a estatística nasce FECHADA", () => {
    const t = painel();
    for (const chave of ["atencao", "mes", "proximos"]) {
      assert.match(
        t, new RegExp(`estaAberto\\('${chave}'\\)`),
        `${chave} responde "o que preciso fazer hoje" — nasce aberto`
      );
    }
    for (const chave of ["acumulado", "resumo", "graficos"]) {
      assert.match(
        t, new RegExp(`estaAberto\\('${chave}', true\\)`),
        `${chave} é estatística — nasce fechado`
      );
    }
  });

  test("cada bloco que sugere uma ação carrega a ação", () => {
    const t = painel();
    for (const [rotulo, destino] of [
      ["Registrar pagamento", "/dashboard/pagamentos/novo"],
      ["Nova parcela", "/dashboard/parcelas/novo"],
      ["Ver honorários", "/dashboard/honorarios"],
      ["Ver processos", "/dashboard/processos"],
    ]) {
      assert.ok(t.includes(rotulo), `falta a ação "${rotulo}"`);
      assert.ok(t.includes(`to="${destino}"`), `a ação "${rotulo}" precisa levar a ${destino}`);
    }
  });

  test("`Button.css` é importado — senão as ações saem sem estilo nenhum", () => {
    // O defeito do `.input-error` da Fase 2E.1: classe aplicada sem regra. O
    // painel não monta o `PageHeader`, que é quem normalmente traz `.ui-btn`.
    assert.match(cru(PAINEL), /import '\.\.\/\.\.\/components\/ui\/Button\.css'/);
  });
});

describe("os cartões em 360 px — pendência do passo 181", () => {
  const css = () => readFileSync(resolve(SRC, "pages/dashboard/DashboardPage.css"), "utf8");

  test("os três blocos empilham numa coluna só na tela estreita", () => {
    const t = css();
    assert.match(
      t, /@media \(max-width: 480px\) \{[^}]*\.summary-grid \{ grid-template-columns: 1fr; \}/s,
      "sem uma coluna só, 'R$ 1.234.567,89' — token indivisível — estica a trilha e a página"
    );
  });

  test("o cartão pode encolher, em vez de empurrar a página", () => {
    assert.match(
      css(), /\.summary-card \{\s*min-width: 0;\s*\}/,
      "item de grade tem `min-width: auto` por padrão e não encolhe abaixo do conteúdo"
    );
  });

  test("a regra vale para OS TRÊS — eles usam a mesma `.summary-grid`", () => {
    // Se algum bloco ganhasse grade própria, a correção deixaria de alcançá-lo.
    const painel = fonte(PAINEL);
    const grades = [...painel.matchAll(/className="summary-grid"/g)].length;
    assert.equal(grades, 3, `esperava as três grades de cartão, achei ${grades}`);
  });
});
