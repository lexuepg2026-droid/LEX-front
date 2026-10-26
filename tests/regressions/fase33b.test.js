// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.3b — o detalhe do processo (DEC-109 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Teclado e pixel ficam no roteiro
// visual do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  avisoProprioPara, faixaMostraAviso, idsPublicadosPara
} from "../../src/components/layout/contexto.js";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── Item 1 — DEC-109 ──────────────────────────────────────────────────────
describe("Fase 3.3b · item 1 — um aviso de idade por tela (DEC-109)", () => {
  const DETALHE = "/dashboard/processos/detalhe/p1";
  const publicadoPeloDetalhe = { pathname: DETALHE, processoId: "p1", clienteId: null, avisoProprio: true };

  test("sem sinal, no detalhe do processo, aparece UM aviso: o da tela", () => {
    // A tela e a faixa leem o mesmo processo pelo espelho: sem sinal, as duas
    // vêm do espelho. A tela mostra o dela; a faixa, não.
    const avisoProprio = avisoProprioPara(publicadoPeloDetalhe, DETALHE);
    const daTela = 1;
    const daFaixa = faixaMostraAviso({ fromCache: true, avisoProprio }) ? 1 : 0;
    assert.equal(daTela + daFaixa, 1);
  });

  test("tela sem aviso próprio continua com o aviso da faixa", () => {
    const formulario = { pathname: "/dashboard/honorarios/novo", processoId: "p1", clienteId: null, avisoProprio: false };
    assert.equal(faixaMostraAviso({ fromCache: true, avisoProprio: avisoProprioPara(formulario, formulario.pathname) }), true);
  });

  test("com sinal, nenhum aviso", () => {
    assert.equal(faixaMostraAviso({ fromCache: false, avisoProprio: false }), false);
    assert.equal(faixaMostraAviso({ fromCache: false, avisoProprio: true }), false);
  });

  test("a dispensa é casada com o caminho: não vale na tela seguinte", () => {
    assert.equal(avisoProprioPara(publicadoPeloDetalhe, "/dashboard/honorarios/novo"), false);
    assert.equal(avisoProprioPara(null, DETALHE), false);
    // Só `true` dispensa; qualquer outra coisa mantém o aviso da faixa.
    assert.equal(avisoProprioPara({ ...publicadoPeloDetalhe, avisoProprio: "sim" }, DETALHE), false);
  });

  test("os ids publicados não mudaram de forma", () => {
    assert.deepEqual(idsPublicadosPara(publicadoPeloDetalhe, DETALHE), { processoId: "p1", clienteId: null });
  });

  test("a faixa consulta a dispensa do caminho atual", () => {
    const faixa = semComentarios(ler("src/components/layout/FaixaContexto.jsx"));
    assert.match(faixa, /const avisoProprio = useAvisoProprioPublicado\(location\.pathname\)/);
  });
});

// ── Item 5 — DEC-110 ──────────────────────────────────────────────────────
import { rotuloDoClienteNoSeletor, documentoFormatado } from "../../src/utils/clienteLabel.js";

describe("Fase 3.3b · item 5 — o seletor de participante busca no servidor (DEC-110)", () => {
  test("rótulo: nome — CPF formatado", () => {
    assert.equal(
      rotuloDoClienteNoSeletor({ tipoPessoa: "fisica", nomeCompleto: "João Conceição", cpf: "79426153837" }),
      "João Conceição — 794.261.538-37"
    );
  });

  test("rótulo: razão social — CNPJ formatado", () => {
    assert.equal(
      rotuloDoClienteNoSeletor({ tipoPessoa: "juridica", razaoSocial: "Padaria Pão Quente Ltda", cnpj: "11222333000181" }),
      "Padaria Pão Quente Ltda — 11.222.333/0001-81"
    );
  });

  test("sem documento, só o nome; sem cliente, nada", () => {
    assert.equal(rotuloDoClienteNoSeletor({ tipoPessoa: "fisica", nomeCompleto: "Ana" }), "Ana");
    assert.equal(rotuloDoClienteNoSeletor(null), "");
    assert.equal(documentoFormatado(undefined), "");
  });

  const form = semComentarios(ler("src/pages/processes/ProcessFormPage.jsx"));

  test("o formulário não carrega mais os 100 primeiros clientes", () => {
    assert.doesNotMatch(form, /getAllClients/);
    assert.doesNotMatch(form, /limit: 100/);
    assert.doesNotMatch(form, /<select\s+id="clienteParaAdicionar"/);
  });

  test("o seletor é o SeletorComBusca, com o rótulo da fonte única e sem quem já participa", () => {
    assert.match(form, /<SeletorComBusca[\s\S]*?id="clienteParaAdicionar"[\s\S]*?rotulo=\{rotuloDoClienteNoSeletor\}[\s\S]*?filtrar=\{aindaNaoParticipa\}/);
    const servico = semComentarios(ler("src/api/clientService.js"));
    assert.match(servico, /buscarClientes = \(busca\) =>\s*api\.get\('\/clients', \{ params: \{ page: 1, limit: 20, busca \}, semToastGlobal: true \}\)/);
  });

  test("o cliente exibido não viaja no payload da criação", () => {
    // `participantes` continua { clienteId, papel, principal }; o objeto do
    // cliente mora em `clientesConhecidos`.
    assert.match(form, /createProcess\(\{ \.\.\.payload, clientes: participantes \}\)/);
    assert.doesNotMatch(form, /setParticipantes\([^)]*cliente:/);
    assert.match(form, /const cliente = clientesConhecidos\[p\.clienteId\]/);
  });
});

// ── Itens 2, 3 e 4 — DEC-111 e DEC-112 ────────────────────────────────────
import {
  situacaoNoPortal, temInterruptor, classeDaBolinha, deveMarcarComoVistas, SITUACOES_NO_PORTAL
} from "../../src/components/processes/detalheProcesso.js";
import { STATUS_VISUAL, COR_DO_TOM } from "../../src/utils/statusVisual.js";

const DETALHE = semComentarios(ler("src/pages/processes/ProcessDetailPage.jsx"));
const CSS_DETALHE = ler("src/pages/processes/ProcessDetailPage.css").replace(/\/\*[\s\S]*?\*\//g, "");
const CSS_ABAS = ler("src/pages/processes/ProcessTabs.css").replace(/\/\*[\s\S]*?\*\//g, "");

describe("Fase 3.3b · item 2 — cabeçalho de identidade e balões (DEC-111)", () => {
  test("o cabeçalho tem bolinha, título, status · fase, número com copiar e selo de liminar", () => {
    assert.match(DETALHE, /className=\{`processo-cabecalho__bolinha \$\{classeDaBolinha\(tomDoStatus\(processo\.status\)\)\}`\}/);
    assert.match(DETALHE, /<h1 id="processo-titulo" className="processo-cabecalho__titulo">\s*\{processo\.titulo\}/);
    assert.match(DETALHE, /\{rotuloDoStatus\(processo\.status\)\} · \{rotuloDaFase\(processo\.fase\)\}/);
    assert.match(DETALHE, /aria-label="Copiar o número do processo"/);
    assert.match(DETALHE, /navigator\.clipboard\.writeText\(numero\)/);
    assert.match(DETALHE, /processo\.liminar === true && \(\s*<span\s+className="tag-liminar processo-cabecalho__selo"/);
  });

  test("o cliente saiu do cabeçalho (a faixa já o mostra, DEC-085)", () => {
    assert.doesNotMatch(DETALHE, /Cliente principal:/);
  });

  test("o ⋮ do cabeçalho reúne editar, mudar fase e desativar", () => {
    const menu = DETALHE.match(/rotulo=\{`Ações do processo[\s\S]*?\]\}/);
    assert.ok(menu, "não achei o ⋮ do cabeçalho");
    for (const r of ["'Editar'", "'Mudar fase'", "'Desativar'"]) assert.ok(menu[0].includes(r), r);
    // A fase grava sem sinal (fila): só editar e desativar bloqueiam.
    assert.doesNotMatch(menu[0], /'Mudar fase', motivo/);
    // Desativar confere o efeito antes (DEC-052), como a lista.
    assert.match(DETALHE, /processService\.getActivationPreview\(id\)/);
  });

  test("a bolinha tem uma regra por tom, com o token do badge", () => {
    for (const [tom, cor] of Object.entries(COR_DO_TOM)) {
      assert.match(
        CSS_DETALHE,
        new RegExp(`\\.${classeDaBolinha(tom).replace(/-/g, "\\-")}\\s*\\{\\s*background-color:\\s*${cor.replace(/[()]/g, "\\$&")}`),
        `sem regra para o tom ${tom}`
      );
    }
    assert.equal(classeDaBolinha(undefined), "processo-cabecalho__bolinha--neutral");
  });

  test("as seções são balões com título, na ordem: dados, participantes, fase, confirmações, ficha", () => {
    const titulos = [...DETALHE.matchAll(/<h2 id="secao-[^"]+" className="processo-balao__titulo">\s*([^<{]+)/g)].map((m) => m[1].trim());
    assert.deepEqual(titulos, [
      "Dados do processo", "Participantes", "Fase e linha do tempo",
      "Confirmações de leitura do portal", "Ficha financeira",
    ]);
  });

  test("as abas são pílulas, com a página atual marcada", () => {
    const abas = semComentarios(ler("src/pages/processes/ProcessTabs.jsx"));
    assert.match(abas, /aria-current="page">Visão geral/);
    for (const rota of ["honorarios", "parcelas", "pagamentos", "documentos"]) assert.ok(abas.includes(`'${rota}'`));
    assert.match(abas, /\/dashboard\/\$\{rota\}\?processoId=\$\{processoId\}/);
    assert.match(CSS_ABAS, /\.processo-aba\s*\{[^}]*border-radius:\s*var\(--radius-pill\)/);
    assert.match(CSS_ABAS, /\.processo-aba--ativa\s*\{[^}]*background-color:\s*var\(--color-primary\);[^}]*color:\s*var\(--color-on-primary\)/);
  });

  test("o comportamento continua: fase com fila, ficha auto-fechada, nada financeiro em modal", () => {
    assert.match(DETALHE, /err\?\.enfileirado/);
    assert.match(DETALHE, /<ProcessFinancialSheet processoId=\{id\} \/>/);
    // O único modal da tela é o de desativar o processo.
    assert.equal((DETALHE.match(/<Modal\b/g) ?? []).length, 1);
    assert.match(DETALHE, /title="Desativar processo"/);
  });

  test("nenhum ancestral dos menus ⋮ cria bloco de contenção (DEC-046)", () => {
    for (const css of [CSS_DETALHE, CSS_ABAS]) {
      assert.ok(!/(^|[\s;{])(transform|filter|perspective|contain)\s*:/m.test(css));
    }
  });
});

describe("Fase 3.3b · item 3 — participantes com o interruptor do portal (DEC-111)", () => {
  test("a situação no portal: sem acesso, liberado, não liberado — e 'não sei'", () => {
    assert.equal(situacaoNoPortal(undefined), "portal_sem_acesso");
    assert.equal(situacaoNoPortal({ temAcessoPortal: false, liberadoNoPortal: true }), "portal_sem_acesso");
    assert.equal(situacaoNoPortal({ temAcessoPortal: true, liberadoNoPortal: true }), "portal_liberado");
    assert.equal(situacaoNoPortal({ temAcessoPortal: true, liberadoNoPortal: false }), "portal_nao_liberado");
    // A lista com o portal não tem espelho: sem ela, não se afirma nada.
    assert.equal(situacaoNoPortal({ temAcessoPortal: true }, { carregado: false }), null);
  });

  test("o interruptor só existe para quem tem acesso", () => {
    assert.equal(temInterruptor("portal_liberado"), true);
    assert.equal(temInterruptor("portal_nao_liberado"), true);
    assert.equal(temInterruptor("portal_sem_acesso"), false);
    assert.equal(temInterruptor(null), false);
  });

  test("as três situações têm rótulo na fonte única", () => {
    assert.deepEqual(SITUACOES_NO_PORTAL.map((s) => STATUS_VISUAL[s].label), ["Sem acesso", "Liberado", "Não liberado"]);
  });

  test("a linha: nome como link, papel, selo principal, situação, interruptor e ⋮", () => {
    assert.match(DETALHE, /<Link to=\{destino\} className="link-interno participante-linha__nome">\{nome\}<\/Link>/);
    assert.match(DETALHE, /labelDe\(PAPEL_PROCESSO_OPTIONS, p\.papel\)/);
    assert.match(DETALHE, /p\.principal && <span className="participante-linha__principal">Principal<\/span>/);
    assert.match(DETALHE, /<StatusBadge status=\{situacao\} \/>/);
    assert.match(DETALHE, /rotulo=\{`Ações de \$\{nome\}`\}/);
    assert.match(DETALHE, /'Entregar acesso'/);
  });

  test("a linha não recebe foco: sem tabIndex, e o clique passa pela regra da 3.2", () => {
    const lista = DETALHE.slice(DETALHE.indexOf('className="participantes-detalhe"'), DETALHE.indexOf('secao-andamento'));
    assert.doesNotMatch(lista, /tabIndex/);
    assert.match(lista, /onClick=\{clicarNaLinha\(destino\)\}/);
    // A entrega fica fora da área clicável.
    assert.ok(lista.indexOf("<AccessDelivery") > lista.indexOf("participante-linha__acoes"));
  });

  test("o interruptor: switch por teclado e, sem sinal, desabilitado com o motivo ao lado", () => {
    const c = semComentarios(ler("src/components/processes/LiberacaoPortal.jsx"));
    assert.match(c, /<button[\s\S]*?type="button"[\s\S]*?role="switch"/, "botão nativo: Espaço e Enter vêm de graça");
    assert.match(c, /aria-describedby=\{online \? undefined : idMotivo\}/);
    assert.match(c, /\{!online && \(\s*<span id=\{idMotivo\} className="liberacao-portal__motivo">/);
  });
});

describe("Fase 3.3b · item 4 — as confirmações são vistas DEPOIS de aparecer (DEC-112)", () => {
  test("marca só com a lista na mão, uma vez, e só se há o que marcar", () => {
    assert.equal(deveMarcarComoVistas(null, false), false, "lista ainda não pedida");
    assert.equal(deveMarcarComoVistas([], false), false, "nada a marcar");
    assert.equal(deveMarcarComoVistas([{ _id: "c1" }], false), true);
    assert.equal(deveMarcarComoVistas([{ _id: "c1" }], true), false, "uma vez por abertura");
  });

  test("a marcação é um EFEITO depois do render, e não o fim da busca", () => {
    const abrir = DETALHE.slice(DETALHE.indexOf("const abrirConfirmacoes"), DETALHE.indexOf("const salvarFase"));
    assert.doesNotMatch(abrir, /marcarConfirmacoesVistas/, "marcar junto da busca é marcar antes de pintar");
    assert.match(
      DETALHE,
      /useEffect\(\(\) => \{\s*if \(!deveMarcarComoVistas\(confirmacoes, confirmacoesMarcadas\.current\)\) return;[\s\S]*?marcarConfirmacoesVistas\(id\)[\s\S]*?\}, \[confirmacoes, id\]\);/
    );
    // Nenhum outro caminho marca: nem o carregamento da página.
    assert.equal((DETALHE.match(/marcarConfirmacoesVistas/g) ?? []).length, 1);
  });

  test("a lista continua sob demanda: só o botão a busca", () => {
    assert.equal((DETALHE.match(/listProcessConfirmacoes/g) ?? []).length, 1);
    assert.match(DETALHE, /onClick=\{abrirConfirmacoes\}/);
  });
});
