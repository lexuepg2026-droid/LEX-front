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
    const cabecalhos = [...tela.matchAll(/<th>([^<]+)<\/th>/g)].map((m) => m[1]);
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
