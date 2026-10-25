// ═══════════════════════════════════════════════════════════════════════════
// FASE 2b — contexto, erros e aviso de e-mail (DEC-083 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Teclado e pixel ficam no roteiro
// visual do relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const SRC = join(RAIZ, "src");
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const arquivos = (dir, exts) => readdirSync(dir).flatMap((nome) => {
  const c = join(dir, nome);
  if (statSync(c).isDirectory()) return arquivos(c, exts);
  return exts.some((e) => nome.endsWith(e)) ? [c] : [];
});

// ── Item 1 — DEC-083 ──────────────────────────────────────────────────────
import {
  toast, subscribe, DURACOES, JANELA_DEDUP, duracaoDe, regiaoDe, deveEmitir, _limparDeduplicacao
} from "../../src/utils/toast.js";

describe("Fase 2b · item 1 — o toast por tipo (DEC-083)", () => {
  test("duração: sucesso 3 s, info 4 s, erro 6 s", () => {
    assert.equal(duracaoDe("success"), 3000);
    assert.equal(duracaoDe("info"), 4000);
    assert.equal(duracaoDe("error"), 6000);
    assert.equal(duracaoDe("desconhecido"), DURACOES.info, "tipo estranho fica no meio");
  });

  test("região: erro em alert, sucesso e info em status", () => {
    assert.equal(regiaoDe("error"), "alert");
    assert.equal(regiaoDe("success"), "status");
    assert.equal(regiaoDe("info"), "status");
  });

  test("deduplicação: mesma mensagem e mesmo tipo dentro de 4 s sai uma vez", () => {
    const r = new Map();
    assert.equal(JANELA_DEDUP, 4000);
    assert.equal(deveEmitir(r, "error", "Servidor fora.", 1000), true);
    assert.equal(deveEmitir(r, "error", "Servidor fora.", 1200), false);
    assert.equal(deveEmitir(r, "error", "Servidor fora.", 4999), false, "ainda dentro da janela");
    assert.equal(deveEmitir(r, "error", "Servidor fora.", 5000), true, "4 s depois, sai de novo");
  });

  test("deduplicação não junta tipos nem mensagens diferentes", () => {
    const r = new Map();
    assert.equal(deveEmitir(r, "error", "A", 0), true);
    assert.equal(deveEmitir(r, "info", "A", 10), true, "mesmo texto, outro tipo");
    assert.equal(deveEmitir(r, "error", "B", 20), true, "mesmo tipo, outro texto");
  });

  test("o registro não cresce sem fim", () => {
    const r = new Map();
    for (let i = 0; i < 50; i += 1) deveEmitir(r, "error", `m${i}`, i);
    deveEmitir(r, "error", "depois", 10_000);
    assert.equal(r.size, 1);
  });

  test("a rajada do Início vira um toast só", () => {
    _limparDeduplicacao();
    const recebidos = [];
    const sair = subscribe((t) => recebidos.push(t));
    for (let i = 0; i < 5; i += 1) toast.error("Não foi possível falar com o servidor.");
    sair();
    assert.equal(recebidos.length, 1);
  });

  test("o container usa as duas regiões, o × rotulado e as regras do módulo", () => {
    const fonte = semComentarios(ler("src/components/ui/ToastContainer.jsx"));
    assert.match(fonte, /role="alert" aria-live="assertive"/);
    assert.match(fonte, /role="status" aria-live="polite"/);
    assert.match(fonte, /aria-label="Fechar aviso"/);
    assert.match(fonte, /duracaoDe\(/, "a duração vem do módulo, não de constante local");
    assert.match(fonte, /regiaoDe\(/);
    assert.match(fonte, /onMouseEnter/, "pausa com o mouse");
    assert.match(fonte, /onFocus/, "pausa com o foco");
    assert.match(fonte, /'Escape'/);
    assert.doesNotMatch(fonte, /const DURATION/, "a duração única de 3 s saiu");
    assert.doesNotMatch(fonte, /if \(toasts\.length === 0\) return null/,
      "as regiões ficam montadas mesmo vazias");
  });

  test("o toast continua acima da barra de baixo até 1023 px", () => {
    const css = ler("src/styles/toast.css");
    assert.match(css, /@media \(max-width: 1023px\)\s*\{\s*\.toast-container\s*\{[^}]*bottom:\s*calc\(var\(--bottom-nav-height\)/);
  });
});

// ── Item 2 — DEC-084 ──────────────────────────────────────────────────────
import {
  deveExibirToastGlobal, mensagemDoToastGlobal, marcarAvisado, jaAvisadoPeloToastGlobal,
  MENSAGEM_SEM_RESPOSTA, MENSAGEM_TEMPO_ESGOTADO, MENSAGEM_ERRO_DO_SERVIDOR, MENSAGEM_MUITAS_TENTATIVAS
} from "../../src/api/toastGlobal.js";
import { offlineWriteError, offlineQueuedError } from "../../src/offline/writeGuard.js";

const comStatus = (status, data = {}) => ({ response: { status, data } });
const semResposta = (code) => ({ code, message: "Network Error" });

describe("Fase 2b · item 2 — a política do toast global (DEC-084)", () => {
  test("mostra: sem resposta com sinal, 5xx, 429 e 502 de e-mail", () => {
    assert.equal(deveExibirToastGlobal(semResposta("ERR_NETWORK"), {}, true), true, "servidor fora/CORS");
    assert.equal(deveExibirToastGlobal(semResposta("ECONNABORTED"), {}, true), true, "tempo esgotado");
    for (const s of [500, 502, 503, 504]) {
      assert.equal(deveExibirToastGlobal(comStatus(s), {}, true), true, `${s}`);
    }
    assert.equal(deveExibirToastGlobal(comStatus(429), {}, true), true);
  });

  test("não mostra: 400, 404, 409 e 422 — a tela trata", () => {
    for (const s of [400, 404, 409, 422]) {
      assert.equal(deveExibirToastGlobal(comStatus(s, { campo: "valor" }), {}, true), false, `${s}`);
    }
  });

  test("não mostra: 401, que é da sessão perdida", () => {
    assert.equal(deveExibirToastGlobal(comStatus(401), {}, true), false);
  });

  test("não mostra: a escrita recusada ou enfileirada sem sinal", () => {
    assert.equal(deveExibirToastGlobal(offlineWriteError({}), {}, false), false);
    assert.equal(deveExibirToastGlobal(offlineQueuedError({}, { id: 1 }), {}, false), false);
    // Mesmo que o navegador volte a dizer "online" no meio do caminho.
    assert.equal(deveExibirToastGlobal(offlineWriteError({}), {}, true), false);
  });

  test("não mostra: sem resposta e sem sinal — a frase é a da F-5a", () => {
    assert.equal(deveExibirToastGlobal(semResposta("ERR_NETWORK"), {}, false), false);
  });

  test("não mostra: pedido cancelado e pedido marcado com semToastGlobal", () => {
    assert.equal(deveExibirToastGlobal(semResposta("ERR_CANCELED"), {}, true), false);
    assert.equal(deveExibirToastGlobal(comStatus(500), { semToastGlobal: true }, true), false);
    assert.equal(deveExibirToastGlobal(semResposta("ERR_NETWORK"), { semToastGlobal: true }, true), false);
  });

  test("as frases: a do servidor quando ele escreveu, a nossa quando não", () => {
    assert.equal(mensagemDoToastGlobal(semResposta("ERR_NETWORK")), MENSAGEM_SEM_RESPOSTA);
    assert.equal(mensagemDoToastGlobal(semResposta("ECONNABORTED")), MENSAGEM_TEMPO_ESGOTADO);
    assert.equal(mensagemDoToastGlobal(comStatus(500, { message: "Erro interno do servidor" })), MENSAGEM_ERRO_DO_SERVIDOR);
    assert.equal(mensagemDoToastGlobal(comStatus(503, "<html>")), MENSAGEM_ERRO_DO_SERVIDOR, "proxy sem corpo nosso");
    const email = "Não foi possível enviar o e-mail agora. Tente novamente em alguns minutos.";
    assert.equal(mensagemDoToastGlobal(comStatus(502, { message: email })), email, "o texto do 502 não muda");
    assert.equal(mensagemDoToastGlobal(comStatus(429, { message: "Aguarde um minuto antes de pedir outro e-mail." })),
      "Aguarde um minuto antes de pedir outro e-mail.", "o texto do 429 não muda");
    assert.equal(mensagemDoToastGlobal(comStatus(429)), MENSAGEM_MUITAS_TENTATIVAS);
  });

  test("a marca no erro deixa a tela saber que o aviso já saiu", () => {
    const e = comStatus(500);
    assert.equal(jaAvisadoPeloToastGlobal(e), false);
    marcarAvisado(e);
    assert.equal(jaAvisadoPeloToastGlobal(e), true);
    assert.equal(jaAvisadoPeloToastGlobal(null), false);
  });

  test("o interceptor da advogada usa a política, depois da sessão", () => {
    const fonte = semComentarios(ler("src/api/axiosConfig.js"));
    const sessao = fonte.indexOf("ehSessaoPerdida(error");
    const global = fonte.indexOf("deveExibirToastGlobal(error, error.config, lerOnline())");
    assert.ok(sessao > 0 && global > sessao, "o toast global vem depois do tratamento da sessão");
    assert.match(fonte, /toast\.error\(mensagemDoToastGlobal\(error\)\)/);
    assert.match(fonte, /marcarAvisado\(error\)/);
    // O fluxo da sessão perdida continua inteiro.
    assert.match(fonte, /toast\.error\('Sessão expirada\. Faça login novamente\.'\)/);
    assert.match(fonte, /isRedirecting = true/);
  });

  test("o portal não recebe o toast da advogada", () => {
    const portal = semComentarios(ler("src/api/portalAxios.js"));
    assert.doesNotMatch(portal, /toastGlobal/);
    assert.doesNotMatch(portal, /utils\/toast/);
    assert.doesNotMatch(portal, /axiosConfig/);
    // E nada do portal importa a política.
    const culpados = arquivos(join(SRC, "pages/portal"), [".jsx", ".js"])
      .concat(arquivos(join(SRC, "components/portal"), [".jsx", ".js"]))
      .filter((c) => /toastGlobal/.test(readFileSync(c, "utf8")))
      .map((c) => relative(SRC, c));
    assert.deepEqual(culpados, []);
  });

  test("as chamadas de fundo levam semToastGlobal", () => {
    assert.match(semComentarios(ler("src/components/layout/NotificationBell.jsx")),
      /getAvisos\(\{ semToastGlobal: true \}\)/, "o sino a cada 5 minutos");
    assert.match(semComentarios(ler("src/api/outboxSender.js")), /semToastGlobal: true/, "o reenvio da fila");
    assert.match(semComentarios(ler("src/api/paymentService.js")),
      /preview', data, \{ semToastGlobal: true \}/, "o preview da digitação");
    assert.match(semComentarios(ler("src/api/documentService.js")),
      /compatibilidade`, \{ params: \{ clienteId \}, semToastGlobal: true \}/, "o aviso preventivo");
    assert.match(semComentarios(ler("src/api/calendarService.js")),
      /getAvisos = \(opcoes = \{\}\) => api\.get\('\/calendar\/avisos', opcoes\)/);
  });

  test("nenhum toast.error de catch repete o aviso global", () => {
    // Todo `toast.error(...)` que recebe o `err` de um catch pergunta antes se
    // o global já avisou. Os que não recebem `err` (cópia para a área de
    // transferência, seção repetida) não passam pela rede.
    const culpados = [];
    for (const caminho of arquivos(SRC, [".jsx"])) {
      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      for (const linha of codigo.split("\n")) {
        if (/toast\.error\(.*\berr\b/.test(linha) && !/jaAvisadoPeloToastGlobal\(err\)/.test(linha)) {
          culpados.push(`${relative(SRC, caminho)}: ${linha.trim()}`);
        }
      }
    }
    assert.deepEqual(culpados, []);
  });
});

describe("Fase 2b · item 2 — a política não conhece rota (DEC-050 continua)", () => {
  test("toastGlobal.js não lê URL nem caminho da página", () => {
    const fonte = semComentarios(ler("src/api/toastGlobal.js"));
    assert.doesNotMatch(fonte, /\.url\b/);
    assert.doesNotMatch(fonte, /window\.location/);
    assert.doesNotMatch(fonte, /\/auth\//);
  });
});

// ── Item 3 — DEC-085 ──────────────────────────────────────────────────────
import {
  paiDaRota, destinoDoVoltar, voltarValido, lerVoltar,
  contextoDoProcesso, contextoDoCliente, textoDoContexto, idDoProcesso, idsPublicadosPara
} from "../../src/components/layout/contexto.js";

describe("Fase 2b · item 3 — o pai de cada rota (DEC-085)", () => {
  const MAPA = [
    ["/dashboard/clientes/novo", "/dashboard/clientes"],
    ["/dashboard/clientes/detalhe/c1", "/dashboard/clientes"],
    ["/dashboard/clientes/editar/c1", "/dashboard/clientes/detalhe/c1"],
    ["/dashboard/processos/novo", "/dashboard/processos"],
    ["/dashboard/processos/detalhe/p1", "/dashboard/processos"],
    ["/dashboard/processos/editar/p1", "/dashboard/processos/detalhe/p1"],
    ["/dashboard/honorarios/novo", "/dashboard/honorarios"],
    ["/dashboard/honorarios/h1", "/dashboard/honorarios"],
    ["/dashboard/honorarios/editar/h1", "/dashboard/honorarios/h1"],
    ["/dashboard/honorarios/h1/reparcelar", "/dashboard/honorarios/h1"],
    ["/dashboard/parcelas/novo", "/dashboard/parcelas"],
    ["/dashboard/parcelas/editar/i1", "/dashboard/parcelas"],
    ["/dashboard/pagamentos/novo", "/dashboard/pagamentos"],
    ["/dashboard/pagamentos/editar/g1", "/dashboard/pagamentos"],
    ["/dashboard/documentos/montar", "/dashboard/documentos"],
    ["/dashboard/documentos/montar/d1", "/dashboard/documentos"],
    ["/dashboard/documentos/d1/texto", "/dashboard/documentos"],
    ["/dashboard/secoes/nova", "/dashboard/secoes"],
    ["/dashboard/secoes/editar/s1", "/dashboard/secoes"],
    ["/dashboard/agenda/novo", "/dashboard/agenda"],
    ["/dashboard/agenda/editar/e1", "/dashboard/agenda"],
  ];

  for (const [tela, pai] of MAPA) {
    test(`${tela} → ${pai}`, () => assert.equal(paiDaRota(tela), pai));
  }

  test("o Início, as listas e as telas de topo não têm faixa", () => {
    for (const tela of [
      "/dashboard", "/dashboard/clientes", "/dashboard/processos", "/dashboard/honorarios",
      "/dashboard/parcelas", "/dashboard/pagamentos", "/dashboard/documentos", "/dashboard/secoes",
      "/dashboard/agenda", "/dashboard/financeiro", "/dashboard/perfil", "/dashboard/pendencias",
    ]) {
      assert.equal(paiDaRota(tela, ""), null, tela);
    }
  });

  test("as quatro listas filtradas por processo voltam para o processo", () => {
    for (const lista of ["honorarios", "parcelas", "pagamentos", "documentos"]) {
      assert.equal(paiDaRota(`/dashboard/${lista}`, "?processoId=p9"), "/dashboard/processos/detalhe/p9");
    }
    // Clientes e processos não filtram por processo: sem faixa.
    assert.equal(paiDaRota("/dashboard/clientes", "?processoId=p9"), null);
  });

  test("todo destino do mapa é uma rota que existe", () => {
    const rotas = semComentarios(ler("src/routes/AppRoutes.jsx"));
    for (const [, pai] of MAPA) {
      const padrao = pai.replace("/dashboard/", "").replace(/\/[a-z]\d$/, "/:id");
      const caminho = padrao.replace(/^honorarios\/:id$/, "honorarios/:id");
      assert.match(rotas, new RegExp(`path="${caminho.replace(/[/:]/g, (c) => `\\${c}`)}"`), pai);
    }
  });
});

describe("Fase 2b · item 3 — o destino do Voltar (DEC-085)", () => {
  test("é o pai, e não o histórico", () => {
    assert.equal(destinoDoVoltar({ pathname: "/dashboard/honorarios/h1", search: "" }), "/dashboard/honorarios");
  });

  test("preserva a query que o pai tinha da última visita", () => {
    const memoria = new Map([["/dashboard/parcelas", "?processoId=p9"]]);
    assert.equal(
      destinoDoVoltar({ pathname: "/dashboard/parcelas/editar/i1", search: "" }, memoria),
      "/dashboard/parcelas?processoId=p9"
    );
    // A visita pelo menu (sem query) sobrescreve, e o Voltar volta à lista inteira.
    memoria.set("/dashboard/parcelas", "");
    assert.equal(
      destinoDoVoltar({ pathname: "/dashboard/parcelas/editar/i1", search: "" }, memoria),
      "/dashboard/parcelas"
    );
  });

  test("um ?voltar= válido manda", () => {
    assert.equal(
      destinoDoVoltar({ pathname: "/dashboard/parcelas/novo", search: "?honorarioId=h1&voltar=%2Fdashboard%2Fprocessos%2Fdetalhe%2Fp1" }),
      "/dashboard/processos/detalhe/p1"
    );
  });

  test("?voltar= só aceita caminho interno da área da advogada", () => {
    assert.equal(voltarValido("/dashboard/processos/detalhe/p1"), "/dashboard/processos/detalhe/p1");
    assert.equal(voltarValido("/dashboard"), "/dashboard");
    for (const ruim of [
      "https://evil.example/dashboard/", "//evil.example/dashboard", "/\\evil.example",
      "javascript:alert(1)", "/login", "/portal/processo", "/dashboard//evil.example",
      "/dashboard/../login", "/dashboard/%2F%2Fevil", "/dashboard/\nx", "/dashboard/a b", null, 42, "",
      "/dashboardx", "/dashboard/" + "a".repeat(600),
    ]) {
      assert.equal(voltarValido(ruim), null, String(ruim));
    }
    assert.equal(lerVoltar("?voltar=https%3A%2F%2Fevil.example"), null);
  });
});

describe("Fase 2b · item 3 — o texto do contexto (DEC-085)", () => {
  const processo = {
    _id: "p1",
    titulo: "Ação de cobrança",
    numeroProcesso: "0001234-56.2024.8.16.0001",
    clientePrincipalId: { _id: "c1", tipoPessoa: "fisica", nomeCompleto: "Fulano de Tal" },
    participantes: [
      { clienteId: { _id: "c1", tipoPessoa: "fisica", nomeCompleto: "Fulano de Tal" }, principal: true },
      { clienteId: { _id: "c2", tipoPessoa: "fisica", nomeCompleto: "Beltrano" }, principal: false },
      { clienteId: { _id: "c3", tipoPessoa: "juridica", razaoSocial: "ACME Ltda" }, principal: false },
    ],
  };

  test("Cliente: Fulano (+2) · Processo: número — título", () => {
    const ctx = contextoDoProcesso(processo);
    assert.deepEqual(ctx.cliente, { id: "c1", nome: "Fulano de Tal", outros: 2 });
    assert.deepEqual(ctx.processo, { id: "p1", rotulo: "0001234-56.2024.8.16.0001 — Ação de cobrança" });
    assert.equal(textoDoContexto(ctx),
      "Cliente: Fulano de Tal (+2) · Processo: 0001234-56.2024.8.16.0001 — Ação de cobrança");
  });

  test("sem outros participantes, sem (+N); PJ pelo nome da empresa", () => {
    const so = { ...processo, participantes: [processo.participantes[2]], clientePrincipalId: processo.participantes[2].clienteId };
    so.participantes = [{ ...so.participantes[0], principal: true }];
    assert.equal(textoDoContexto(contextoDoProcesso(so)),
      "Cliente: ACME Ltda · Processo: 0001234-56.2024.8.16.0001 — Ação de cobrança");
  });

  test("só cliente nas telas de cliente; nada quando não há dado", () => {
    assert.equal(textoDoContexto(contextoDoCliente({ _id: "c1", tipoPessoa: "fisica", nomeCompleto: "Fulano" })),
      "Cliente: Fulano");
    assert.equal(contextoDoProcesso(null), null);
    assert.equal(textoDoContexto(null), "");
  });

  test("idDoProcesso lê o populado e o cru", () => {
    assert.equal(idDoProcesso({ _id: "p1", titulo: "x" }), "p1");
    assert.equal(idDoProcesso("p1"), "p1");
    assert.equal(idDoProcesso(null), null);
    assert.equal(idDoProcesso(undefined), null);
    assert.equal(idDoProcesso(""), null);
  });
});

describe("Fase 2b · item 3 — o contexto casa com o caminho (DEC-085)", () => {
  test("o publicado só vale para o caminho em que foi publicado", () => {
    const publicado = { pathname: "/dashboard/honorarios/h1", processoId: "p1", clienteId: null };
    assert.deepEqual(idsPublicadosPara(publicado, "/dashboard/honorarios/h1"), { processoId: "p1", clienteId: null });
    assert.deepEqual(idsPublicadosPara(publicado, "/dashboard/parcelas/novo"), { processoId: null, clienteId: null },
      "a tela nova não herda o processo da anterior");
    assert.deepEqual(idsPublicadosPara(null, "/x"), { processoId: null, clienteId: null });
  });

  test("o contexto usa a regra pura, e limpa ao sair", () => {
    const fonte = semComentarios(ler("src/contexts/ContextoContext.jsx"));
    assert.match(fonte, /idsPublicadosPara\(ctx\?\.publicado, pathname\)/);
    assert.match(fonte, /return \(\) => definir\(pathname, null\)/);
  });

  test("a resolução usa as MESMAS chaves de espelho do detalhe", () => {
    const hook = semComentarios(ler("src/hooks/useContextoResolvido.js"));
    assert.match(hook, /resource: 'process',\s*params: \{ id: processoId \}/);
    assert.match(hook, /resource: 'client',\s*params: \{ id: clienteId \}/);
    const detalhe = semComentarios(ler("src/pages/processes/ProcessDetailPage.jsx"));
    assert.match(detalhe, /resource: 'process',\s*params: \{ id \}/);
    const cliente = semComentarios(ler("src/pages/clients/ClientDetailPage.jsx"));
    assert.match(cliente, /resource: 'client',\s*params: \{ id \}/);
  });

  test("a faixa mostra o aviso de idade e o Voltar é link, não navigate(-1)", () => {
    const faixa = semComentarios(ler("src/components/layout/FaixaContexto.jsx"));
    assert.match(faixa, /fromCache && <OfflineNotice atualizadoEm=\{updatedAt\}/);
    assert.match(faixa, /<Link to=\{destino\} className="faixa-contexto__voltar">/);
    assert.doesNotMatch(faixa, /navigate\(-1\)|history\.back/);
  });

  test("a trilha saiu do Header, e o BreadcrumbContext com ela", () => {
    const header = semComentarios(ler("src/components/layout/Header.jsx"));
    assert.doesNotMatch(header, /breadcrumb|trilha/i);
    const layout = semComentarios(ler("src/components/layout/AppLayout.jsx"));
    assert.match(layout, /<FaixaContexto \/>/);
    assert.match(layout, /<ContextoProvider>/);
    const usos = arquivos(SRC, [".jsx", ".js"])
      .filter((c) => /BreadcrumbContext|usePublicarBreadcrumb|useBreadcrumbLabel/.test(semComentarios(readFileSync(c, "utf8"))));
    assert.deepEqual(usos.map((c) => relative(SRC, c)), []);
  });

  // Quem publica, e de onde vem o id (tabela 3.4 do prompt da fase).
  const PUBLICAM = [
    ["src/pages/processes/ProcessDetailPage.jsx", /usePublicarContexto\(\{ processoId: id \}\)/],
    ["src/pages/processes/ProcessFormPage.jsx", /usePublicarContexto\(\{ processoId: id \}\)/],
    ["src/pages/fees/FeeDetailPage.jsx", /usePublicarContexto\(\{ processoId: idDoProcesso\(honorario\?\.processoId\) \}\)/],
    ["src/pages/fees/FeeRenegotiationPage.jsx", /usePublicarContexto\(\{ processoId: idDoProcesso\(honorario\?\.processoId\) \}\)/],
    ["src/pages/fees/FeeFormPage.jsx", /usePublicarContexto\(\{ processoId: formData\.processoId \}\)/],
    // O formulário de parcela guarda o honorário em `feeId`; o de pagamento, em
    // `honorarioId`. A busca é nas opções GARANTIDAS (DEC-086), para o
    // honorário antigo buscado pelo id também ter contexto.
    ["src/pages/installments/InstallmentFormPage.jsx", /usePublicarContexto\(\{\s*processoId: idDoProcesso\(opcoesDeHonorario\.find\(\(f\) => f\._id === formData\.feeId\)\?\.processoId\),?\s*\}\)/],
    ["src/pages/payments/PaymentFormPage.jsx", /usePublicarContexto\(\{\s*processoId: idDoProcesso\(opcoesDeHonorario\.find\(\(f\) => f\._id === formData\.honorarioId\)\?\.processoId\),?\s*\}\)/],
    ["src/hooks/useProcessoFiltrado.js", /usePublicarContexto\(\{ processoId \}\)/],
    ["src/components/documents/GenerationPanel.jsx", /usePublicarContexto\(\{ processoId \}\)/],
    ["src/pages/calendar/EventFormPage.jsx", /usePublicarContexto\(\{ processoId: formData\.processoId \}\)/],
    ["src/pages/clients/ClientDetailPage.jsx", /usePublicarContexto\(\{ clienteId: id \}\)/],
    ["src/pages/clients/ClientFormPage.jsx", /usePublicarContexto\(\{ clienteId: id \}\)/],
  ];
  for (const [arquivo, padrao] of PUBLICAM) {
    test(`${arquivo.split("/").pop()} publica o contexto`, () => {
      assert.match(semComentarios(ler(arquivo)), padrao);
    });
  }
});

// ── Item 4 — DEC-086 ──────────────────────────────────────────────────────
import { comOpcaoGarantida, precisaBuscarOpcao, ROTULO_OPCAO_PENDENTE } from "../../src/utils/seletorLimitado.js";
import { rotuloDoHonorarioNoSeletor } from "../../src/utils/feeLabel.js";

describe("Fase 2b · item 4 — a opção escolhida nunca some do seletor (DEC-086)", () => {
  const lista = [{ _id: "a" }, { _id: "b" }];

  test("o escolhido que está na lista não muda nada", () => {
    assert.equal(comOpcaoGarantida(lista, "a"), lista);
    assert.equal(precisaBuscarOpcao(lista, "a", true), false);
  });

  test("fora dos 100: busca, e enquanto isso a opção existe marcada", () => {
    assert.equal(precisaBuscarOpcao(lista, "z", true), true);
    assert.equal(precisaBuscarOpcao(lista, "z", false), false, "espera a lista antes de buscar");
    const pendente = comOpcaoGarantida(lista, "z");
    assert.deepEqual(pendente[0], { _id: "z", _pendente: "carregando" });
    assert.ok(pendente.some((o) => o._id === "z"), "o <select> tem a opção do valor que carrega");
  });

  test("a busca voltou: o item entra PRIMEIRO; falhou: fica marcado como indisponível", () => {
    const extra = { _id: "z", titulo: "Antigo" };
    assert.deepEqual(comOpcaoGarantida(lista, "z", extra), [extra, ...lista]);
    assert.deepEqual(comOpcaoGarantida(lista, "z", null, "indisponivel")[0], { _id: "z", _pendente: "indisponivel" });
    assert.ok(ROTULO_OPCAO_PENDENTE.carregando && ROTULO_OPCAO_PENDENTE.indisponivel);
  });

  test("um extra de OUTRO id não é usado", () => {
    assert.deepEqual(comOpcaoGarantida(lista, "z", { _id: "y" })[0], { _id: "z", _pendente: "carregando" });
  });

  test("sem escolha, a lista fica como veio", () => {
    assert.equal(comOpcaoGarantida(lista, ""), lista);
    assert.deepEqual(comOpcaoGarantida(null, ""), []);
  });

  for (const [arquivo, campo, servico] of [
    ["src/pages/fees/FeeFormPage.jsx", "processoId", /processService\.getProcessById\(pid\)/],
    ["src/pages/installments/InstallmentFormPage.jsx", "feeId", /feeService\.getFeeById\(hid\)/],
  ]) {
    test(`${arquivo.split("/").pop()} usa as opções garantidas e busca pelo id`, () => {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, new RegExp(`useOpcaoGarantida\\(\\{[\\s\\S]*?idEscolhido: formData\\.${campo}`));
      assert.match(fonte, servico);
      assert.match(fonte, /\.finally\(\(\) => setListaCarregada\(true\)\)/, "a lista conta como carregada mesmo se falhar");
      assert.match(fonte, /opcoesDe(Processo|Honorario)\.map\(/, "o <select> desenha as opções garantidas");
      assert.match(fonte, /ROTULO_OPCAO_PENDENTE\[/);
    });
  }

  test("o form de honorário aceita ?processoId=, e o de parcela ?honorarioId=", () => {
    const fee = semComentarios(ler("src/pages/fees/FeeFormPage.jsx"));
    assert.match(fee, /searchParams\.get\('processoId'\)/);
    assert.match(fee, /if \(isEditing\) return;/, "só na criação");
    const parcela = semComentarios(ler("src/pages/installments/InstallmentFormPage.jsx"));
    assert.match(parcela, /searchParams\.get\('honorarioId'\)/);
    assert.match(parcela, /setFormData\(prev => \(\{ \.\.\.prev, feeId: doQuery \}\)\)/);
  });
});

describe("Fase 2b · item 4 — o honorário no seletor diz o processo (DEC-086)", () => {
  test("descrição — Processo nº número — valor", () => {
    const fee = { descricao: "Contratuais", valor: 5000, processoId: { _id: "p", titulo: "Cobrança", numeroProcesso: "0001234-56.2024.8.16.0001" } };
    assert.equal(rotuloDoHonorarioNoSeletor(fee), "Contratuais — Processo nº 0001234-56.2024.8.16.0001 — R$\u00a05.000,00");
  });

  test("sem número, o título; sem processo populado, só descrição e valor", () => {
    assert.equal(rotuloDoHonorarioNoSeletor({ descricao: "X", valor: 10, processoId: { titulo: "Inventário" } }),
      "X — Processo: Inventário — R$\u00a010,00");
    assert.equal(rotuloDoHonorarioNoSeletor({ descricao: "X", valor: 10, processoId: "p1" }), "X — R$\u00a010,00");
  });

  test("o form de parcela usa o rótulo novo", () => {
    const fonte = semComentarios(ler("src/pages/installments/InstallmentFormPage.jsx"));
    assert.match(fonte, /rotuloDoHonorarioNoSeletor\(f\)/);
    assert.doesNotMatch(fonte, /\{f\.descricao\} — \{f\.valor/, "o rótulo antigo saiu");
  });
});
