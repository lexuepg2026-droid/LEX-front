// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.7 — financeiro (visão geral) e listas em telas estreitas (DEC-130 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Larguras, foco e pixel ficam na
// verificação no navegador e no roteiro visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── Item 1 — a Visão geral como painel (DEC-130 e DEC-131) ────────────────
import {
  CARTOES_DO_ACUMULADO, CARTAO_VENCIDO_HOJE, CARTAO_SALDO_ADIANTADO, CAMPOS_EM_COMUM,
  notaDasVencidas, notaDoSaldoAdiantado,
} from "../../src/components/dashboard/resumoFinanceiro.js";
import {
  vencidasDoAviso, proximosDoResumo, totalDaLista, ATALHOS, DESTINO_DAS_VENCIDAS, LIMITE_DA_VISAO_GERAL,
} from "../../src/pages/financeiro/visaoGeral.js";
import { TIPOS_DE_DATA } from "../../src/pages/dashboard/inicio.js";

const visao = semComentarios(ler("src/pages/financeiro/FinanceiroPage.jsx"));
const inicio = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));

const vencida = (n, extra = {}) => ({
  natureza: "derivada", origem: "parcela", motivo: "vencida",
  _id: `p${n}`, titulo: `Parcela ${n} de 3`, subtitulo: "Honorários do inventário",
  data: `2026-10-0${n}`, valor: 1000, valorPago: 250, emAberto: 750,
  processo: { _id: "x", numeroProcesso: "0001234-56.2026.8.16.0019", titulo: "Inventário", clientePrincipalNome: "Maria Aparecida" },
  ...extra,
});

describe("Fase 3.7 · item 1 — os dois painéis leem o mesmo resumo (DEC-131)", () => {
  test("os campos em comum são os do resumo pedidos pela decisão 1", () => {
    assert.deepEqual([...CAMPOS_EM_COMUM], ["valorContratado", "recebido", "pendente", "valorVencido", "saldoAdiantado"]);
  });

  test("o Início e a Visão geral importam as MESMAS definições, e nenhum dos dois reescreve um rótulo", () => {
    for (const [nome, fonte] of [["Início", inicio], ["Visão geral", visao]]) {
      assert.match(fonte, /CARTOES_DO_ACUMULADO\.map/, `${nome}: os acumulados pela definição comum`);
      assert.match(fonte, /CARTAO_VENCIDO_HOJE\.label/, `${nome}: o vencido de hoje pela definição comum`);
      assert.match(fonte, /resumo[A-Za-z]*\[CARTAO_VENCIDO_HOJE\.key\]/, `${nome}: o valor pelo campo comum`);
      assert.match(fonte, /notaDasVencidas\(/, `${nome}: a nota das vencidas pela mesma frase`);
      assert.match(fonte, /notaDoSaldoAdiantado\(/, `${nome}: a nota do saldo pela mesma frase`);
      for (const rotulo of ["Valor Contratado (total)", "Recebido (total)", "Em Aberto (total)", "Total vencido hoje"]) {
        assert.ok(!fonte.includes(`'${rotulo}'`) && !fonte.includes(`>${rotulo}<`), `${nome}: "${rotulo}" escrito à mão`);
      }
      assert.match(fonte, /<CartaoDeResumo/, `${nome}: o mesmo componente de cartão`);
    }
    assert.deepEqual(CARTOES_DO_ACUMULADO.map((c) => c.label), ["Valor Contratado (total)", "Recebido (total)", "Em Aberto (total)"]);
    assert.equal(CARTAO_VENCIDO_HOJE.label, "Total vencido hoje");
    assert.equal(CARTAO_SALDO_ADIANTADO.key, "saldoAdiantado");
  });

  test("os dois pedem o resumo da mesma forma: Visão geral sem mês, com a chave do espelho do Início sem mês", () => {
    assert.match(visao, /resource: 'financeSummary',\s*fetcher: \(\) => financeiroService\.getResumo\(\)/);
    assert.match(inicio, /resource: 'financeSummary',/);
  });

  test("a contagem das vencidas sai do sino nos dois (DEC-057)", () => {
    assert.match(visao, /contarParcelasVencidas\(avisos\)/);
    assert.match(inicio, /contarParcelasVencidas\(avisos\)/);
  });

  test("as notas", () => {
    assert.equal(notaDasVencidas(0), "nenhuma parcela vencida");
    assert.equal(notaDasVencidas(1), "1 parcela vencida");
    assert.equal(notaDasVencidas(3), "3 parcelas vencidas");
    const nota = notaDoSaldoAdiantado(500);
    assert.match(nota, /^R\$\u00a0500,00 recebidos como adiantamento/);
    assert.doesNotMatch(nota, /abatido/, "desde a DEC-040 o crédito não abate o em aberto");
  });
});

describe("Fase 3.7 · item 1 — a Visão geral é um painel (DEC-130)", () => {
  test("os balões, nesta ordem: Resumo, Parcelas vencidas, Próximos vencimentos, Atalhos", () => {
    const titulos = [...visao.matchAll(/className="visao-balao__titulo">\s*([^<{]+)/g)].map((m) => m[1].trim());
    assert.deepEqual(titulos, ["Resumo", "Parcelas vencidas", "Próximos vencimentos", "Atalhos"]);
  });

  test("não embute mais as listas, não tem busca nem filtro, e não tem donut", () => {
    assert.doesNotMatch(visao, /FeeListPage|InstallmentListPage|PaymentListPage|embedded/);
    assert.doesNotMatch(visao, /FinancialFilters|useListFilters|Paginador/);
    assert.doesNotMatch(visao, /PieChart|donut|recharts/i);
    for (const lista of ["src/pages/fees/FeeListPage.jsx", "src/pages/installments/InstallmentListPage.jsx", "src/pages/payments/PaymentListPage.jsx"]) {
      assert.doesNotMatch(semComentarios(ler(lista)), /\bembedded\b/, `${lista}: o prop saiu`);
    }
  });

  test("as vencidas: a linha das Datas, com o honorário, o em aberto, \"processo · cliente\" e o destino da parcela", () => {
    const [primeira] = vencidasDoAviso({ parcelasVencidas: [vencida(1)] });
    assert.deepEqual(primeira, {
      chave: "vencida-p1",
      data: "2026-10-01",
      hora: null,
      tipo: "vencida",
      titulo: "Honorários do inventário — Parcela 1 de 3",
      subtitulo: "R$\u00a0750,00 em aberto",
      contexto: "0001234-56.2026.8.16.0019 · Maria Aparecida",
      destino: "/dashboard/parcelas/editar/p1",
    });
    assert.equal(TIPOS_DE_DATA.vencida.rotulo, "Vencida");
  });

  test("as vencidas: até 8, na ordem do servidor; sem o em aberto, não se inventa número", () => {
    const muitas = Array.from({ length: 9 }, (_, i) => vencida(i + 1));
    const linhas = vencidasDoAviso({ parcelasVencidas: muitas });
    assert.equal(LIMITE_DA_VISAO_GERAL, 8);
    assert.equal(linhas.length, 8);
    assert.deepEqual(linhas.map((l) => l.chave).slice(0, 3), ["vencida-p1", "vencida-p2", "vencida-p3"]);
    assert.equal(vencidasDoAviso({ parcelasVencidas: [vencida(1, { emAberto: undefined })] })[0].subtitulo, null);
    assert.deepEqual(vencidasDoAviso(null), []);
    assert.equal(DESTINO_DAS_VENCIDAS, "/dashboard/parcelas?situacao=vencido");
  });

  test("os próximos vencimentos: a função das Datas próximas, só vencimentos, até 8", () => {
    const vencimentos = Array.from({ length: 10 }, (_, i) => ({
      _id: `v${i}`, dataVencimento: `2026-11-${String(10 + i).padStart(2, "0")}`, emAberto: 100,
      descricaoHonorario: "Honorário", numeroParcela: 1, totalParcelas: 2,
      numeroProcesso: "0001", clientePrincipalNome: "Ana",
    }));
    const linhas = proximosDoResumo({ proximosVencimentos: vencimentos });
    assert.equal(linhas.length, 8);
    assert.ok(linhas.every((l) => l.tipo === "vencimento"));
    assert.equal(linhas[0].contexto, "0001 · Ana");
    assert.deepEqual(proximosDoResumo(null), []);
  });

  test("os atalhos: as três listas, o total pela consulta-padrão, e os três \"+\"", () => {
    assert.deepEqual(ATALHOS.map((a) => [a.rotulo, a.para, a.novo.rotulo, a.novo.para]), [
      ["Honorários", "/dashboard/honorarios", "+ Novo honorário", "/dashboard/honorarios/novo"],
      ["Parcelas", "/dashboard/parcelas", "+ Nova parcela", "/dashboard/parcelas/novo"],
      ["Pagamentos", "/dashboard/pagamentos", "+ Registrar pagamento", "/dashboard/pagamentos/novo"],
    ]);
    assert.equal(totalDaLista({ data: { total: 12, data: [{}] } }), 12);
    assert.equal(totalDaLista({ data: { total: 0 } }), 0);
    assert.equal(totalDaLista(undefined), null, "sem resposta, não se diz zero");
    assert.match(visao, /feeService\.listFees\(\{ limit: 1 \}\)/);
    assert.match(visao, /installmentService\.listInstallments\(\{ limit: 1 \}\)/);
    assert.match(visao, /paymentService\.listPayments\(\{ limit: 1 \}\)/);
  });

  test("a linha e o cartão são OS componentes do Início, e o Início também os usa", () => {
    assert.match(visao, /<LinhaDeData key=\{item\.chave\} item=\{item\} \/>/);
    assert.match(inicio, /<LinhaDeData key=\{item\.chave\} item=\{item\} \/>/);
    assert.doesNotMatch(inicio, /className="datas-item__selo"/, "o Início não guarda uma cópia da linha");
  });

  test("offline: um aviso de idade só (o do resumo), e os \"+\" anunciados como desabilitados, com o motivo", () => {
    assert.equal([...visao.matchAll(/<OfflineNotice/g)].length, 1);
    assert.match(visao, /\{fromCache && <OfflineNotice atualizadoEm=\{updatedAt\} \/>\}/);
    assert.match(visao, /aria-disabled="true"\s*aria-describedby="visao-atalhos-motivo"/);
    assert.match(visao, /\{!online && <p id="visao-atalhos-motivo" className="visao-atalhos__motivo">\{MENSAGEM_ESCRITA_OFFLINE\}<\/p>\}/);
    assert.match(visao, /indisponíveis sem conexão/);
  });

  test("erros: a tela não emite toast — o global fala uma vez do servidor fora (DEC-084)", () => {
    assert.doesNotMatch(visao, /toast\./);
    assert.doesNotMatch(visao, /semToastGlobal/);
  });
});

// ── Item 2 — "Situação do registro" em Parcelas (DEC-132) ─────────────────
import {
  REGISTRO_PARCELA_OPTIONS, registroDaUrl, inativosDaConsulta, trechoDoRegistro,
} from "../../src/pages/installments/listaParcelas.js";
import { filtrosDaUrl, paramsComFiltros, paramsSemFiltros } from "../../src/utils/filtrosNaUrl.js";
import { descricaoDoRecorteFinanceiro } from "../../src/components/financeiro/filterSummary.js";

describe("Fase 3.7 · item 2 — a situação do registro em Parcelas (DEC-132)", () => {
  const CAMPOS = ["busca", "status", "registro", "honorarioId", "de", "ate"];
  const parcelas = semComentarios(ler("src/pages/installments/InstallmentListPage.jsx"));

  test("duas opções: \"Somente ativas\" é o padrão (sem parâmetro) e \"Somente desativadas\"", () => {
    assert.deepEqual(REGISTRO_PARCELA_OPTIONS.map((o) => [o.value, o.label]), [
      ["", "Somente ativas"], ["inativos", "Somente desativadas"],
    ]);
    assert.ok(!REGISTRO_PARCELA_OPTIONS.some((o) => o.value === "todos"), "o modo do back é exclusivo (4.5)");
  });

  test("a URL: `?registro=inativos`; sem parâmetro, só as ativas; valor torto abre as ativas", () => {
    assert.equal(registroDaUrl(filtrosDaUrl(new URLSearchParams("registro=inativos"), CAMPOS).registro), "inativos");
    assert.equal(registroDaUrl(filtrosDaUrl(new URLSearchParams(""), CAMPOS).registro), "");
    assert.equal(registroDaUrl("todos"), "");
    assert.equal(registroDaUrl("x"), "");
    assert.equal(paramsComFiltros(new URLSearchParams(), { registro: "inativos" }).toString(), "registro=inativos");
    assert.equal(paramsComFiltros(new URLSearchParams("registro=inativos"), { registro: "" }).toString(), "");
  });

  test("não colide com o status: `?situacao=vencido&registro=inativos` lê os dois", () => {
    const lidos = filtrosDaUrl(new URLSearchParams("situacao=vencido&registro=inativos"), CAMPOS);
    assert.equal(lidos.status, "vencido");
    assert.equal(lidos.registro, "inativos");
  });

  test("o \"Limpar filtros\" alcança a pílula", () => {
    const limpo = paramsSemFiltros(new URLSearchParams("registro=inativos&situacao=vencido&processoId=p1"), CAMPOS, ["processoId"]);
    assert.equal(limpo.toString(), "");
  });

  test("a API recebe o modo do back; a frase de \"Filtros aplicados\" diz a situação", () => {
    assert.equal(inativosDaConsulta("inativos"), "true");
    assert.equal(inativosDaConsulta(""), undefined);
    assert.equal(inativosDaConsulta("todos"), undefined);
    assert.equal(trechoDoRegistro("inativos"), "somente desativadas");
    assert.equal(trechoDoRegistro(""), null);
    const frase = descricaoDoRecorteFinanceiro({ filtros: {}, extras: [trechoDoRegistro("inativos")] });
    assert.match(frase, /somente desativadas/);
  });

  test("a tela: a pílula no lugar do checkbox, com o estado e a consulta pela regra", () => {
    assert.match(parcelas, /useListFilters\(\{ status: '', registro: '' \}, FILTROS_DAS_FINANCEIRAS\)/);
    assert.match(parcelas, /inativos: inativosDaConsulta\(filtros\.registro\)/);
    assert.match(parcelas, /aria-label="Situação do registro"/);
    assert.match(parcelas, /REGISTRO_PARCELA_OPTIONS\.map/);
    assert.doesNotMatch(parcelas, /filter-toggle|type="checkbox"|Mostrar desativadas/);
    assert.doesNotMatch(semComentarios(ler("src/styles/modules.css")), /\.filter-toggle/);
  });
});
