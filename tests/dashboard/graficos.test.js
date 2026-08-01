// ═══════════════════════════════════════════════════════════════════════════
// GRÁFICOS DO DASHBOARD — legenda, cores e a série do eixo (Fase 4.3)
//
// Três defeitos de leitura originaram este arquivo:
//   1. os donuts não tinham legenda nenhuma — três anéis coloridos, sem nada
//      dizendo o que cada cor significava;
//   2. as cores vinham de um segundo mapa, escrito à mão dentro do gráfico,
//      que já divergia do `StatusBadge`: "Ativo" era dourado no donut e verde
//      no badge da listagem;
//   3. um mês sem honorário sumia do eixo, e fevereiro aparecia colado em maio
//      com a distância de dois meses consecutivos.
//
// A suíte não tem DOM. O que se prova aqui é o DADO que a legenda e os eixos
// recebem — que é onde os três defeitos moravam — mais a varredura estática de
// que o componente continua lendo a fonte única de cor em vez de reintroduzir
// um mapa próprio.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  STATUS_VISUAL, COR_DO_TOM, corDoStatus, rotuloDoStatus, tomDoStatus,
} from "../../src/utils/statusVisual.js";
import { preencherMeses, toChartData } from "../../src/utils/chartSeries.js";
import { formatMonthKey, formatCurrencyCompact } from "../../src/utils/formatters.js";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ler = (caminho) => readFileSync(resolve(RAIZ, caminho), "utf8");

// Comentário fora antes de varrer: um comentário explicando "não se escreve
// mapa de cor aqui" derrubaria a própria varredura que o explica, e a saída
// óbvia seria apagar o comentário. Mesma regra das varreduras da Fase 4.2.
const semComentario = (fonte) =>
  fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("cor de gráfico É cor de badge", () => {
  test("cada tom da fonte única tem regra `.status-badge--<tom>` no CSS", () => {
    // A ponta do badge. Se alguém acrescentar um tom em `statusVisual.js` sem
    // a regra correspondente, o badge sai sem cor e a fatia sai colorida — os
    // dois deixariam de bater sem ninguém notar.
    const css = ler("src/components/ui/StatusBadge.css");
    for (const tom of Object.keys(COR_DO_TOM)) {
      assert.ok(
        css.includes(`.status-badge--${tom}`),
        `o tom "${tom}" não tem regra em StatusBadge.css`
      );
    }
  });

  test("cada tom aponta para uma variável CSS declarada em `variables.css`", () => {
    // A ponta do gráfico: `corDoStatus` devolve `var(--…)` que o Recharts
    // repassa ao `fill` do SVG. Variável inexistente pinta transparente.
    const variaveis = ler("src/styles/variables.css");
    for (const [tom, cor] of Object.entries(COR_DO_TOM)) {
      const nome = cor.match(/var\((--[a-z-]+)\)/)?.[1];
      assert.ok(nome, `o tom "${tom}" não usa var(--…): ${cor}`);
      assert.ok(
        variaveis.includes(`${nome}:`),
        `a variável ${nome} (tom "${tom}") não existe em variables.css`
      );
    }
  });

  test("os status que o donut recebe do backend têm rótulo e cor", () => {
    // Os enums reais de `/api/dashboard/status`: `Process.status`,
    // `Fee.status` (DEC-028) e `Installment.status`.
    const doBackend = [
      "ativo", "encerrado", "suspenso",
      "pendente", "parcialmente_pago", "pago", "cancelado",
      "vencido", "parcial",
    ];

    for (const status of doBackend) {
      assert.ok(STATUS_VISUAL[status], `status "${status}" sem entrada na fonte única`);
      assert.notEqual(rotuloDoStatus(status), status, `"${status}" saiu como a chave crua`);
      assert.match(corDoStatus(status), /^var\(--/, `"${status}" sem cor`);
    }
  });

  test("`parcialmente_pago` deixou de cair no cinza de desconhecido", () => {
    // Nasceu na DEC-028 e não estava em mapa nenhum: o badge do honorário
    // exibia a string crua do enum, com sublinhado, e a fatia saía cinza —
    // do mesmo cinza dos cancelados.
    assert.equal(rotuloDoStatus("parcialmente_pago"), "Parcialmente pago");
    assert.equal(tomDoStatus("parcialmente_pago"), "info");
    assert.notEqual(tomDoStatus("parcialmente_pago"), "neutral");
  });

  test("os donuts não reintroduzem um mapa de cor próprio", () => {
    // A varredura que trava o defeito de origem. Um `STATUS_COLORS` local no
    // gráfico é exatamente o que fez "Ativo" ser dourado ali e verde no badge.
    const fonte = semComentario(ler("src/pages/dashboard/DashboardCharts.jsx"));

    assert.match(fonte, /from '\.\.\/\.\.\/utils\/statusVisual\.js'/,
      "o gráfico deixou de importar a fonte única de cor");
    assert.match(fonte, /corDoStatus\(/, "o gráfico não usa mais `corDoStatus`");
    assert.doesNotMatch(fonte, /STATUS_COLORS/,
      "voltou a existir um mapa de cor dentro do gráfico");
    assert.doesNotMatch(fonte, /var\(--color-(success|warning|danger|info)\)/,
      "o gráfico voltou a escrever cor de status à mão");
  });

  test("o badge lê a mesma fonte única", () => {
    const fonte = semComentario(ler("src/components/ui/StatusBadge.jsx"));
    assert.match(fonte, /from '\.\.\/\.\.\/utils\/statusVisual\.js'/);
    // A classe continua montada por template string — é o falso positivo
    // conhecido da varredura de CSS, e ela precisa continuar reconhecendo-o.
    assert.match(fonte, /status-badge--\$\{/);
  });
});

describe("legenda do donut", () => {
  // O cenário: o que `GET /api/dashboard/status` devolve para as parcelas do
  // seed, na forma `{ status: contagem }`.
  const CONTAGENS = { pendente: 8, pago: 6, vencido: 6, parcial: 2 };

  test("a legenda tem uma linha por fatia, com rótulo, cor e quantidade", () => {
    const data = toChartData(CONTAGENS);

    // Exatamente o que `<ChartLegend>` renderiza por item.
    const legenda = data.map((fatia) => ({
      rotulo: rotuloDoStatus(fatia.name),
      cor: corDoStatus(fatia.name),
      quantidade: fatia.value,
      percentual: fatia.percentual,
    }));

    console.log("\n  ── LEGENDA RENDERIZADA (parcelas) ──");
    for (const l of legenda) {
      console.log(`     ${l.cor.padEnd(28)} ${l.rotulo.padEnd(20)} ${l.quantidade}  (${l.percentual}%)`);
    }
    console.log("");

    assert.equal(legenda.length, 4, "uma linha por status presente");
    assert.deepEqual(
      legenda.map((l) => l.rotulo),
      ["Pendente", "Pago", "Vencido", "Parcial"],
      "os rótulos da legenda são os do badge, não as chaves do enum"
    );
    assert.deepEqual(
      legenda.map((l) => l.cor),
      [
        "var(--color-warning)",
        "var(--color-success)",
        "var(--color-danger)",
        "var(--color-info)",
      ],
      "as cores da legenda deixaram de ser as dos badges"
    );
    assert.deepEqual(legenda.map((l) => l.quantidade), [8, 6, 6, 2]);
  });

  test("as fatias vêm da maior para a menor e os percentuais fecham em 100", () => {
    const data = toChartData(CONTAGENS);
    const valores = data.map((d) => d.value);
    assert.deepEqual(valores, [...valores].sort((a, b) => b - a));

    const soma = data.reduce((s, d) => s + d.percentual, 0);
    assert.ok(Math.abs(soma - 100) < 0.5, `os percentuais somaram ${soma}`);
  });

  test("status zerado não vira fatia invisível na legenda", () => {
    const data = toChartData({ pendente: 3, cancelado: 0 });
    assert.deepEqual(data.map((d) => d.name), ["pendente"]);
  });

  test("sem contagem nenhuma a série é vazia — a tela mostra o estado próprio", () => {
    // É o que faz o componente cair no "Sem dados no período" em vez de
    // desenhar um anel vazio, que parece falha de carregamento.
    assert.deepEqual(toChartData({}), []);
    assert.deepEqual(toChartData(null), []);
    assert.deepEqual(toChartData({ pago: 0 }), []);
  });
});

describe("série do gráfico de barras", () => {
  const REFERENCIA = new Date(Date.UTC(2026, 7, 1)); // agosto de 2026

  test("mês sem honorário aparece zerado, e não como buraco no eixo", () => {
    const doBackend = [
      { mes: "2026-04", total: 3000 },
      { mes: "2026-07", total: 12000 },
    ];

    const serie = preencherMeses(doBackend, REFERENCIA);

    assert.deepEqual(serie, [
      { mes: "2026-03", total: 0 },
      { mes: "2026-04", total: 3000 },
      { mes: "2026-05", total: 0 },
      { mes: "2026-06", total: 0 },
      { mes: "2026-07", total: 12000 },
      { mes: "2026-08", total: 0 },
    ]);
  });

  test("a janela é sempre de seis meses e termina no mês de referência", () => {
    const serie = preencherMeses([], REFERENCIA);
    assert.equal(serie.length, 6);
    assert.equal(serie[serie.length - 1].mes, "2026-08");
    assert.ok(serie.every((m) => m.total === 0));
  });

  test("a janela atravessa a virada do ano", () => {
    const serie = preencherMeses([{ mes: "2025-12", total: 500 }], new Date(Date.UTC(2026, 1, 1)));
    assert.deepEqual(serie.map((m) => m.mes), [
      "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02",
    ]);
    assert.equal(serie.find((m) => m.mes === "2025-12").total, 500);
  });

  test("mês fora da janela não é arrastado para dentro", () => {
    const serie = preencherMeses([{ mes: "2025-01", total: 99999 }], REFERENCIA);
    assert.ok(serie.every((m) => m.total === 0), "um mês antigo entrou na janela");
  });

  test("o eixo e o rótulo da barra falam português", () => {
    assert.equal(formatMonthKey("2026-08"), "agosto/2026");
    assert.equal(formatMonthKey("2026-08", { curto: true }), "ago/2026");
    // O "k" do inglês saiu: `Intl` com `notation: "compact"` diz "mil".
    assert.match(formatCurrencyCompact(12000), /mil/);
    assert.doesNotMatch(formatCurrencyCompact(12000), /k/);
    assert.equal(formatCurrencyCompact(null), "—");
  });

  test("o título da barra diz o que a barra mede", () => {
    // A rota soma `Fee.valor` agrupando por `createdAt`: é valor CONTRATADO,
    // pelo mês de cadastro da cobrança. "Honorários por mês" deixava a
    // advogada livre para ler aquilo como faturamento do mês.
    const fonte = ler("src/pages/dashboard/DashboardCharts.jsx");
    assert.match(fonte, /Honorários contratados por mês de cadastro/);
  });
});
