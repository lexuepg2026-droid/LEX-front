// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.5 — clientes: lista, detalhe e formulário (DEC-119 em diante)
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

// ── Item 2 — o avatar (DEC-120) ───────────────────────────────────────────
import { TOTAL_DE_CORES, indiceDaCor, inicialDoNome } from "../../src/components/ui/avatar.js";
import { lerModos, medirPar } from "../helpers/contraste.js";

describe("Fase 3.5 · item 2 — o avatar (DEC-120)", () => {
  test("a inicial: primeira letra, maiúscula, com acento; pula o que não é letra", () => {
    assert.equal(inicialDoNome("ana lima"), "A");
    assert.equal(inicialDoNome("  Ágata"), "Á");
    assert.equal(inicialDoNome("3M do Brasil Ltda"), "M");
    assert.equal(inicialDoNome("éder"), "É");
    assert.equal(inicialDoNome(""), "?");
    assert.equal(inicialDoNome(null), "?");
    assert.equal(inicialDoNome("123"), "?");
  });

  test("a cor é determinística pelo id, de 1 a 8", () => {
    const id = "6ae00c4f962567d45ffc7330";
    assert.equal(indiceDaCor(id), indiceDaCor(id));
    assert.equal(indiceDaCor(id), indiceDaCor(String(id)));
    for (let i = 0; i < 200; i += 1) {
      const n = indiceDaCor(`6ae00c4f962567d45ffc${String(i).padStart(4, "0")}`);
      assert.ok(n >= 1 && n <= TOTAL_DE_CORES);
    }
    assert.equal(indiceDaCor(undefined), 1);
  });

  test("ids em sequência se espalham pelas oito cores", () => {
    const usadas = new Set();
    for (let i = 0; i < 40; i += 1) usadas.add(indiceDaCor(`6ae00c4f962567d45ffc${(0x7300 + i).toString(16)}`));
    assert.equal(usadas.size, TOTAL_DE_CORES);
  });

  test("as oito cores são iguais nos dois modos e a inicial passa 4,5:1 em todas", () => {
    const modos = lerModos();
    const css = readFileSync(join(RAIZ, "src/styles/variables.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(css.slice(css.indexOf("body.light-mode")), /--color-(?:on-)?avatar-/);
    for (let n = 1; n <= TOTAL_DE_CORES; n += 1) {
      assert.equal(modos.escuro[`--color-avatar-${n}`], modos.claro[`--color-avatar-${n}`]);
      const r = medirPar(modos.escuro, { texto: `--color-on-avatar-${n}`, fundo: `--color-avatar-${n}` });
      assert.ok(r.razao >= 4.5, `avatar ${n}: ${r.razao.toFixed(2)}:1`);
    }
  });

  test("o componente é decorativo e tem uma regra por cor", () => {
    const jsx = semComentarios(ler("src/components/ui/Avatar.jsx"));
    assert.match(jsx, /aria-hidden="true"/);
    assert.doesNotMatch(jsx, /title=|role=/);
    const folha = ler("src/components/ui/Avatar.css");
    for (let n = 1; n <= TOTAL_DE_CORES; n += 1) {
      assert.match(folha, new RegExp(`\\.avatar--cor-${n} \\{[^}]*--color-avatar-${n}\\)[^}]*--color-on-avatar-${n}\\)`));
    }
    assert.match(folha, /\.avatar--pequeno/);
    assert.match(folha, /\.avatar--grande/);
  });
});

// ── Item 3 — a lista de clientes (DEC-121) ────────────────────────────────
import {
  FILTROS_DA_LISTA,
  PORTAL_OPTIONS,
  TIPO_PESSOA_OPTIONS_FILTRO,
  consultaDaLista,
  descricaoDoRecorteDeClientes,
  destinoDaLinha,
  documentoNaLista,
  telefoneNaLista,
  temRecorte,
  tipoDoCliente,
} from "../../src/pages/clients/listaClientes.js";
import { filtrosDaUrl, paramsComFiltros, nomeNaUrl } from "../../src/utils/filtrosNaUrl.js";

describe("Fase 3.5 · item 3 — a lista de clientes (DEC-121)", () => {
  const CAMPOS = ["busca", "honorarioId", "de", "ate", ...Object.keys(FILTROS_DA_LISTA)];

  test("a `situacao` da URL é o REGISTRO, e não há chave `status` para confundir", () => {
    // O risco anotado na 3.4: `filtrosNaUrl` escreve a chave `status` como
    // `?situacao=`. Aqui a situação é a própria chave `situacao`, e a lista
    // não pode ter `status` — ela iria para o mesmo parâmetro.
    assert.ok(!("status" in FILTROS_DA_LISTA));
    assert.equal(nomeNaUrl("situacao"), "situacao");
    const lidos = filtrosDaUrl(new URLSearchParams("situacao=inativos&status=encerrado"), CAMPOS);
    assert.equal(lidos.situacao, "inativos");
    assert.ok(!("status" in lidos), "um `?status=` perdido na URL não vira filtro");
    const escrito = paramsComFiltros(new URLSearchParams(""), { situacao: "todos", tipoPessoa: "PJ", portal: "nao_liberado" });
    assert.equal(escrito.toString(), "situacao=todos&tipoPessoa=PJ&portal=nao_liberado");
    assert.equal(paramsComFiltros(escrito, { situacao: "" }).get("situacao"), null, "o padrão sai da URL");
  });

  test("a consulta leva cada filtro, e só os preenchidos", () => {
    assert.deepEqual(consultaDaLista({ ...FILTROS_DA_LISTA }, { page: 1, limit: 20 }), { page: 1, limit: 20, ordem: "nome_asc" });
    assert.deepEqual(
      consultaDaLista({ situacao: "todos", tipoPessoa: "PF", portal: "com_acesso", ordem: "nome_desc" }, { page: 2, limit: 20, busca: "ana" }),
      { page: 2, limit: 20, ordem: "nome_desc", busca: "ana", situacao: "todos", tipoPessoa: "PF", portal: "com_acesso" }
    );
  });

  test("as opções das pílulas são as da decisão 3", () => {
    assert.deepEqual(TIPO_PESSOA_OPTIONS_FILTRO.map((o) => o.value), ["", "PF", "PJ"]);
    assert.deepEqual(PORTAL_OPTIONS.map((o) => o.value), ["", "com_acesso", "sem_acesso", "nao_liberado"]);
    assert.equal(PORTAL_OPTIONS.find((o) => o.value === "nao_liberado").label, "Com processo não liberado");
  });

  test("a ordem não é recorte; a busca e os três filtros são", () => {
    assert.equal(temRecorte({ ordem: "nome_desc" }, ""), false);
    assert.equal(temRecorte({}, "  "), false);
    assert.equal(temRecorte({}, "ana"), true);
    for (const c of ["situacao", "tipoPessoa", "portal"]) assert.equal(temRecorte({ [c]: "x" }, ""), true);
  });

  test("o recorte em português", () => {
    assert.equal(descricaoDoRecorteDeClientes({ filtros: {} }), "");
    assert.equal(
      descricaoDoRecorteDeClientes({ filtros: { tipoPessoa: "PJ", portal: "nao_liberado", situacao: "todos" }, busca: "lt" }),
      'com "lt", pessoa jurídica, com processo não liberado no portal e ativos e desativados'
    );
  });

  test("o desativado não tem destino; o ativo vai ao detalhe", () => {
    assert.equal(destinoDaLinha({ _id: "c1", ativo: false }), null);
    assert.equal(destinoDaLinha({ _id: "c1", ativo: true }), "/dashboard/clientes/detalhe/c1");
  });

  test("tipo, documento e telefone formatados", () => {
    assert.equal(tipoDoCliente({ tipoPessoa: "fisica" }), "Pessoa física");
    assert.equal(tipoDoCliente({ tipoPessoa: "juridica" }), "Pessoa jurídica");
    assert.equal(documentoNaLista({ tipoPessoa: "fisica", cpf: "12345678909" }), "123.456.789-09");
    assert.equal(documentoNaLista({ tipoPessoa: "juridica", cnpj: "11222333000181" }), "11.222.333/0001-81");
    assert.equal(documentoNaLista({ tipoPessoa: "fisica" }), "—");
    assert.equal(telefoneNaLista({ telefone: "42991112233" }), "(42) 99111-2233");
    assert.equal(telefoneNaLista({}), "—");
  });

  test("a tela: o padrão da 3.4, as colunas da decisão 2, e a busca que não desmonta", () => {
    const tela = semComentarios(ler("src/pages/clients/ClientListPage.jsx"));
    assert.match(tela, /useListFilters\(FILTROS_DA_LISTA, \{ naUrl: true \}\)/);
    assert.match(tela, /<CabecalhoDeLista/);
    assert.match(tela, /<FinancialFilters[\s\S]*?semBusca[\s\S]*?pilulas[\s\S]*?semPeriodo/);
    assert.match(tela, /data-table--acoes-fixas/);
    assert.match(tela, /<Paginador/);
    assert.match(tela, /useCachedResource\(\{\s*resource: 'clients'/);
    assert.match(tela, /fromCache && <OfflineNotice/);
    assert.match(tela, /<Avatar id=\{cliente\._id\} nome=\{nome\} tamanho="pequeno" \/>/);
    // Fase 3.7 (DEC-133): os <th> ganharam a classe de prioridade (`prio-2`/`prio-3`); a trava passa a aceitá-la e continua exigindo os mesmos nomes, na mesma ordem e alinhados ao colgroup.
    const cabecalhos = [...tela.matchAll(/<th(?:\s+className="[^"]*")?>([^<]+)<\/th>/g)].map((m) => m[1]);
    assert.deepEqual(cabecalhos, ["Nome / Razão social", "Tipo", "CPF / CNPJ", "E-mail", "Telefone", "Ações"]);
    assert.doesNotMatch(tela, /Endereço|formatEndereco/, "o endereço saiu da lista");
    // F-1a.1: nada de trocar a árvore pelo <Loading/>, nem de devolver o foco à força.
    assert.doesNotMatch(tela, /if \(loading\) return/);
    assert.doesNotMatch(tela, /autoFocus|\.focus\(\)/);
    assert.match(tela, /const loading = carregando && !data/);
    // Sem seleção em massa.
    assert.doesNotMatch(tela, /type="checkbox"/);
  });

  test("a barra sem período: a prop nova só esconde, e sem ela nada muda", () => {
    const barra = semComentarios(ler("src/components/financeiro/FinancialFilters.jsx"));
    assert.match(barra, /semPeriodo = false/);
    assert.match(barra, /\{!semPeriodo && \(\s*<select\s*value=\{presetMostrado\}/);
    assert.match(barra, /\{!semPeriodo && personalizado && \(/);
  });
});

// ── Item 4 — o detalhe do cliente (DEC-123) e o `?clienteId=` (DEC-124) ───
import {
  ABAS,
  abaDaUrl,
  queryDaAba,
  documentoDoCabecalho,
  gruposDeDados,
  vinculoDoCliente,
  listaDeProcessosDoCliente,
  situacaoDoProcessoNoPortal,
  rotuloDoProcesso,
} from "../../src/pages/clients/detalheCliente.js";
import { consultaDaLista as consultaDosProcessos, descricaoDoRecorteDeProcessos, EXTRAS_DA_LISTA } from "../../src/pages/processes/listaProcessos.js";
import { paiDaRota } from "../../src/components/layout/contexto.js";

describe("Fase 3.5 · item 4 — o detalhe do cliente (DEC-123)", () => {
  // Reescrita na Fase 4a2 (DEC-167): a decisão da DEC-123 (sem aba
  // financeira) foi revista pelo Daniel — entra "Financeiro", entre
  // Processos e Portal. O que se protege continua: a lista fechada de abas,
  // a URL decidindo, a padrão sem parâmetro e a aba desconhecida caindo nela.
  test("quatro abas, com Financeiro; a URL decide, e a padrão sai da URL", () => {
    assert.deepEqual(ABAS.map((a) => a.id), ["detalhes", "processos", "financeiro", "portal"]);
    assert.equal(abaDaUrl("?aba=financeiro"), "financeiro");
    assert.equal(abaDaUrl(""), "detalhes");
    assert.equal(abaDaUrl("?aba=portal"), "portal");
    assert.equal(abaDaUrl("?aba=pagamentos"), "detalhes");
    assert.equal(queryDaAba("?aba=portal", "detalhes"), "");
    assert.equal(queryDaAba("", "processos"), "?aba=processos");
    assert.equal(queryDaAba("?x=1", "portal"), "?x=1&aba=portal");
  });

  test("o documento do cabeçalho é formatado e diz o que é", () => {
    assert.deepEqual(documentoDoCabecalho({ tipoPessoa: "fisica", cpf: "12345678909" }), { rotulo: "CPF", valor: "123.456.789-09" });
    assert.deepEqual(documentoDoCabecalho({ tipoPessoa: "juridica", cnpj: "11222333000181" }), { rotulo: "CNPJ", valor: "11.222.333/0001-81" });
    assert.equal(documentoDoCabecalho({ tipoPessoa: "fisica" }), null);
  });

  test("os grupos de dados: PF tem dados profissionais; PJ tem representante", () => {
    const pf = gruposDeDados({ tipoPessoa: "fisica", nomeCompleto: "Ana", profissao: "engenheira", endereco: { cidade: "Ponta Grossa", estado: "PR", cep: "84010000" } });
    assert.deepEqual(pf.map((g) => g.id), ["identificacao", "contato", "endereco", "profissional"]);
    assert.deepEqual(pf.find((g) => g.id === "endereco").itens.find(([r]) => r === "CEP"), ["CEP", "84010-000"]);
    const pj = gruposDeDados({ tipoPessoa: "juridica", razaoSocial: "X Ltda", representanteLegal: { nome: "Rep", cpf: "12345678909" }, observacoes: "nota" });
    assert.deepEqual(pj.map((g) => g.id), ["identificacao", "contato", "endereco", "representante", "observacoes"]);
    assert.equal(pj.find((g) => g.id === "observacoes").largo, true);
    const semRep = gruposDeDados({ tipoPessoa: "juridica" }).find((g) => g.id === "representante");
    assert.deepEqual(semRep.itens, [["Representante", "Não informado"]]);
  });

  test("o papel deste cliente no processo, sem inventar", () => {
    const p = { participantes: [{ clienteId: { _id: "c1" }, papel: "litisconsorte", principal: false }, { clienteId: "c2", papel: "autor", principal: true }] };
    assert.deepEqual(vinculoDoCliente(p, "c1"), { papel: "Litisconsorte", principal: false });
    assert.deepEqual(vinculoDoCliente(p, "c2"), { papel: "Autor", principal: true });
    assert.equal(vinculoDoCliente(p, "c9"), null);
    assert.equal(listaDeProcessosDoCliente("c1"), "/dashboard/processos?clienteId=c1");
  });

  test("a situação no portal: o interruptor só onde a liberação alcança", () => {
    const base = { vinculoAtivo: true, processoAtivo: true };
    assert.deepEqual(situacaoDoProcessoNoPortal({ ...base, liberadoNoPortal: true }, { temSenhaPortal: true }), { status: "portal_liberado", texto: null, interruptor: true });
    assert.deepEqual(situacaoDoProcessoNoPortal({ ...base, liberadoNoPortal: false }, { temSenhaPortal: true }), { status: "portal_nao_liberado", texto: null, interruptor: true });
    assert.equal(situacaoDoProcessoNoPortal(base, { temSenhaPortal: false }).status, "portal_sem_acesso");
    assert.equal(situacaoDoProcessoNoPortal({ ...base, vinculoAtivo: false }, { temSenhaPortal: true }).interruptor, false);
    assert.equal(situacaoDoProcessoNoPortal({ ...base, processoAtivo: false }, { temSenhaPortal: true }).texto, "Processo desativado");
    assert.equal(rotuloDoProcesso({ numeroProcesso: "001", titulo: "T" }), "001 — T");
    assert.equal(rotuloDoProcesso({ titulo: "T" }), "T");
  });

  test("a página: cabeçalho de identidade, ⋮ pelo hook, abas e o contexto", () => {
    const tela = semComentarios(ler("src/pages/clients/ClientDetailPage.jsx"));
    assert.match(tela, /<Avatar id=\{cliente\._id\} nome=\{nome\} tamanho="grande" \/>/);
    assert.match(tela, /\{tipoPorExtenso\(cliente\)\}/);
    assert.match(tela, /className="processo-cabecalho__copiar"/);
    assert.match(tela, /navigator\.clipboard\.writeText\(documento\.valor\)/);
    assert.match(tela, /desativado && <span className="tag-desativado processo-cabecalho__selo">Desativado<\/span>/);
    assert.match(tela, /usePublicarContexto\(\{ clienteId: id, avisoProprio: true \}\)/);
    assert.match(tela, /<ClientTabs aba=\{aba\} \/>/);
    assert.match(tela, /const aba = abaDaUrl\(location\.search\)/);
    assert.match(tela, /aba === 'processos' && <ClientProcessesTab/);
    assert.match(tela, /aba === 'portal' && <ClientPortalTab/);
    // Só leitura: nada de formulário nem de gravação na aba Detalhes.
    assert.doesNotMatch(tela, /<form|<input|updateClient/);
    const abas = semComentarios(ler("src/components/clients/ClientTabs.jsx"));
    assert.match(abas, /aria-current="page"/);
    assert.match(abas, /to=\{\{ search: queryDaAba\(location\.search, id\) \}\}/);
    assert.doesNotMatch(abas, /replace/, "cada troca de aba é uma entrada do histórico — o voltar funciona");
  });

  test("a grade: três colunas no desktop, uma no celular", () => {
    const folha = ler("src/pages/clients/ClientPage.css").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.match(folha, /\.cliente-grade \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    assert.match(folha, /@media \(max-width: 767px\) \{\s*\.cliente-grade \{\s*grid-template-columns: minmax\(0, 1fr\)/);
    assert.doesNotMatch(folha, /(^|[\s;{])(transform|filter)\s*:/m, "os ⋮ abrem em portal (DEC-046)");
  });

  test("as abas sem espelho dizem que não sabem", () => {
    const processos = semComentarios(ler("src/components/clients/ClientProcessesTab.jsx"));
    const portal = semComentarios(ler("src/components/clients/ClientPortalTab.jsx"));
    for (const aba of [processos, portal]) {
      assert.doesNotMatch(aba, /useCachedResource/, "um segundo espelho daria um segundo aviso de idade (DEC-109)");
    }
    assert.match(processos, /indisponíveis sem conexão/);
    assert.match(portal, /indisponível sem conexão/);
    assert.match(processos, /processService\s*\.listProcesses\(\{ clienteId, page, limit: POR_PAGINA \}\)/);
    assert.match(processos, /<Link to=\{listaDeProcessosDoCliente\(clienteId\)\}/);
  });

  test("a aba Portal: o código pela rota dedicada, os interruptores, a entrega e a revogação", () => {
    const portal = semComentarios(ler("src/components/clients/ClientPortalTab.jsx"));
    assert.match(portal, /getAcessoPortal\(clienteId\)/);
    assert.match(portal, /\{situacao\.interruptor && \(\s*<LiberacaoPortal/);
    assert.match(portal, /<AccessDelivery/);
    assert.match(portal, /<RevogacaoPortal clienteId=\{clienteId\}/);
    const resumo = semComentarios(ler("src/components/clients/AcessoPortalResumo.jsx"));
    assert.match(resumo, /Sem acesso ao portal\./);
    assert.match(resumo, /\/dashboard\/clientes\/editar\/\$\{clienteId\}/);
  });
});

describe("Fase 3.5 · item 4 — a lista de processos com `?clienteId=` (DEC-124)", () => {
  test("a consulta leva o cliente, e o recorte o nomeia", () => {
    assert.equal(consultaDosProcessos({}, { page: 1, limit: 20, clienteId: "c1" }).clienteId, "c1");
    assert.ok(!("clienteId" in consultaDosProcessos({}, { page: 1, limit: 20 })));
    assert.equal(descricaoDoRecorteDeProcessos({ cliente: { nome: "Ana" } }), 'do cliente "Ana"');
    assert.equal(descricaoDoRecorteDeProcessos({ cliente: { nome: null } }), "deste cliente");
    assert.deepEqual([...EXTRAS_DA_LISTA], ["clienteId"]);
  });

  test("a faixa: a lista filtrada volta à aba Processos do cliente; sem filtro, nada", () => {
    assert.equal(paiDaRota("/dashboard/processos", "?clienteId=c1"), "/dashboard/clientes/detalhe/c1?aba=processos");
    assert.equal(paiDaRota("/dashboard/processos", ""), null);
    assert.equal(paiDaRota("/dashboard/processos", "?status=ativo"), null);
  });

  test("o chip, o hook e o aviso do cliente do filtro", () => {
    const lista = semComentarios(ler("src/pages/processes/ProcessListPage.jsx"));
    assert.match(lista, /useClienteFiltrado\(\{ avisoProprio: true \}\)/);
    assert.match(lista, /<ProcessFilterChip\s+alvo="cliente"/);
    assert.match(lista, /!fromCache && filtroCliente\.fromCache && <OfflineNotice atualizadoEm=\{filtroCliente\.updatedAt\} \/>/);
    const hook = semComentarios(ler("src/hooks/useClienteFiltrado.js"));
    assert.match(hook, /resource: 'client',\s*params: \{ id: clienteId \}/);
    // Fase 4a2 (DEC-167): o hook passou a repassar o `processoId` da tela
    // (parcelas e pagamentos têm os dois filtros); continua publicando o
    // cliente, com o aviso próprio.
    assert.match(hook, /usePublicarContexto\(\{ processoId, clienteId, avisoProprio \}\)/);
    assert.match(hook, /proximo\.delete\('clienteId'\)/);
    const chip = semComentarios(ler("src/components/ui/ProcessFilterChip.jsx"));
    assert.match(chip, /cliente: \{ titulo: 'Cliente'/);
    assert.match(chip, /só este \{nome\}/);
  });
});

// ── Item 5 — o formulário em seções (DEC-125) ─────────────────────────────
import { montarPayloadCliente } from "../../src/utils/clientePayload.js";

describe("Fase 3.5 · item 5 — o formulário de cliente (DEC-125)", () => {
  const VAZIO = {
    nomeCompleto: "", cpf: "", rg: "", dataNascimento: "", sexo: "", estadoCivil: "", profissao: "", nacionalidade: "brasileira",
    razaoSocial: "", nomeFantasia: "", cnpj: "", repNome: "", repCpf: "", repCargo: "",
    email: "", telefone: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "", pais: "",
    observacoes: "", senhaPortal: ""
  };

  test("criar PF: os campos de PF, os vazios fora (o schema aplica os padrões)", () => {
    const p = montarPayloadCliente(
      { ...VAZIO, nomeCompleto: "Ana Lima", cpf: "123.456.789-09", telefone: "(42) 99111-2233", cep: "84010-000", cidade: "Ponta Grossa" },
      { tipoPessoa: "fisica", isEditing: false }
    );
    assert.equal(p.tipoPessoa, "fisica");
    assert.equal(p.cpf, "12345678909");
    assert.equal(p.telefone, "42991112233");
    assert.equal(p.endereco.cep, "84010000");
    assert.equal(p.rg, undefined, "na criação o vazio vai `undefined`");
    assert.equal(p.nacionalidade, "brasileira");
    assert.ok(!("senhaPortal" in p), "senha em branco não vai");
    assert.ok(!("razaoSocial" in p) && !("representanteLegal" in p));
  });

  test("criar PJ com representante; sem representante, o subdocumento não vai", () => {
    const com = montarPayloadCliente(
      { ...VAZIO, razaoSocial: "X Ltda", nomeFantasia: "X", cnpj: "11.222.333/0001-81", repNome: "Rep", repCpf: "123.456.789-09", senhaPortal: "Provisoria1" },
      { tipoPessoa: "juridica", isEditing: false }
    );
    assert.equal(com.cnpj, "11222333000181");
    assert.deepEqual(com.representanteLegal, { nome: "Rep", cpf: "12345678909", cargo: undefined });
    assert.equal(com.senhaPortal, "Provisoria1");
    assert.ok(!("nomeCompleto" in com) && !("cpf" in com));
    const sem = montarPayloadCliente({ ...VAZIO, razaoSocial: "Y" }, { tipoPessoa: "juridica", isEditing: false });
    assert.equal(sem.representanteLegal, undefined);
  });

  test("editar trocando o tipo e voltando: nada se perde, e o salvo é o do tipo escolhido", () => {
    // O estado da tela guarda os dois tipos (a troca não apaga — F-6.2).
    const estado = {
      ...VAZIO, nomeCompleto: "Ana Lima", cpf: "123.456.789-09", profissao: "engenheira",
      razaoSocial: "Ana ME", nomeFantasia: "Ana", cnpj: "11.222.333/0001-81", email: "ana@x.com"
    };
    const pf1 = montarPayloadCliente(estado, { tipoPessoa: "fisica", isEditing: true });
    const pj = montarPayloadCliente(estado, { tipoPessoa: "juridica", isEditing: true });
    const pf2 = montarPayloadCliente(estado, { tipoPessoa: "fisica", isEditing: true });
    assert.deepEqual(pf2, pf1, "voltar ao tipo anterior devolve o mesmo payload");
    assert.equal(pj.razaoSocial, "Ana ME");
    assert.equal(pj.email, "ana@x.com", "o comum vai nos dois");
    assert.equal(pj.representanteLegal, null, "na edição, o representante vazio vai null (remove)");
    assert.equal(pf1.rg, null, "na edição, o opcional vazio vai null (apaga)");
    assert.equal(pf1.profissao, "engenheira");
  });

  test("as seções, na ordem, e a lógica de antes continua", () => {
    const tela = semComentarios(ler("src/pages/clients/ClientFormPage.jsx"));
    const titulos = [...tela.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]);
    assert.deepEqual(titulos, [
      "Identificação", "Contato", "Endereço", "Dados profissionais", "Representante legal", "Acesso ao portal", "Observações"
    ]);
    assert.match(tela, /\{tipoPessoa === 'fisica' && \(\s*<div className="form-grid section">\s*<h3>Dados profissionais<\/h3>/);
    assert.match(tela, /\{tipoPessoa === 'juridica' && \(\s*<div className="form-grid section">\s*<h3>Representante legal<\/h3>/);
    // DEC-057, CEP, troca de tipo, senha, revogação e erro por campo.
    assert.equal((tela.match(/<CampoComSugestoes/g) ?? []).length, 2);
    assert.match(tela, /onChange=\{handleCepChange\}/);
    assert.match(tela, /onChange=\{\(\) => trocarTipoPessoa\(value\)\}/);
    assert.match(tela, /name="senhaPortal"/);
    assert.match(tela, /<RevogacaoPortal clienteId=\{id\} online=\{online\} onRevogado=\{aoRevogar\} \/>/);
    assert.doesNotMatch(tela, /revogarSenhaPortal/, "a revogação é a do componente, uma só");
    for (const campo of ["cpf", "cnpj", "email", "senhaPortal"]) {
      assert.match(tela, new RegExp(`campoComErro === '${campo}' \\? 'input-erro'`));
    }
    assert.match(tela, /setCampoComErro\(getApiErrorField\(err\)\)/);
  });

  test("offline: o formulário continua fora da fila, recusando com o motivo", () => {
    const tela = semComentarios(ler("src/pages/clients/ClientFormPage.jsx"));
    assert.match(tela, /if \(!online\) return;/);
    assert.match(tela, /aria-disabled=\{online \? undefined : 'true'\}/);
    const fila = ler("src/offline/outboxOperations.js");
    assert.doesNotMatch(fila, /clients/, "criar e editar cliente não entram na fila (F-5b)");
  });
});
