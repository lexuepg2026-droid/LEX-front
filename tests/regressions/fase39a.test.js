// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.9a — Documentos, parte a: listas, seletor e formulário de seção
// (DEC-138 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Larguras, cores pintadas e
// cliques ficam na verificação no navegador e no roteiro visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  consultaDaLista as consultaDeDocumentos,
  descricaoDoRecorteDeDocumentos,
  destinoDaLinha as destinoDoDocumento,
  destinoDoNovo,
  rotuloDoProcessoNaLinha,
  PRESETS_DA_LISTA,
  EXTRAS_DA_LISTA,
} from "../../src/pages/documents/listaDocumentos.js";
import {
  processoIdDaUrl,
  destinoDaMontagem,
  avisoDeModelosOcultos,
  LIMITE_DA_ESCOLHA_DE_MODELO,
} from "../../src/pages/documents/processoDaGeracao.js";
import {
  consultaDaLista as consultaDeSecoes,
  descricaoDoRecorteDeSecoes,
  destinoDaLinha as destinoDaSecao,
  trechoInicial,
  FILTROS_DA_LISTA as FILTROS_DE_SECOES,
} from "../../src/pages/secoes/listaSecoes.js";
import { voltarDaAgenda, comVoltarDaAgenda, linhaDaAgenda } from "../../src/pages/calendar/agenda.js";
import { voltarValido, destinoDepoisDeSalvar } from "../../src/components/layout/contexto.js";
import { STATUS_PARCELA_OPTIONS, labelDe } from "../../src/utils/enums.js";
import { PRESETS_PERIODO } from "../../src/components/ui/periodo.js";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// O `<colgroup>`, o `<thead>` e a primeira linha do `<tbody>`: a prioridade
// de cada coluna tem de ser a MESMA nos três (DEC-133 — a coluna some
// inteira, e o leitor de tela continua lendo uma tabela coerente).
const prioridades = (fonte) => {
  const cols = [...fonte.slice(fonte.indexOf("<colgroup>"), fonte.indexOf("</colgroup>")).matchAll(/<col className="([^"]*)"/g)]
    .map((m) => (m[1].match(/prio-\d/) ?? ["prio-1"])[0]);
  const ths = [...fonte.slice(fonte.indexOf("<thead>"), fonte.indexOf("</thead>")).matchAll(/<th(?: className="([^"]*)")?>/g)]
    .map((m) => ((m[1] ?? "").match(/prio-\d/) ?? ["prio-1"])[0]);
  const corpo = fonte.slice(fonte.indexOf("<tbody>"));
  const tds = [...corpo.slice(0, corpo.indexOf("</tr>")).matchAll(/<td(?: className=\{?"([^"]*)"\}?)?[ >]/g)]
    .map((m) => ((m[1] ?? "").match(/prio-\d/) ?? ["prio-1"])[0]);
  return { cols, ths, tds };
};

// ── Item 2 — a lista de Documentos (DEC-139) ──────────────────────────────
describe("Fase 3.9a · item 2 — a lista de Documentos no padrão da Figura 19 (DEC-139)", () => {
  const tela = semComentarios(ler("src/pages/documents/DocumentListPage.jsx"));

  test("a consulta: sempre sem modelos, a busca, o período e o processo; vazio não vai", () => {
    assert.deepEqual(
      consultaDeDocumentos({ de: "", ate: "" }, { page: 1, limit: 20 }),
      { page: 1, limit: 20, ehModelo: "false" }
    );
    assert.deepEqual(
      consultaDeDocumentos({ de: "2026-09-30", ate: "2026-10-01" }, { page: 3, limit: 20, busca: "joao", processoId: "abc" }),
      { page: 3, limit: 20, ehModelo: "false", busca: "joao", processoId: "abc", de: "2026-09-30", ate: "2026-10-01" }
    );
  });

  test("a frase dos filtros: busca, processo e período por geração", () => {
    assert.equal(descricaoDoRecorteDeDocumentos({}), "");
    assert.equal(descricaoDoRecorteDeDocumentos({ busca: " maria " }), 'com "maria"');
    const frase = descricaoDoRecorteDeDocumentos({
      busca: "procuracao",
      processo: { rotulo: "0001 — Inventário" },
      filtros: { preset: PRESETS_PERIODO.MES_ATUAL },
    });
    assert.match(frase, /^com "procuracao", .*0001 — Inventário.* e gerados neste mês$/);
  });

  test("o período tem os presets da lista, e o ?processoId= sai no Limpar", () => {
    assert.ok(PRESETS_DA_LISTA.includes(PRESETS_PERIODO.TODOS));
    assert.ok(PRESETS_DA_LISTA.includes(PRESETS_PERIODO.PERSONALIZADO));
    assert.deepEqual([...EXTRAS_DA_LISTA], ["processoId"]);
    assert.match(tela, /useListFilters\(FILTROS_DA_LISTA, \{ naUrl: true, extrasNaLimpeza: EXTRAS_DA_LISTA \}\)/);
    assert.match(tela, /presets=\{PRESETS_DA_LISTA\}/);
    assert.match(tela, /ajudaDoPeriodo=\{AJUDA_DO_PERIODO\}/);
  });

  test("o destino da linha e do \"+\": o texto final; a geração com o processo do filtro", () => {
    assert.equal(destinoDoDocumento({ _id: "d1" }), "/dashboard/documentos/d1/texto");
    assert.equal(destinoDoDocumento(null), null);
    assert.equal(destinoDoNovo(), "/dashboard/documentos/montar?modo=documento");
    assert.equal(destinoDoNovo("p1"), "/dashboard/documentos/montar?modo=documento&processoId=p1");
    assert.equal(rotuloDoProcessoNaLinha({ numeroProcesso: "0001", titulo: "Inventário" }), "0001 — Inventário");
    assert.equal(rotuloDoProcessoNaLinha(null), "—");
  });

  test("a fiação: balão, cabeçalho com total, chip, um aviso de idade, paginador — sem o teto de 100", () => {
    assert.match(tela, /<section className="lista-balao"/);
    assert.match(tela, /<CabecalhoDeLista[\s\S]*?total=\{totalConhecido\}/);
    assert.match(tela, /novoDestino=\{novoDestino\}/);
    assert.match(tela, /<ProcessFilterChip/);
    assert.match(tela, /<Paginador[\s\S]*?rotulo="documento"/);
    assert.match(tela, /resource: 'documents'/);
    assert.doesNotMatch(tela, /limit: 100/);
    assert.doesNotMatch(tela, /ehModelo !== true/, "o filtro dos modelos é do servidor (DEC-138)");
    // DEC-109: um aviso por tela — o da lista, ou o do processo do chip.
    assert.equal((tela.match(/<OfflineNotice /g) ?? []).length, 2);
    assert.match(tela, /\{!fromCache && filtroProcesso\.fromCache && <OfflineNotice/);
    // A linha clicável e o link do nome como alvo de Tab (DEC-102).
    assert.match(tela, /className="linha-clicavel" onClick=\{clicarNaLinha\(destino\)\}/);
    assert.match(tela, /<Link to=\{destino\} className="link-interno">\{documento\.nome\}<\/Link>/);
  });

  test("DEC-133/135: primeira fixa, ⋮ fixo; data e situação prio-1; a prioridade igual em col, th e td", () => {
    assert.match(tela, /data-table--acoes-fixas data-table--primeira-fixa/);
    const { cols, ths, tds } = prioridades(tela);
    assert.deepEqual(cols, ["prio-1", "prio-3", "prio-2", "prio-2", "prio-1", "prio-1", "prio-1"]);
    assert.deepEqual(ths, cols);
    assert.deepEqual(tds, cols);
    assert.match(tela, /<th>Gerado em<\/th>/);
    assert.match(tela, /<th>Situação<\/th>/);
    // O ⋮ e as ações que já existiam.
    for (const rotulo of ["'Abrir'", "'Baixar PDF'", "'Baixar DOCX'", "'Excluir'"]) assert.ok(tela.includes(rotulo), rotulo);
    // Os selos de situação continuam.
    for (const selo of ["editado à mão", "no portal", "gerado"]) assert.ok(tela.includes(`>${selo}<`), selo);
    assert.doesNotMatch(tela, /documento\.titulo/, "o rótulo do ⋮ usa o nome (o documento não tem `titulo`)");
  });
});

// ── A coluna que cede (achado no navegador, DEC-139) ──────────────────────
describe("Fase 3.9a · a coluna de texto cede a sobra, e o ⋮ fica em 120 px (DEC-139)", () => {
  test("col-cede: sem largura a partir de 1024, 220 px abaixo; o Nome e o Trecho a usam", () => {
    const css = semComentarios(ler("src/styles/modules.css"));
    assert.match(css, /@media \(max-width: 1023px\) \{\s*\.data-table--fixed col\.col-cede \{ width: 220px; \}\s*\}/);
    const docs = semComentarios(ler("src/pages/documents/DocumentListPage.jsx"));
    const secoes = semComentarios(ler("src/pages/secoes/SecaoListPage.jsx"));
    assert.match(docs, /<colgroup>\s*<col className="col-cede" \/>/, "o Nome é a primeira e a que cede");
    assert.equal((secoes.match(/className="col-cede"/g) ?? []).length, 1, "em Seções, só o Trecho cede");
    // As outras cinco listas não a usam (a medição delas não mudou).
    for (const f of ["fees/FeeListPage", "installments/InstallmentListPage", "payments/PaymentListPage", "processes/ProcessListPage", "clients/ClientListPage"]) {
      assert.doesNotMatch(ler(`src/pages/${f}.jsx`), /col-cede/, f);
    }
  });
});

// ── Item 3 — o seletor de processo da geração (DEC-140/141) ──────────────
describe("Fase 3.9a · item 3 — o processo da geração por busca; o modelo também (DEC-140/141)", () => {
  const painel = semComentarios(ler("src/components/documents/GenerationPanel.jsx"));
  const montagem = semComentarios(ler("src/pages/documents/DocumentAssemblyPage.jsx"));
  const api = semComentarios(ler("src/api/documentService.js"));

  test("o <select> com teto de 100 virou o SeletorComBusca, com o rótulo de sempre", () => {
    assert.doesNotMatch(painel, /listProcesses/);
    assert.doesNotMatch(painel, /<option key=\{p\._id\}/);
    assert.match(painel, /<SeletorComBusca\s+id="geracao-processo"/);
    assert.match(painel, /buscar=\{buscarProcessos\}/);
    assert.match(painel, /buscarPorId=\{buscarProcessoPorId\}/);
    assert.match(painel, /rotulo=\{rotuloDoProcessoNoSeletor\}/);
    assert.match(painel, /processService\.buscarProcessos\(termo\)/);
    assert.match(painel, /processService\.getProcessById\(pid\)/);
    // O <label htmlFor> continua ligado ao campo.
    assert.match(painel, /<label htmlFor="geracao-processo">/);
  });

  test("DEC-085: o contexto é publicado pelo id escolhido, assim que muda", () => {
    assert.match(painel, /usePublicarContexto\(\{ processoId \}\)/);
    assert.match(painel, /onMudar=\{\(pid\) => setProcessoId\(pid \|\| ''\)\}/);
  });

  test("DEC-086: o ?processoId= da montagem chega escolhido — e só um ObjectId passa", () => {
    const id = "6a70f9a1b2c3d4e5f6a7b8c9";
    assert.equal(processoIdDaUrl(new URLSearchParams(`processoId=${id}`)), id);
    for (const torto of ["xyz", "", "6a70f9", `${id}0`, "<script>"]) {
      assert.equal(processoIdDaUrl(new URLSearchParams(`processoId=${torto}`)), "", torto);
    }
    assert.equal(processoIdDaUrl(null), "");
    assert.match(painel, /useState\(processoIdInicial \|\| ''\)/);
    assert.match(montagem, /processoIdInicial=\{processoIdDaLista\}/);
    // Do cartão de início à montagem, o processo vai junto.
    assert.equal(destinoDaMontagem("m1", "documento", id), `/dashboard/documentos/montar/m1?modo=documento&processoId=${id}`);
    assert.equal(destinoDaMontagem("m1", "modelo"), "/dashboard/documentos/montar/m1?modo=modelo");
    assert.equal((montagem.match(/destinoDaMontagem\(/g) ?? []).length, 2);
  });

  test("o modelo: busca no servidor, semToastGlobal, e o cartão diz quando mostra menos", () => {
    assert.doesNotMatch(montagem, /listModelos\(\{ limit: 100 \}\)/);
    assert.match(montagem, /documentService\s*\.buscarModelos\(/);
    assert.match(api, /api\.get\('\/documents\/modelos', \{ params, semToastGlobal: true \}\)/);
    assert.equal(LIMITE_DA_ESCOLHA_DE_MODELO, 20);
    assert.equal(avisoDeModelosOcultos(7, 7), null);
    assert.equal(avisoDeModelosOcultos(20, 134), "Mostrando 20 de 134 modelos. Busque pelo nome para achar os outros.");
    assert.equal(avisoDeModelosOcultos(20, null), null);
    assert.match(montagem, /<label htmlFor="montagem-busca-modelo">/);
    assert.match(montagem, /'A busca precisa de conexão\. Conecte-se para escolher o modelo\.'/);
  });

  test("regra 12: a fase não tocou assemblyState, a sentinela, as pendências nem a regeração", () => {
    // Os arquivos da 3.9b não são importados de outro jeito, e a montagem
    // continua usando a sentinela da 4.4 e o estado puro.
    assert.match(montagem, /useIsMounted/);
    assert.match(montagem, /from '\.\/assemblyState'|from '\.\/assemblyState\.js'/);
    assert.match(painel, /<PendenciaList|PendenciaList/);
  });
});

// ── Item 4 — a lista e o formulário de Seções (DEC-139/142) ──────────────
describe("Fase 3.9a · item 4 — Seções: a lista no padrão novo e o formulário em seções (DEC-139/142)", () => {
  const lista = semComentarios(ler("src/pages/secoes/SecaoListPage.jsx"));
  const form = semComentarios(ler("src/pages/secoes/SecaoFormPage.jsx"));

  test("os filtros: busca e tipo (que o modelo tem); situação do registro NÃO (a API não lista desativadas)", () => {
    assert.deepEqual({ ...FILTROS_DE_SECOES }, { tipo: "" });
    assert.deepEqual(consultaDeSecoes({ tipo: "" }, { page: 1, limit: 20 }), { page: 1, limit: 20 });
    assert.deepEqual(
      consultaDeSecoes({ tipo: "clausula" }, { page: 2, limit: 20, busca: "qualif" }),
      { page: 2, limit: 20, busca: "qualif", tipo: "clausula" }
    );
    assert.equal(descricaoDoRecorteDeSecoes({ busca: "qualif", filtros: { tipo: "clausula" } }), 'com "qualif" e do tipo "Cláusula"');
    assert.doesNotMatch(lista, /aria-label="Situação/);
    assert.match(lista, /semPeriodo/);
  });

  test("a fiação: balão, total, paginador, espelho com um aviso, linha clicável — sem o teto de 100", () => {
    assert.match(lista, /<section className="lista-balao"/);
    assert.match(lista, /<CabecalhoDeLista[\s\S]*?total=\{totalConhecido\}/);
    assert.match(lista, /<Paginador[\s\S]*?rotulo="seção"/);
    assert.match(lista, /resource: 'secoes'/);
    assert.equal((lista.match(/<OfflineNotice /g) ?? []).length, 1);
    assert.doesNotMatch(lista, /limit: 100/);
    assert.match(lista, /useListFilters\(FILTROS_DA_LISTA, \{ naUrl: true \}\)/);
    assert.equal(destinoDaSecao({ _id: "s1" }), "/dashboard/secoes/editar/s1");
    assert.equal(trechoInicial("a\n\nb"), "a b");
    assert.ok(trechoInicial("x".repeat(200)).endsWith("…"));
  });

  test("DEC-133/135 na lista de Seções; o \"Ver\" e o \"Desativar\" continuam no ⋮", () => {
    assert.match(lista, /data-table--acoes-fixas data-table--primeira-fixa/);
    const { cols, ths, tds } = prioridades(lista);
    assert.deepEqual(cols, ["prio-1", "prio-1", "prio-1", "prio-3", "prio-1"]);
    assert.deepEqual(ths, cols);
    assert.deepEqual(tds, cols);
    for (const rotulo of ["'Ver'", "'Editar'", "'Desativar'"]) assert.ok(lista.includes(rotulo), rotulo);
    assert.match(lista, /<SecaoPreviewModal secao=\{preview\}/);
  });

  test("o formulário: em seções, continua rota, VariableSelector e prévia; todo rótulo ligado por htmlFor", () => {
    for (const h of ["Identificação", "Texto e variáveis"]) assert.ok(form.includes(`<h3>${h}</h3>`), h);
    assert.match(form, /<VariableSelector onInserir=\{inserirVariavel\}/);
    assert.match(form, /<SecaoPreviewModal secao=\{previa\}/);
    assert.match(form, /setPrevia\(\{ titulo: form\.titulo, tipo: form\.tipo, texto: form\.texto \}\)/);
    const ids = new Set([...form.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
    const fors = [...form.matchAll(/htmlFor="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(fors.length >= 3);
    for (const f of fors) assert.ok(ids.has(f), `htmlFor="${f}" sem campo`);
    // Payload igual: só os três campos.
    assert.match(form, /secaoService\.updateSecao\(id, payload\)/);
  });
});

// ── Item 5 — as três correções da 3.8 (DEC-143) ──────────────────────────
describe("Fase 3.9a · item 5 — as três correções da 3.8 (DEC-143)", () => {
  test("Parcelas: \"cancelado\" tem rótulo na frase e é opção do filtro de status", () => {
    assert.equal(labelDe(STATUS_PARCELA_OPTIONS, "cancelado"), "Cancelado");
    assert.notEqual(labelDe(STATUS_PARCELA_OPTIONS, "cancelado"), "—");
    // A frase é montada com o mesmo vocabulário que a pílula oferece.
    const parcelas = semComentarios(ler("src/pages/installments/InstallmentListPage.jsx"));
    assert.match(parcelas, /com status "\$\{labelDe\(STATUS_PARCELA_OPTIONS, filtros\.status\)\}"/);
    assert.match(parcelas, /STATUS_PARCELA_OPTIONS\.map\(o =>/);
  });

  test("o \"Voltar\" do compromisso: mês e vista no ?voltar=, validado, só para o formulário", () => {
    const voltar = voltarDaAgenda({ ano: 2026, mes: 3, vista: "agenda" });
    assert.equal(voltar, "/dashboard/agenda?mes=2026-03&vista=agenda");
    assert.equal(voltarValido(voltar), voltar);
    assert.equal(
      comVoltarDaAgenda("/dashboard/agenda/editar/e1", voltar),
      `/dashboard/agenda/editar/e1?voltar=${encodeURIComponent(voltar)}`
    );
    // A derivada leva ao financeiro (DEC-055) sem o caminho da Agenda.
    assert.equal(comVoltarDaAgenda("/dashboard/parcelas/editar/p1", voltar), "/dashboard/parcelas/editar/p1");
    // A linha da vista Agenda também leva o caminho.
    const linha = linhaDaAgenda({ _id: "e1", natureza: "evento", titulo: "Audiência", data: "2026-03-10" }, voltar);
    assert.match(linha.destino, /^\/dashboard\/agenda\/editar\/e1\?voltar=/);
    // E o formulário lê o valor validado; um externo é ignorado.
    assert.equal(destinoDepoisDeSalvar(voltar, "/dashboard/agenda"), voltar);
    assert.equal(destinoDepoisDeSalvar("https://mal.example/x", "/dashboard/agenda"), "/dashboard/agenda");
  });

  test("a fiação do Voltar: a Agenda manda, o formulário obedece nas três saídas", () => {
    const agenda = semComentarios(ler("src/pages/calendar/CalendarPage.jsx"));
    const form = semComentarios(ler("src/pages/calendar/EventFormPage.jsx"));
    assert.match(agenda, /const voltar = voltarDaAgenda\(\{ ano, mes, vista \}\)/);
    assert.match(agenda, /navigate\(comVoltarDaAgenda\(destino, voltar\)\)/);
    assert.match(agenda, /comVoltar\(`\/dashboard\/agenda\/novo\?data=\$\{chave\}`, voltar\)/);
    assert.doesNotMatch(agenda, /to="\/dashboard\/agenda\/novo"/);
    assert.match(form, /const saida = destinoDepoisDeSalvar\(searchParams\.get\('voltar'\), '\/dashboard\/agenda'\)/);
    assert.doesNotMatch(form, /navigate\('\/dashboard\/agenda'\)/);
    assert.equal((form.match(/navigate\(saida\)/g) ?? []).length, 3);
  });

  test("os dias de fora no claro: um fundo de token, sem opacity, só no modo claro", () => {
    const css = semComentarios(ler("src/pages/calendar/CalendarPage.css"));
    const regra = css.match(/body\.light-mode \.cal-celula--fora \{([^}]*)\}/);
    assert.ok(regra, "a regra do claro existe");
    assert.match(regra[1], /background-color: var\(--color-accent-muted\);/);
    assert.doesNotMatch(css, /opacity/);
    // No escuro, a casa de fora continua transparente.
    assert.match(css, /\.cal-celula--fora \{\s*background-color: transparent;/);
  });
});
