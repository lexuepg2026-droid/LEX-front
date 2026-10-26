// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.2 — LISTAS E FORMULÁRIOS FINANCEIROS
//
// Funções puras executadas de verdade; a fiação das telas por varredura (a
// suíte é `node --test` sem DOM). O que só o olho vê está no roteiro visual e
// na verificação no navegador do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import {
  ESPERA_DA_BUSCA_MS,
  LIMITE_DO_SELETOR_COM_BUSCA,
  MENSAGENS_DO_SELETOR,
  acaoDaBusca,
  sugestoesDaResposta,
  escolhaContinuaValendo,
} from "../../src/utils/seletorComBusca.js";
import { rotuloDoProcessoNoSeletor, rotuloDoHonorarioNoSeletor } from "../../src/utils/feeLabel.js";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ler = (caminho) => readFileSync(join(RAIZ, caminho), "utf8");
const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

// ═══════════════════════════════════════════════════════════════════════════
// Item 2 — os seletores buscam no servidor (DEC-101)
// ═══════════════════════════════════════════════════════════════════════════
describe("3.2 · item 2 — o seletor com busca no servidor", () => {
  test("espera de 300 ms e até 20 sugestões", () => {
    assert.equal(ESPERA_DA_BUSCA_MS, 300);
    assert.equal(LIMITE_DO_SELETOR_COM_BUSCA, 20);
  });

  test("campo vazio não busca; sem sinal avisa; com sinal busca o termo aparado", () => {
    assert.deepEqual(acaoDaBusca("   ", true), { acao: "nada", termo: "" });
    assert.deepEqual(acaoDaBusca("", false), { acao: "nada", termo: "" }, "vazio sem sinal não é erro");
    assert.deepEqual(acaoDaBusca(" joão ", false), { acao: "semConexao", termo: "joão" });
    assert.deepEqual(acaoDaBusca(" joão ", true), { acao: "buscar", termo: "joão" });
  });

  test("as frases: nenhum resultado, sem conexão, erro em linha", () => {
    assert.equal(MENSAGENS_DO_SELETOR.semResultado, "Nenhum resultado.");
    assert.match(MENSAGENS_DO_SELETOR.semConexao, /precisa de conexão/);
    assert.ok(MENSAGENS_DO_SELETOR.erro);
  });

  test("a resposta vira sugestão: filtrada pela regra da tela e cortada em 20", () => {
    const corpo = { data: Array.from({ length: 30 }, (_, i) => ({ _id: String(i), status: i % 3 ? "pendente" : "cancelado" })) };
    const todas = sugestoesDaResposta(corpo);
    assert.equal(todas.length, 20);
    const semCancelado = sugestoesDaResposta(corpo, { filtrar: (f) => f.status !== "cancelado" });
    assert.ok(semCancelado.every((f) => f.status !== "cancelado"), "o pagamento não sugere honorário cancelado");
    assert.deepEqual(sugestoesDaResposta(null), []);
  });

  test("digitar por cima da escolha a desfaz; o próprio rótulo a mantém", () => {
    const item = { _id: "a" };
    const rotulo = () => "Honorário A";
    assert.equal(escolhaContinuaValendo("Honorário A", item, rotulo), true);
    assert.equal(escolhaContinuaValendo("Honorário", item, rotulo), false);
    assert.equal(escolhaContinuaValendo("Honorário A", null, rotulo), false);
  });

  test("rótulo do processo: número — título — cliente principal", () => {
    assert.equal(
      rotuloDoProcessoNoSeletor({ numeroProcesso: "0001", titulo: "Inventário", clientePrincipalId: { tipoPessoa: "fisica", nomeCompleto: "João" } }),
      "0001 — Inventário — João"
    );
    assert.equal(rotuloDoProcessoNoSeletor({ titulo: "Sem número" }), "Sem número");
    assert.equal(rotuloDoProcessoNoSeletor({ numeroProcesso: "0002", titulo: "T", clientePrincipalId: "id-cru" }), "0002 — T",
      "cliente não populado não vira um traço solto");
  });

  test("rótulo do honorário com cliente PJ", () => {
    const fee = { descricao: "Custas", processoId: { numeroProcesso: "9", clientePrincipalId: { tipoPessoa: "juridica", razaoSocial: "Agro" } } };
    assert.equal(rotuloDoHonorarioNoSeletor(fee), "Custas — Processo nº 9 — Agro");
  });

  test("as buscas vão com semToastGlobal e limit 20", () => {
    const fee = semComentarios(ler("src/api/feeService.js"));
    assert.match(fee, /buscarHonorarios = \(busca\) =>\s*api\.get\('\/fees', \{ params: \{ page: 1, limit: LIMITE_DE_SUGESTOES, busca \}, semToastGlobal: true \}\)/);
    assert.match(fee, /LIMITE_DE_SUGESTOES = 20/);
    const proc = semComentarios(ler("src/api/processService.js"));
    assert.match(proc, /buscarProcessos = \(busca\) =>\s*api\.get\('\/processes', \{ params: \{ page: 1, limit: 20, busca \}, semToastGlobal: true \}\)/);
  });

  test("o pagamento filtra o cancelado nas sugestões", () => {
    const fonte = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(fonte, /const podeReceber = \(f\) => f\.status !== 'cancelado'/);
    assert.match(fonte, /filtrar=\{podeReceber\}/);
  });

  test("as três telas recusam salvar sem uma ESCOLHA, e destacam o campo", () => {
    for (const [arquivo, campo] of [
      ["src/pages/fees/FeeFormPage.jsx", "processoId"],
      ["src/pages/installments/InstallmentFormPage.jsx", "feeId"],
      ["src/pages/payments/PaymentFormPage.jsx", "honorarioId"],
    ]) {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, new RegExp(`!formData\\.${campo}\\)[\\s\\S]{0,120}MENSAGENS_DO_SELETOR\\.escolhaDaLista`), arquivo);
      assert.match(fonte, new RegExp(`setCampoComErro\\('${campo}'\\)`), arquivo);
    }
  });

  test("o seletor: sem sinal não pergunta, ignora resposta fora de ordem, espera entre teclas", () => {
    const fonte = semComentarios(ler("src/components/ui/SeletorComBusca.jsx"));
    assert.match(fonte, /acaoDaBusca\(termo, online\)/);
    assert.match(fonte, /if \(meu !== seq\.current\) return;/);
    assert.match(fonte, /setTimeout\([\s\S]*?ESPERA_DA_BUSCA_MS\)/);
    assert.match(fonte, /filtrarLocalmente=\{false\}/);
    assert.doesNotMatch(fonte, /autoFocus/);
  });

  test("o CampoComSugestoes continua sendo o da F-4 sem as props novas (DEC-057)", () => {
    const fonte = semComentarios(ler("src/components/ui/CampoComSugestoes.jsx"));
    assert.match(fonte, /filtrarLocalmente = true/);
    assert.match(fonte, /if \(onEscolher\) onEscolher\(item\);\s*else onChange\(rotulo\(item\)\);/);
    assert.match(fonte, /pode salvar assim mesmo/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Item 4 — situação, período e busca na URL (DEC-103)
// ═══════════════════════════════════════════════════════════════════════════
import {
  nomeNaUrl,
  presetDoIntervalo,
  filtrosDaUrl,
  paramsComFiltros,
  paramsSemFiltros,
  assinaturaDosFiltros,
  substituiNoHistorico,
} from "../../src/utils/filtrosNaUrl.js";
import { PRESETS_PERIODO } from "../../src/components/ui/periodo.js";

describe("3.2 · item 4 — os filtros na URL", () => {
  const OUTUBRO = new Date(Date.UTC(2026, 9, 26, 15));
  const CAMPOS = ["busca", "honorarioId", "de", "ate", "status"];

  test("sem parâmetro é 'Qualquer período' — o padrão não se escreve", () => {
    const f = filtrosDaUrl(new URLSearchParams(""), CAMPOS, { agora: OUTUBRO });
    assert.equal(f.preset, PRESETS_PERIODO.TODOS);
    assert.equal(f.de, "");
    assert.equal(paramsComFiltros(new URLSearchParams("de=2026-10-01"), { de: "" }).toString(), "");
  });

  test("um período que cruza a virada do mês vai e volta inteiro, como intervalo personalizado", () => {
    const params = paramsComFiltros(new URLSearchParams("processoId=p1"), { de: "2026-09-25", ate: "2026-10-05" });
    assert.equal(params.toString(), "processoId=p1&de=2026-09-25&ate=2026-10-05");
    const f = filtrosDaUrl(params, CAMPOS, { agora: OUTUBRO });
    assert.equal(f.de, "2026-09-25");
    assert.equal(f.ate, "2026-10-05");
    assert.equal(f.preset, PRESETS_PERIODO.PERSONALIZADO);
  });

  test("o preset é derivado das datas: mês atual e últimos 6 meses", () => {
    assert.equal(presetDoIntervalo("2026-10-01", "2026-10-31", OUTUBRO), PRESETS_PERIODO.MES_ATUAL);
    assert.equal(presetDoIntervalo("2026-05-01", "2026-10-31", OUTUBRO), PRESETS_PERIODO.ULTIMOS_6_MESES);
    // O mesmo link aberto em novembro diz a verdade: é um intervalo fixo.
    assert.equal(presetDoIntervalo("2026-10-01", "2026-10-31", new Date(Date.UTC(2026, 10, 2))), PRESETS_PERIODO.PERSONALIZADO);
  });

  test("'Intervalo personalizado' sem datas ainda continua personalizado", () => {
    const f = filtrosDaUrl(new URLSearchParams(""), CAMPOS, { personalizado: true, agora: OUTUBRO });
    assert.equal(f.preset, PRESETS_PERIODO.PERSONALIZADO);
  });

  test("status vai como ?situacao=; data torta é ignorada", () => {
    assert.equal(nomeNaUrl("status"), "situacao");
    assert.equal(paramsComFiltros(new URLSearchParams(""), { status: "vencido" }).toString(), "situacao=vencido");
    const f = filtrosDaUrl(new URLSearchParams("situacao=pago&de=26/10/2026&busca=ana"), CAMPOS, { agora: OUTUBRO });
    assert.equal(f.status, "pago");
    assert.equal(f.de, "", "data fora de AAAA-MM-DD não vai ao servidor");
    assert.equal(f.busca, "ana");
  });

  test("limpar tira os filtros e o processoId, e preserva o resto", () => {
    const p = paramsSemFiltros(new URLSearchParams("busca=a&situacao=pago&processoId=x&voltar=/dashboard"), CAMPOS, ["processoId"]);
    assert.equal(p.toString(), "voltar=%2Fdashboard");
  });

  test("a assinatura muda quando um filtro muda (página 1) e não com parâmetro alheio", () => {
    const a = assinaturaDosFiltros(new URLSearchParams("busca=a"), CAMPOS, ["processoId"]);
    assert.notEqual(a, assinaturaDosFiltros(new URLSearchParams("busca=ab"), CAMPOS, ["processoId"]));
    assert.equal(a, assinaturaDosFiltros(new URLSearchParams("busca=a&voltar=/x"), CAMPOS, ["processoId"]));
  });

  test("refinar a busca substitui a entrada do histórico; começar ou apagar cria uma", () => {
    assert.equal(substituiNoHistorico("mar", "mari"), true);
    assert.equal(substituiNoHistorico("", "m"), false);
    assert.equal(substituiNoHistorico("maria", ""), false);
  });

  test("o hook escreve na URL sem rolar a página, e as três listas usam o modo URL fora do Financeiro", () => {
    const hook = semComentarios(ler("src/hooks/useListFilters.js"));
    assert.match(hook, /setSearchParams\(proximo, \{ replace: substituir, preventScrollReset: true \}\)/);
    assert.match(hook, /naUrl: !embedded/);
    for (const arquivo of ["src/pages/fees/FeeListPage.jsx", "src/pages/installments/InstallmentListPage.jsx", "src/pages/payments/PaymentListPage.jsx"]) {
      assert.match(semComentarios(ler(arquivo)), /useListFilters\(\{[^}]*\}, FILTROS_NA_URL\(embedded\)\)/, arquivo);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Item 3 — as listas no padrão da Figura 19 (DEC-102)
// ═══════════════════════════════════════════════════════════════════════════
import { deveSeguirOCliqueDaLinha } from "../../src/components/financeiro/linhaClicavel.js";

describe("3.2 · item 3 — a linha clicável", () => {
  // Um DOM mínimo: a linha contém o que está dentro dela; o portal do menu ⋮
  // não está dentro dela, embora o React propague o clique até a linha.
  const no = (interativo = false) => ({ closest: () => (interativo ? {} : null) });
  const linha = (...dentro) => ({ contains: (n) => dentro.includes(n) });

  test("clique numa célula comum segue", () => {
    const celula = no();
    assert.equal(deveSeguirOCliqueDaLinha({ button: 0, target: celula, currentTarget: linha(celula) }), true);
  });

  test("o link do nome e o gatilho ⋮ resolvem o próprio clique", () => {
    const link = no(true);
    assert.equal(deveSeguirOCliqueDaLinha({ button: 0, target: link, currentTarget: linha(link) }), false);
  });

  test("o painel do menu (portal, fora da linha no DOM) não dispara a linha", () => {
    const itemDoPortal = no();
    assert.equal(deveSeguirOCliqueDaLinha({ button: 0, target: itemDoPortal, currentTarget: linha() }), false);
  });

  test("texto selecionado, modificador ou botão do meio ficam com o navegador", () => {
    const c = no();
    const base = { button: 0, target: c, currentTarget: linha(c) };
    assert.equal(deveSeguirOCliqueDaLinha(base, "texto copiado"), false);
    assert.equal(deveSeguirOCliqueDaLinha({ ...base, ctrlKey: true }), false);
    assert.equal(deveSeguirOCliqueDaLinha({ ...base, metaKey: true }), false);
    assert.equal(deveSeguirOCliqueDaLinha({ ...base, button: 1 }), false);
    assert.equal(deveSeguirOCliqueDaLinha({ ...base, defaultPrevented: true }), false);
  });
});

describe("3.2 · item 3 — as três listas", () => {
  const LISTAS = [
    ["src/pages/fees/FeeListPage.jsx", "Honorários", "Novo honorário", /\/dashboard\/honorarios\/\$\{fee\._id\}/],
    ["src/pages/installments/InstallmentListPage.jsx", "Parcelas", "Nova parcela", /\/dashboard\/parcelas\/editar\/\$\{inst\._id\}/],
    ["src/pages/payments/PaymentListPage.jsx", "Pagamentos", "Registrar pagamento", /\/dashboard\/pagamentos\/editar\/\$\{p\._id\}/],
  ];

  for (const [arquivo, titulo, novo, destino] of LISTAS) {
    const nome = arquivo.split("/").pop();
    test(`${nome}: balão com título, total, busca em pílula e "+" rotulado`, () => {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, /<section className="lista-balao"/);
      assert.match(fonte, new RegExp(`titulo="${titulo}"`));
      assert.match(fonte, /total=\{totalConhecido\}/);
      assert.match(fonte, new RegExp(`novoRotulo="${novo}"`));
      assert.match(fonte, /novoMotivo=\{online \? null : MENSAGEM_ESCRITA_OFFLINE\}/);
      assert.doesNotMatch(fonte, /<PageHeader/);
    });

    test(`${nome}: filtros em pílulas abaixo, sem a busca duplicada`, () => {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, /semBusca=\{!embedded\}/);
      assert.match(fonte, /pilulas=\{!embedded\}/);
    });

    test(`${nome}: a linha inteira leva ao destino, sem virar alvo de Tab`, () => {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, /onClick=\{clicarNaLinha\(/);
      assert.match(fonte, destino);
      assert.doesNotMatch(fonte, /<tr[^>]*tabIndex/, "a linha não é focável");
      assert.match(fonte, /<ActionMenu/, "o menu ⋮ continua na última coluna");
    });

    test(`${nome}: coluna Cliente, e o colgroup acompanha os <th>`, () => {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, /<th>Processo<\/th>\s*<th>Cliente<\/th>/);
      const colgroup = fonte.match(/<colgroup>([\s\S]*?)<\/colgroup>/)[1];
      const thead = fonte.match(/<thead>([\s\S]*?)<\/thead>/)[1];
      assert.equal((colgroup.match(/<col\b/g) || []).length, (thead.match(/<th>/g) || []).length);
      assert.match(fonte, /data-table data-table--fixed/);
      assert.match(fonte, /col-money/);
    });
  }

  test("a reparcelada não abre a edição: leva ao honorário", () => {
    const fonte = semComentarios(ler("src/pages/installments/InstallmentListPage.jsx"));
    assert.match(fonte, /inst\.status === 'cancelado'\) return inst\.feeId\?\._id \? `\/dashboard\/honorarios\/\$\{inst\.feeId\._id\}`/);
  });

  test("o honorário cancelado continua esmaecido", () => {
    assert.match(semComentarios(ler("src/pages/fees/FeeListPage.jsx")), /STATUS_CANCELADO \? ' row-inativa' : ''/);
  });

  test("no balão o hover é o plano elevado (contraste dos badges no escuro)", () => {
    const css = ler("src/components/financeiro/CabecalhoDeLista.css");
    assert.match(css, /\.lista-balao \.data-table tbody tr:hover \{\s*background-color: var\(--color-surface-raised\);/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Item 5 — o cliente nas Datas próximas do Início (DEC-105)
// ═══════════════════════════════════════════════════════════════════════════
import { datasProximas, contextoDoProcesso, LIMITE_DE_DATAS } from "../../src/pages/dashboard/inicio.js";

describe("3.2 · item 5 — {processo} · {cliente} nas Datas próximas", () => {
  test("o contexto junta processo e cliente; sem cliente, só o processo; solto, nada", () => {
    assert.equal(contextoDoProcesso(null, "0001", "Maria"), "0001 · Maria");
    assert.equal(contextoDoProcesso({ numeroProcesso: "0002", titulo: "Inventário" }, null, "João"), "0002 — Inventário · João");
    assert.equal(contextoDoProcesso(null, "0003", null), "0003");
    assert.equal(contextoDoProcesso(null, null, "Sem processo"), null, "cliente sem processo não vira contexto");
  });

  test("as duas fontes levam o cliente até a linha", () => {
    const itens = datasProximas({
      vencimentos: [{ _id: "v", descricaoHonorario: "H", numeroParcela: 1, emAberto: 10, dataVencimento: "2026-10-28T00:00:00.000Z", numeroProcesso: "0001", clientePrincipalNome: "Maria" }],
      eventos: [{ _id: "e", natureza: "evento", titulo: "Audiência", data: "2026-10-27", processo: { _id: "p", numeroProcesso: "0002", titulo: "Ação", clientePrincipalNome: "Agro Ltda" } }],
      hoje: "2026-10-26",
    });
    assert.deepEqual(itens.map((i) => i.contexto), ["0002 — Ação · Agro Ltda", "0001 · Maria"]);
  });

  test("até 8 itens", () => {
    assert.equal(LIMITE_DE_DATAS, 8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Item 6 — confirmações levando ao processo e não liberados no portal (DEC-104)
// ═══════════════════════════════════════════════════════════════════════════
import { destinoDasConfirmacoes, rotuloDaConfirmacaoPorProcesso } from "../../src/pages/dashboard/inicio.js";

describe("3.2 · item 6 — o Início com as duas chaves novas de GET /dashboard", () => {
  test("nenhum processo: número; um: link direto; vários: lista curta", () => {
    assert.deepEqual(destinoDasConfirmacoes(undefined), { tipo: "nenhum", itens: [] });
    assert.deepEqual(destinoDasConfirmacoes([]), { tipo: "nenhum", itens: [] });
    const um = destinoDasConfirmacoes([{ processoId: "p1", quantidade: 2 }]);
    assert.equal(um.tipo, "processo");
    assert.equal(um.destino, "/dashboard/processos/detalhe/p1");
    const varios = destinoDasConfirmacoes([{ processoId: "p1", quantidade: 1 }, { processoId: "p2", quantidade: 3 }]);
    assert.equal(varios.tipo, "lista");
    assert.equal(varios.itens.length, 2);
  });

  test("o rótulo do processo na lista é número — título", () => {
    assert.equal(rotuloDaConfirmacaoPorProcesso({ numeroProcesso: "0001", titulo: "Inventário" }), "0001 — Inventário");
    assert.equal(rotuloDaConfirmacaoPorProcesso({}), "Processo");
  });

  test("a tela: link direto, botão que abre a lista, quantidade no plural certo", () => {
    const fonte = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(fonte, /confirmacoes\.tipo === 'processo'[\s\S]{0,200}<Link key=\{key\} to=\{confirmacoes\.destino\}/);
    assert.match(fonte, /aria-expanded=\{listaDeConfirmacoesAberta\}/);
    assert.match(fonte, /pluralizar\(c\.quantidade, 'confirmação'\)/);
  });

  test("o cartão de não liberados leva à lista COMUM de processos — sem filtro novo", () => {
    const fonte = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(fonte, /Processos não liberados no portal/);
    assert.match(fonte, /summary\.processosNaoLiberados/);
    assert.match(fonte, /<Link to="\/dashboard\/processos" className="card-note card-note--link">/);
    assert.doesNotMatch(fonte, /processos\?liberado/, "o filtro por liberação é da 3.4");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Achados da verificação no navegador (Fase 3.2)
// ═══════════════════════════════════════════════════════════════════════════
describe("3.2 · os três achados do navegador, travados", () => {
  test("duas escritas seguidas na URL partem da query mais recente (data inicial + final)", () => {
    const hook = semComentarios(ler("src/hooks/useListFilters.js"));
    assert.match(hook, /queryAtual\.current = proximo;/);
    for (const chamada of ["paramsComFiltros(queryAtual.current, { [campo]: valor })", "paramsSemFiltros(queryAtual.current, campos, extrasNaLimpeza)"]) {
      assert.ok(hook.includes(chamada), chamada);
    }
    assert.doesNotMatch(hook, /paramsComFiltros\(searchParams/, "a query do render pode estar velha");
  });

  test("nenhuma coluna de texto fica `auto` nas três listas (colapsavam para 0 px a 768)", () => {
    for (const arquivo of ["src/pages/fees/FeeListPage.jsx", "src/pages/installments/InstallmentListPage.jsx", "src/pages/payments/PaymentListPage.jsx"]) {
      const colgroup = semComentarios(ler(arquivo)).match(/<colgroup>([\s\S]*?)<\/colgroup>/)[1];
      assert.doesNotMatch(colgroup, /<col \/>/, arquivo);
    }
  });

  test("recarregar por filtro mantém a tabela; o indicador é só da primeira carga", () => {
    for (const arquivo of ["src/pages/fees/FeeListPage.jsx", "src/pages/installments/InstallmentListPage.jsx", "src/pages/payments/PaymentListPage.jsx"]) {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, /loading: carregando/, arquivo);
      assert.match(fonte, /const loading = carregando && !data;/, arquivo);
      assert.match(fonte, /aria-busy=\{carregando \|\| undefined\}/, arquivo);
    }
    assert.match(ler("src/components/financeiro/CabecalhoDeLista.css"), /\.table-wrapper\[aria-busy="true"\]/);
  });
});
