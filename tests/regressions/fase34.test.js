// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.4 — processo: formulário e lista (DEC-113 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Teclado e pixel ficam no roteiro
// visual do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── Item 1 — DEC-113 ──────────────────────────────────────────────────────
import { aoMudarFila, avisarFilaMudou } from "../../src/offline/outboxEvents.js";

describe("Fase 3.4 · item 1 — a fila avisa quando muda (DEC-113)", () => {
  test("quem assina é avisado, com o usuário; quem cancela, não", () => {
    const recebidos = [];
    const cancelar = aoMudarFila((u) => recebidos.push(u));
    avisarFilaMudou("u1");
    cancelar();
    avisarFilaMudou("u2");
    assert.deepEqual(recebidos, ["u1"]);
  });

  test("um assinante que lança não cala os outros", () => {
    let chegou = false;
    const c1 = aoMudarFila(() => { throw new Error("quebrado"); });
    const c2 = aoMudarFila(() => { chegou = true; });
    avisarFilaMudou("u1");
    c1(); c2();
    assert.equal(chegou, true);
  });

  test("assinar com algo que não é função não quebra", () => {
    const cancelar = aoMudarFila(null);
    assert.equal(typeof cancelar, "function");
    cancelar();
  });

  test("o módulo não conhece axios nem React", () => {
    const codigo = semComentarios(ler("src/offline/outboxEvents.js"));
    assert.doesNotMatch(codigo, /import/);
  });

  test("o interceptor continua sem importar o contexto", () => {
    const axios = semComentarios(ler("src/api/axiosConfig.js"));
    assert.doesNotMatch(axios, /OutboxContext|outboxEvents/);
  });
});

// ── Item 5 — DEC-117 ──────────────────────────────────────────────────────
describe("Fase 3.4 · item 5 — desativar e reativar num hook só (DEC-117)", () => {
  const hook = semComentarios(ler("src/hooks/useDesativacaoProcesso.js"));
  const detalhe = semComentarios(ler("src/pages/processes/ProcessDetailPage.jsx"));
  const lista = semComentarios(ler("src/pages/processes/ProcessListPage.jsx"));

  test("as duas ações e os mesmos textos de antes", () => {
    assert.match(hook, /await processService\.deleteProcess\(id\);\s*toast\.success\('Processo desativado\. Você pode reativá-lo quando quiser\.'\)/);
    assert.match(hook, /await processService\.reactivateProcess\(id\);\s*toast\.success\('Processo reativado\.'\)/);
    assert.match(hook, /'Erro ao desativar processo\.' : 'Erro ao reativar processo\.'/);
    assert.match(hook, /title: modal\.acao === 'reativar' \? 'Reativar processo' : 'Desativar processo'/);
  });

  test("o detalhe vai à lista só depois de desativar de fato", () => {
    assert.match(detalhe, /if \(!recusado && acao === 'desativar'\) navigate\('\/dashboard\/processos'\);/);
  });

  test("a lista refaz a consulta depois de agir", () => {
    assert.match(lista, /useDesativacaoProcesso\(\{ aoConcluir: reload \}\)/);
  });
});

// ── Item 2 — DEC-114 ──────────────────────────────────────────────────────
import { montarPayloadProcesso, FASE_PADRAO } from "../../src/utils/processoPayload.js";

describe("Fase 3.4 · item 2 — o processo nasce ativo (DEC-114)", () => {
  const form = {
    titulo: "Inventário", numeroProcesso: "", tipoAcao: "Inventário", area: "", orgao: "", vara: "",
    comarca: "", status: "suspenso", descricao: "", observacoes: "", dataDistribuicao: "",
    fase: "execucao", liminar: false, liminarObservacao: "", liminarEm: "",
    transitoEmJulgadoEm: "2026-10-01", motivoEncerramento: "acordo",
  };

  test("a criação não leva status, nem trânsito, nem motivo — e leva a fase escolhida", () => {
    const p = montarPayloadProcesso(form, { isEditing: false });
    assert.ok(!("status" in p), "o processo nasce ativo pelo default do back");
    assert.ok(!("transitoEmJulgadoEm" in p));
    assert.ok(!("motivoEncerramento" in p));
    assert.equal(p.fase, "execucao");
    assert.equal(montarPayloadProcesso({ ...form, fase: "" }, { isEditing: false }).fase, FASE_PADRAO);
  });

  test("a edição leva status, trânsito e motivo — e não a fase", () => {
    const p = montarPayloadProcesso(form, { isEditing: true });
    assert.equal(p.status, "suspenso");
    assert.equal(p.transitoEmJulgadoEm, "2026-10-01");
    assert.equal(p.motivoEncerramento, "acordo");
    assert.ok(!("fase" in p));
    const apagado = montarPayloadProcesso({ ...form, transitoEmJulgadoEm: "", motivoEncerramento: "" }, { isEditing: true });
    assert.equal(apagado.transitoEmJulgadoEm, null, "campo apagado envia null");
    assert.equal(apagado.motivoEncerramento, null);
  });

  const tela = semComentarios(ler("src/pages/processes/ProcessFormPage.jsx"));

  test("o seletor de status e a seção de encerramento só existem na edição", () => {
    assert.match(tela, /\{isEditing && \(\s*<div className="form-group span-1">\s*<label htmlFor="status">Status<\/label>/);
    assert.match(tela, /\{isEditing && \(\s*<div className="form-grid section">\s*<h3>Encerramento<\/h3>/);
    assert.doesNotMatch(tela, /charAt\(0\)\.toUpperCase\(\)/, "o rótulo do status sai de statusVisual");
  });

  test("os participantes no visual do detalhe, com o seletor com busca e o selo Principal", () => {
    assert.match(tela, /<SeletorComBusca[\s\S]*?id="clienteParaAdicionar"/);
    assert.match(tela, /p\.principal && <span className="participante-linha__principal">Principal<\/span>/);
    assert.match(tela, /type="radio"\s*name="participantePrincipal"/);
    assert.match(tela, /aria-label=\{`Remover \$\{nome\}`\}/);
  });

  test("o autocomplete de tipo de ação, área e comarca continua (DEC-057)", () => {
    for (const id of ["tipoAcao", "area", "comarca"]) {
      assert.match(tela, new RegExp(`<CampoComSugestoes\\s*id="${id}"`));
    }
  });
});

// ── Item 4 — DEC-116 ──────────────────────────────────────────────────────
import {
  FILTROS_DA_LISTA, SITUACAO_OPTIONS, PORTAL_OPTIONS, PRESETS_DA_LISTA, AJUDA_DO_PERIODO,
  consultaDaLista, opcoesDeTipo, descricaoDoRecorteDeProcessos, destinoDaLinha
} from "../../src/pages/processes/listaProcessos.js";
import { PRESETS_PERIODO } from "../../src/components/ui/periodo.js";
import { NOMES_NA_URL } from "../../src/utils/filtrosNaUrl.js";

describe("Fase 3.4 · item 4 — a lista de processos no padrão da Figura 19 (DEC-116)", () => {
  test("o padrão continua só ativos: situação vazia, fora da URL e fora da consulta", () => {
    assert.equal(FILTROS_DA_LISTA.situacao, "");
    assert.deepEqual(SITUACAO_OPTIONS[0], { value: "", label: "Somente ativos" });
    assert.ok(!("situacao" in consultaDaLista(FILTROS_DA_LISTA, { page: 1, limit: 20 })));
  });

  test("o status jurídico é `andamento` no estado e na URL, e `status` na API", () => {
    // `filtrosNaUrl` escreve `status` como `?situacao=`, que aqui é o registro.
    assert.equal(NOMES_NA_URL.status, "situacao");
    assert.ok(!("status" in FILTROS_DA_LISTA));
    const c = consultaDaLista({ ...FILTROS_DA_LISTA, andamento: "suspenso", situacao: "todos" }, { page: 2, limit: 20 });
    assert.equal(c.status, "suspenso");
    assert.equal(c.situacao, "todos");
    assert.equal(c.page, 2);
  });

  test("todos os filtros chegam à consulta, e os vazios não", () => {
    const c = consultaDaLista(
      { ...FILTROS_DA_LISTA, fase: "execucao", liminar: "com", tipoAcao: "Inventário", portal: "nao_liberado", de: "2026-10-01", ate: "2026-10-31" },
      { page: 1, limit: 20, busca: "wosch" }
    );
    assert.deepEqual(c, {
      page: 1, limit: 20, busca: "wosch", fase: "execucao", liminar: "com",
      tipoAcao: "Inventário", portal: "nao_liberado", de: "2026-10-01", ate: "2026-10-31",
    });
    assert.deepEqual(consultaDaLista(FILTROS_DA_LISTA, { page: 1, limit: 20 }), { page: 1, limit: 20 });
  });

  test("período: só os três presets, com a linha de ajuda sobre o processo sem data", () => {
    assert.deepEqual([...PRESETS_DA_LISTA], [PRESETS_PERIODO.TODOS, PRESETS_PERIODO.MES_ATUAL, PRESETS_PERIODO.PERSONALIZADO]);
    assert.match(AJUDA_DO_PERIODO, /data de distribuição/);
    assert.match(AJUDA_DO_PERIODO, /sem essa data só aparece em “Qualquer período”/);
  });

  test("portal: as três opções da decisão 3", () => {
    assert.deepEqual(PORTAL_OPTIONS.map((o) => o.value), ["", "nao_liberado", "liberado"]);
  });

  test("a opção de tipo da URL nunca some da pílula", () => {
    assert.deepEqual(opcoesDeTipo(["Cobrança", "Inventário"], "Despejo"), ["Despejo", "Cobrança", "Inventário"]);
    assert.deepEqual(opcoesDeTipo(["Cobrança", "Inventário"], "inventario"), ["Cobrança", "Inventário"], "sem acento é a mesma");
    assert.deepEqual(opcoesDeTipo(null, ""), []);
  });

  test("a frase do recorte, em português", () => {
    assert.equal(
      descricaoDoRecorteDeProcessos({
        filtros: { andamento: "ativo", tipoAcao: "Inventário", portal: "nao_liberado", preset: PRESETS_PERIODO.MES_ATUAL },
        busca: "wosch",
      }),
      'com "wosch", com status "Ativo", do tipo "Inventário", com cliente não liberado no portal e distribuídos neste mês'
    );
    assert.equal(descricaoDoRecorteDeProcessos({ filtros: {} }), "");
  });

  test("a linha do desativado não leva a lugar nenhum (o detalhe responderia 404)", () => {
    assert.equal(destinoDaLinha({ _id: "p1", ativo: true }), "/dashboard/processos/detalhe/p1");
    assert.equal(destinoDaLinha({ _id: "p1", ativo: false }), null);
  });

  const lista = semComentarios(ler("src/pages/processes/ProcessListPage.jsx"));

  test("o balão da 3.2: cabeçalho, filtros em pílulas na URL, ações fixas e paginador", () => {
    assert.match(lista, /<CabecalhoDeLista[\s\S]*?total=\{totalConhecido\}[\s\S]*?novoDestino="\/dashboard\/processos\/novo"/);
    // Fase 3.5 (DEC-124): o "Limpar filtros" tira também o `?clienteId=` da
    // aba "Processos" do cliente (`extrasNaLimpeza`). Os filtros continuam na
    // URL, com as mesmas chaves.
    assert.match(lista, /useListFilters\(FILTROS_DA_LISTA, \{ naUrl: true, extrasNaLimpeza: EXTRAS_DA_LISTA \}\)/);
    assert.match(lista, /<FinancialFilters[\s\S]*?semBusca\s*pilulas\s*presets=\{PRESETS_DA_LISTA\}\s*ajudaDoPeriodo=\{AJUDA_DO_PERIODO\}/);
    // Fase 3.7 (DEC-133): + `data-table--primeira-fixa`. Fase 3.8 (DEC-135):
    // `--acoes-sem-nota` saiu — o ⋮ tem 64 px no celular em todas as listas.
    assert.match(lista, /className="data-table data-table--fixed data-table--acoes-fixas data-table--primeira-fixa"/);
    assert.match(lista, /<Paginador[\s\S]*?rotulo="processo"/);
    assert.match(lista, /fromCache && <OfflineNotice atualizadoEm=\{updatedAt\} \/>/);
  });

  test("as colunas, na ordem pedida", () => {
    // Fase 3.7 (DEC-133): os <th> ganharam a classe de prioridade (`prio-2`/`prio-3`); a trava passa a aceitá-la e continua exigindo os mesmos nomes, na mesma ordem e alinhados ao colgroup.
    const ths = [...lista.matchAll(/<th(?:\s+className="[^"]*")?>([^<]+)<\/th>/g)].map((m) => m[1]);
    assert.deepEqual(ths, ["Nº Processo", "Título", "Cliente", "Tipo de ação", "Fase", "Status", "Distribuição", "Ações"]);
  });

  test("sem sanfonas e sem seleção em massa", () => {
    assert.doesNotMatch(lista, /<details|sanfona|aria-expanded/i);
    assert.doesNotMatch(lista, /type="checkbox"/);
  });

  test("a linha não recebe foco extra", () => {
    assert.doesNotMatch(lista, /<tr[^>]*tabIndex/);
  });

  test("a barra de filtros só muda com as props novas (as financeiras não mudam)", () => {
    const barra = semComentarios(ler("src/components/financeiro/FinancialFilters.jsx"));
    assert.match(barra, /presets = Object\.values\(PRESETS_PERIODO\)/);
    assert.match(barra, /ajudaDoPeriodo = null/);
  });
});

// ── Item 6 — DEC-118 ──────────────────────────────────────────────────────
import {
  destinoDasConfirmacoes, destinoDasConfirmacoesDoProcesso, destinoDosNaoLiberados
} from "../../src/pages/dashboard/inicio.js";
import {
  deveRolarParaConfirmacoes, comportamentoDaRolagem, ANCORA_DAS_CONFIRMACOES
} from "../../src/components/processes/detalheProcesso.js";

describe("Fase 3.4 · item 6 — os destinos dos cartões do Início (DEC-118)", () => {
  test("não liberados: um → o processo; vários → a lista filtrada; nenhum → a lista", () => {
    assert.equal(destinoDosNaoLiberados({ processosNaoLiberados: 1, processoNaoLiberadoId: "p1" }).destino, "/dashboard/processos/detalhe/p1");
    assert.equal(destinoDosNaoLiberados({ processosNaoLiberados: 3 }).destino, "/dashboard/processos?portal=nao_liberado");
    assert.equal(destinoDosNaoLiberados({ processosNaoLiberados: 0 }).destino, "/dashboard/processos");
  });

  test("confirmações: um processo → o balão; a lista curta → o balão de cada um", () => {
    assert.equal(destinoDasConfirmacoes([{ processoId: "p1", quantidade: 1 }]).destino, "/dashboard/processos/detalhe/p1#confirmacoes");
    assert.equal(destinoDasConfirmacoesDoProcesso("p2"), "/dashboard/processos/detalhe/p2#confirmacoes");
    const inicio = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(inicio, /<Link to=\{destinoDasConfirmacoesDoProcesso\(c\.processoId\)\}/);
  });

  test("rola só com a âncora, depois de carregar, e uma vez", () => {
    assert.equal(ANCORA_DAS_CONFIRMACOES, "#confirmacoes");
    assert.equal(deveRolarParaConfirmacoes("#confirmacoes", { carregado: true, jaRolou: false }), true);
    assert.equal(deveRolarParaConfirmacoes("#confirmacoes", { carregado: false, jaRolou: false }), false, "o balão ainda não existe");
    assert.equal(deveRolarParaConfirmacoes("#confirmacoes", { carregado: true, jaRolou: true }), false);
    assert.equal(deveRolarParaConfirmacoes("", { carregado: true, jaRolou: false }), false);
  });

  test("respeita prefers-reduced-motion", () => {
    assert.equal(comportamentoDaRolagem(true), "auto");
    assert.equal(comportamentoDaRolagem(false), "smooth");
    const detalhe = semComentarios(ler("src/pages/processes/ProcessDetailPage.jsx"));
    assert.match(detalhe, /matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/);
  });

  test("chegar ao balão não marca nada: a rolagem não chama a marcação", () => {
    const detalhe = semComentarios(ler("src/pages/processes/ProcessDetailPage.jsx"));
    const efeito = detalhe.slice(detalhe.indexOf("deveRolarParaConfirmacoes(hash"), detalhe.indexOf("}, [hash, processo]);"));
    assert.doesNotMatch(efeito, /marcarConfirmacoesVistas|listProcessConfirmacoes|abrirConfirmacoes/);
    assert.equal((detalhe.match(/marcarConfirmacoesVistas/g) ?? []).length, 1, "a DEC-112 continua: um ponto só marca");
  });
});

// ── Achado no navegador — "Intervalo personalizado" a partir de "Mês atual" ──
import { filtrosDaUrl } from "../../src/utils/filtrosNaUrl.js";

describe("Fase 3.4 · achado — a escolha de 'Intervalo personalizado' vale com datas na URL", () => {
  const OUTUBRO = new Date(Date.UTC(2026, 9, 26, 15));
  const CAMPOS = ["busca", "de", "ate"];
  const mesAtual = new URLSearchParams("de=2026-10-01&ate=2026-10-31");

  test("com as datas do mês atual e a escolha explícita, é personalizado", () => {
    assert.equal(filtrosDaUrl(mesAtual, CAMPOS, { personalizado: true, agora: OUTUBRO }).preset, PRESETS_PERIODO.PERSONALIZADO);
  });

  test("sem a escolha explícita, o preset continua derivado das datas", () => {
    assert.equal(filtrosDaUrl(mesAtual, CAMPOS, { agora: OUTUBRO }).preset, PRESETS_PERIODO.MES_ATUAL);
  });

  test("os outros presets e o Limpar desligam a escolha", () => {
    const hook = semComentarios(ler("src/hooks/useListFilters.js"));
    assert.match(hook, /setPersonalizado\(preset === PRESETS_PERIODO\.PERSONALIZADO\);/);
    assert.match(hook, /const limpar = useCallback\(\(\) => \{\s*setPersonalizado\(false\);/);
  });
});

describe("Fase 3.4 · achado — o balão das confirmações fica alinhado enquanto a página cresce", () => {
  const detalhe = semComentarios(ler("src/pages/processes/ProcessDetailPage.jsx"));
  test("re-alinha só por um tempo, e para no primeiro gesto dela", () => {
    assert.match(detalhe, /const JANELA_DE_ALINHAMENTO_MS = 2500;/);
    assert.match(detalhe, /const GESTOS = \['wheel', 'touchstart', 'keydown', 'mousedown'\];/);
    assert.match(detalhe, /new ResizeObserver\(\(\) => \{ if \(ativo\) balao\.scrollIntoView\(\{ behavior: 'auto', block: 'start' \}\); \}\)/);
    assert.match(detalhe, /observador\?\.disconnect\(\);/);
  });
});
