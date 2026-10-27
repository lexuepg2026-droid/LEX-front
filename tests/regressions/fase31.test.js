// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.1 — o Início (DEC-098 a DEC-100)
//
// O que a suíte sem DOM consegue provar: as funções puras do mês e das Datas
// próximas, o mês na chave do espelho, as chamadas com e sem `?mes=`, e as
// varreduras da tela (título, ações rápidas, ícones, guarda do toast, 360 px).
// O clique, a seta, o "voltar" e o pixel ficam na verificação no navegador.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  chaveDoMes,
  mesCorrente,
  lerMesDaUrl,
  mesesIguais,
  mesVizinhoNaFaixa,
  paramsDoMes,
  rotuloDoMes,
  seloDaData,
  dataDeCalendario,
  datasProximas,
  janelaDasDatas,
  LIMITE_DE_DATAS,
} from "../../src/pages/dashboard/inicio.js";
import { buildKey } from "../../src/offline/cacheKey.js";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("Fase 3.1 · o mês da URL", () => {
  test("lê AAAA-MM, e o inválido vira null (a tela cai no mês corrente)", () => {
    assert.deepEqual(lerMesDaUrl("2026-10"), { ano: 2026, mes: 10 });
    for (const ruim of [null, "", "2026-13", "2026-00", "2026-1", "26-10", "2026-10-01", "1999-12", "2101-01", "abc"]) {
      assert.equal(lerMesDaUrl(ruim), null, `"${ruim}" deveria ser recusado`);
    }
  });

  test("a faixa é a mesma do backend: 2000 a 2100", () => {
    assert.deepEqual(lerMesDaUrl("2000-01"), { ano: 2000, mes: 1 });
    assert.deepEqual(lerMesDaUrl("2100-12"), { ano: 2100, mes: 12 });
    assert.equal(mesVizinhoNaFaixa({ ano: 2000, mes: 1 }, -1), null, "seta da esquerda desabilitada");
    assert.equal(mesVizinhoNaFaixa({ ano: 2100, mes: 12 }, 1), null, "seta da direita desabilitada");
  });

  test("a virada de ano nas setas", () => {
    assert.deepEqual(mesVizinhoNaFaixa({ ano: 2026, mes: 1 }, -1), { ano: 2025, mes: 12 });
    assert.deepEqual(mesVizinhoNaFaixa({ ano: 2026, mes: 12 }, 1), { ano: 2027, mes: 1 });
    assert.equal(chaveDoMes({ ano: 2026, mes: 3 }), "2026-03");
  });

  test("o mês corrente é o de UTC, o mesmo relógio do backend", () => {
    // 31/10 às 23h em Brasília já é 01/11 em UTC: o servidor responde novembro.
    assert.deepEqual(mesCorrente(new Date("2026-11-01T02:00:00Z")), { ano: 2026, mes: 11 });
    assert.ok(mesesIguais({ ano: 2026, mes: 10 }, { ano: 2026, mes: 10 }));
    assert.ok(!mesesIguais({ ano: 2026, mes: 10 }, null));
  });

  test("ir para outro mês põe ?mes=; voltar ao corrente o TIRA; o resto fica", () => {
    const corrente = { ano: 2026, mes: 10 };
    const atuais = new URLSearchParams("x=1");
    assert.equal(paramsDoMes(atuais, { ano: 2026, mes: 9 }, corrente).toString(), "x=1&mes=2026-09");
    assert.equal(paramsDoMes(new URLSearchParams("x=1&mes=2026-09"), null, corrente).toString(), "x=1");
    assert.equal(paramsDoMes(new URLSearchParams("mes=2026-09"), corrente, corrente).toString(), "");
    assert.equal(atuais.toString(), "x=1", "não altera os parâmetros recebidos");
  });

  test("o rótulo é por extenso, com 'de'", () => {
    assert.equal(rotuloDoMes("2026-10"), "outubro de 2026");
    assert.equal(rotuloDoMes("2027-01"), "janeiro de 2027");
    assert.equal(rotuloDoMes("lixo"), "—");
  });
});

describe("Fase 3.1 · o espelho offline tem uma entrada por mês", () => {
  test("com ?mes=, a chave muda; sem, é a mesma do Financeiro", () => {
    const base = { userId: "u1", resource: "financeSummary" };
    const semMes = buildKey(base);
    const outubro = buildKey({ ...base, params: { mes: "2026-10" } });
    const setembro = buildKey({ ...base, params: { mes: "2026-09" } });
    assert.notEqual(outubro, setembro);
    assert.notEqual(semMes, outubro);
    assert.equal(semMes, buildKey({ ...base, params: undefined }));
  });

  test("a tela põe o mês nos params e mostra o aviso de idade", () => {
    const tela = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(tela, /resource: 'financeSummary',\s*params: mesParaApi \? \{ mes: mesParaApi \} : undefined,/);
    assert.match(tela, /fromCache && <OfflineNotice atualizadoEm=\{updatedAt\} \/>/);
    assert.match(tela, /erroResumo === MENSAGEM_LEITURA_SEM_CACHE/, "mês nunca visitado sem sinal: a frase da F-5a");
  });
});

describe("Fase 3.1 · as chamadas com e sem ?mes=", () => {
  test("sem mês, a chamada é a de antes (sem params)", () => {
    const fin = semComentarios(ler("src/api/financeiroService.js"));
    const dash = semComentarios(ler("src/api/dashboardService.js"));
    assert.match(fin, /api\.get\('\/financeiro\/resumo', mes \? \{ params: \{ mes \} \} : undefined\)/);
    assert.match(dash, /api\.get\('\/dashboard\/honorarios-por-mes', mes \? \{ params: \{ mes \} \} : undefined\)/);
  });

  test("o gráfico mensal é refeito quando o mês muda, e a série termina nele", () => {
    const tela = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(tela, /getFeesByMonth\(mesParaApi\)[\s\S]*?\}, \[mesParaApi\]\);/);
    const graficos = semComentarios(ler("src/pages/dashboard/DashboardCharts.jsx"));
    assert.match(graficos, /preencherMeses\(feesByMonth, referenciaDoMes\(mesReferencia\)\)/);
    assert.match(graficos, /Situação atual \(geral\)/, "os donuts não seguem o mês e dizem isso");
  });
});

describe("Fase 3.1 · Datas próximas", () => {
  const vencimento = (id, data, extra = {}) => ({
    _id: id, descricaoHonorario: "Honorários", numeroParcela: 1, totalParcelas: 3,
    emAberto: 1500, dataVencimento: `${data}T00:00:00.000Z`, numeroProcesso: "0001", ...extra,
  });
  const evento = (id, data, extra = {}) => ({
    _id: id, natureza: "evento", titulo: "Audiência de instrução", subtitulo: "Audiência",
    data, hora: null, concluido: false, processo: { numeroProcesso: "0002", titulo: "Ação X" }, ...extra,
  });

  test("junta as duas fontes por data; no mesmo dia, sem hora antes de com hora", () => {
    const datas = datasProximas({
      vencimentos: [vencimento("v1", "2026-10-28"), vencimento("v2", "2026-10-26")],
      eventos: [evento("e1", "2026-10-28", { hora: "14:00" }), evento("e2", "2026-10-27")],
    });
    assert.deepEqual(datas.map((d) => d.chave), ["vencimento-v2", "compromisso-e2", "vencimento-v1", "compromisso-e1"]);
  });

  test("até 8, e de hoje (o do servidor) em diante", () => {
    const eventos = Array.from({ length: 12 }, (_, i) => evento(`e${i}`, `2026-11-${String(i + 1).padStart(2, "0")}`));
    assert.equal(datasProximas({ eventos }).length, LIMITE_DE_DATAS);
    const comOntem = datasProximas({ eventos: [evento("ontem", "2026-10-24"), evento("hoje", "2026-10-25")], hoje: "2026-10-25" });
    assert.deepEqual(comOntem.map((d) => d.chave), ["compromisso-hoje"]);
  });

  test("só compromissos não concluídos; a derivada do calendário não entra (seria o vencimento em dobro)", () => {
    const datas = datasProximas({
      eventos: [
        evento("feito", "2026-10-26", { concluido: true }),
        { _id: "p1", natureza: "derivada", origem: "parcela", data: "2026-10-26", titulo: "Parcela 1 de 3" },
        evento("aberto", "2026-10-26"),
      ],
    });
    assert.deepEqual(datas.map((d) => d.chave), ["compromisso-aberto"]);
  });

  test("título, subtítulo, contexto, tipo e destino", () => {
    const [v] = datasProximas({ vencimentos: [vencimento("v1", "2026-10-26")] });
    assert.equal(v.tipo, "vencimento");
    assert.match(v.titulo, /^Honorários — Parcela 1 de 3$/);
    assert.match(v.subtitulo, /1\.500,00 em aberto$/);
    assert.equal(v.contexto, "0001");
    assert.equal(v.destino, "/dashboard/parcelas/editar/v1", "o mesmo destino da Agenda (destinoDoItem)");

    const [e] = datasProximas({ eventos: [evento("e1", "2026-10-26", { hora: "09:30" })] });
    assert.equal(e.tipo, "compromisso");
    assert.equal(e.subtitulo, "Audiência · 09:30");
    assert.equal(e.contexto, "0002 — Ação X");
    assert.equal(e.destino, "/dashboard/agenda/editar/e1");
  });

  test("o selo: dia sem zero à esquerda e mês abreviado", () => {
    assert.deepEqual(seloDaData("2026-10-07"), { dia: "7", mes: "out" });
    assert.deepEqual(seloDaData("2026-12-31T00:00:00.000Z"), { dia: "31", mes: "dez" });
    assert.equal(seloDaData(null), null);
    assert.equal(dataDeCalendario("2026-02-03T00:00:00.000Z"), "2026-02-03");
  });

  test("a janela pedida ao calendário: de ontem a +30 dias", () => {
    assert.deepEqual(janelaDasDatas(new Date("2026-10-25T12:00:00Z")), { de: "2026-10-24", ate: "2026-11-24" });
  });

  test("vazio diz 'Nada nos próximos dias.' e a ação leva à Agenda", () => {
    const tela = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(tela, /title="Nada nos próximos dias\."/);
    assert.match(tela, /to="\/dashboard\/agenda" className="ui-btn ui-btn--secondary ui-btn--sm">\s*Ver agenda completa/);
  });
});

describe("Fase 3.1 · a página", () => {
  const tela = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));

  test("o título é Início, e não Dashboard", () => {
    assert.match(tela, /<h1 className="dashboard-title">Início<\/h1>/);
    assert.doesNotMatch(tela, />Dashboard</);
  });

  test("o seletor: duas setas, o mês, e 'Mês atual' só fora do mês corrente", () => {
    assert.match(tela, /aria-label="Mês anterior"/);
    assert.match(tela, /aria-label="Próximo mês"/);
    assert.match(tela, /\{!noMesCorrente && \(\s*<button[\s\S]*?irParaMes\(null\)\}>\s*Mês atual/);
    assert.match(tela, /replace: false/, "o 'voltar' do navegador desfaz a troca");
  });

  test("o bloco do mês diz o mês no título", () => {
    assert.match(tela, /titulo=\{`Em \$\{rotuloMes\}`\}/);
  });

  test("o primeiro clique num bloco que nasce fechado o ABRE (achado no navegador)", () => {
    assert.match(tela, /\[chave\]: !\(prev\[chave\] \?\? PADRAO_FECHADO\.has\(chave\)\)/);
    assert.match(tela, /const PADRAO_FECHADO = new Set\(\['acumulado', 'resumo', 'graficos'\]\);/);
    for (const chave of ["acumulado", "resumo", "graficos"]) {
      assert.match(tela, new RegExp(`estaAberto\\('${chave}', true\\)`), `${chave} nasce fechado e está na lista`);
    }
  });

  test("'Precisa de atenção' só aparece quando há algo", () => {
    assert.match(tela, /\{temAtencao && \(\s*<BlocoDoPainel\s+chave="atencao"/);
  });

  test("sem sinal, as ações rápidas ficam desabilitadas com o motivo", () => {
    assert.match(tela, /aria-disabled="true"/);
    assert.match(tela, /MENSAGEM_ESCRITA_OFFLINE/);
  });

  test("as chamadas que dão toast continuam com a guarda (DEC-084)", () => {
    const toasts = [...tela.matchAll(/toast\.error\(/g)].length;
    const guardadas = [...tela.matchAll(/if \(!jaAvisadoPeloToastGlobal\(err\)\) toast\.error\(/g)].length;
    assert.equal(toasts, 5);
    assert.equal(guardadas, 5);
  });

  test("os ícones dos cartões e o sino vêm do Icone", () => {
    assert.doesNotMatch(tela, /\b(Scale|Users|FileText|FolderOpen|BellRing|Wallet|CalendarClock|CalendarCheck)\b/);
    const sino = semComentarios(ler("src/components/layout/NotificationBell.jsx"));
    assert.match(sino, /<Icone nome="sino" tamanho=\{18\} \/>/);
    assert.doesNotMatch(sino, /from 'lucide-react'/);
  });
});

describe("Fase 3.1 · 360 px e balões", () => {
  // Fase 3.7 (DEC-131): as regras da linha das Datas próximas saíram para a
  // folha do componente `LinhaDeData` (Início e Visão geral do Financeiro), sem
  // mudar um valor. As travas leem as duas folhas.
  const css = ler("src/pages/dashboard/DashboardPage.css") + "\n" + ler("src/components/dashboard/LinhaDeData.css");

  test("as ações rápidas encolhem em três colunas, sem rolagem", () => {
    assert.match(css, /\.inicio-acoes__lista \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);/);
  });

  test("a pílula desce para baixo do título na tela estreita", () => {
    assert.match(css, /@media \(max-width: 480px\) \{[\s\S]*?\.datas-item \{ grid-template-columns: auto minmax\(0, 1fr\); \}\s*\.datas-item__pilula \{ grid-column: 2; justify-self: start; \}/);
  });

  test("o bloco é um balão de surface com 24 px", () => {
    const bloco = ler("src/components/dashboard/BlocoDoPainel.css");
    assert.match(bloco, /\.bloco \{[^}]*background-color: var\(--color-surface\);[^}]*border-radius: 24px;/);
  });

  test("selo e pílulas com tokens do tema (nada de branco sobre #42A5F5)", () => {
    assert.match(css, /\.datas-item__selo \{[^}]*background-color: var\(--color-primary\);[^}]*color: var\(--color-on-primary\);/);
    assert.doesNotMatch(semComentarios(css), /#42A5F5/i);
  });
});
