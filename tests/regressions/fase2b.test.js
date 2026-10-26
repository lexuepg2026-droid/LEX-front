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
    // As três telas que já mostram o erro em linha (login, esqueci a senha e
    // reenvio da confirmação): o 429 e o 502 não saem duas vezes.
    const auth = semComentarios(ler("src/api/authService.js"));
    assert.match(auth, /const SO_A_TELA_AVISA = \{ semToastGlobal: true \}/);
    assert.match(auth, /api\.post\('\/auth\/login', \{ email, senha \}, SO_A_TELA_AVISA\)/);
    assert.match(auth, /api\.post\('\/auth\/forgot-password', \{ email \}, SO_A_TELA_AVISA\)/);
    assert.match(auth, /api\.post\('\/auth\/resend-confirmation', undefined, SO_A_TELA_AVISA\)/);
    assert.equal((auth.match(/SO_A_TELA_AVISA\)/g) || []).length, 3, "só as três; o resto da autenticação segue a política");
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
    // Fase 3.3b (DEC-109): o aviso continua, condicionado à tela não mostrar o
    // dela (`faixaMostraAviso`); quem dispensa é cobrado em offline/estatica.
    assert.match(faixa, /faixaMostraAviso\(\{ fromCache, avisoProprio \}\) && <OfflineNotice atualizadoEm=\{updatedAt\}/);
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
    // Fase 3.3b (DEC-109): o detalhe, o detalhe do cliente e o filtro passam
    // também `avisoProprio` — o id publicado é o mesmo.
    ["src/pages/processes/ProcessDetailPage.jsx", /usePublicarContexto\(\{ processoId: id, avisoProprio: true \}\)/],
    ["src/pages/processes/ProcessFormPage.jsx", /usePublicarContexto\(\{ processoId: id \}\)/],
    ["src/pages/fees/FeeDetailPage.jsx", /usePublicarContexto\(\{ processoId: idDoProcesso\(honorario\?\.processoId\) \}\)/],
    ["src/pages/fees/FeeRenegotiationPage.jsx", /usePublicarContexto\(\{ processoId: idDoProcesso\(honorario\?\.processoId\) \}\)/],
    ["src/pages/fees/FeeFormPage.jsx", /usePublicarContexto\(\{ processoId: formData\.processoId \}\)/],
    // O formulário de parcela guarda o honorário em `feeId`; o de pagamento, em
    // `honorarioId`. A busca é nas opções GARANTIDAS (DEC-086), para o
    // honorário antigo buscado pelo id também ter contexto.
    // Fase 3.2: o processo sai do honorário ESCOLHIDO no `SeletorComBusca`
    // (clicado ou resolvido pelo id), não mais da lista de opções.
    ["src/pages/installments/InstallmentFormPage.jsx", /usePublicarContexto\(\{\s*processoId: idDoProcesso\([\s\S]*?honorarioEscolhido\.processoId[\s\S]*?\}\)/],
    ["src/pages/payments/PaymentFormPage.jsx", /usePublicarContexto\(\{\s*processoId: idDoProcesso\([\s\S]*?honorarioEscolhido\.processoId[\s\S]*?\}\)/],
    ["src/hooks/useProcessoFiltrado.js", /usePublicarContexto\(\{ processoId, avisoProprio \}\)/],
    ["src/components/documents/GenerationPanel.jsx", /usePublicarContexto\(\{ processoId \}\)/],
    ["src/pages/calendar/EventFormPage.jsx", /usePublicarContexto\(\{ processoId: formData\.processoId \}\)/],
    ["src/pages/clients/ClientDetailPage.jsx", /usePublicarContexto\(\{ clienteId: id, avisoProprio: true \}\)/],
    ["src/pages/clients/ClientFormPage.jsx", /usePublicarContexto\(\{ clienteId: id \}\)/],
  ];
  for (const [arquivo, padrao] of PUBLICAM) {
    test(`${arquivo.split("/").pop()} publica o contexto`, () => {
      assert.match(semComentarios(ler(arquivo)), padrao);
    });
  }
});

// ── Item 4 — DEC-086 ──────────────────────────────────────────────────────
// REESCRITO na Fase 3.2 (DEC-101). A regra da 2b — o valor escolhido (da URL
// ou do registro em edição) NUNCA aparece vazio — continua; o que mudou é o
// meio: não há mais `<option>` garantida num `<select>` com teto, há o
// `SeletorComBusca`, que busca o escolhido pelo id e mostra o rótulo inteiro.
import {
  precisaBuscarPorId,
  textoDoEscolhido,
  MENSAGENS_DO_SELETOR,
  honorarioDoDetalhe,
} from "../../src/utils/seletorComBusca.js";
import { rotuloDoHonorarioNoSeletor } from "../../src/utils/feeLabel.js";

describe("Fase 2b · item 4 — a escolha nunca some do seletor (DEC-086, pela 3.2)", () => {
  test("o id que chega sem item conhecido é buscado; o conhecido, não", () => {
    assert.equal(precisaBuscarPorId("z", null), true);
    assert.equal(precisaBuscarPorId("z", { _id: "z" }), false);
    assert.equal(precisaBuscarPorId("z", { _id: "y" }), true, "item de OUTRO id não serve");
    assert.equal(precisaBuscarPorId("", null), false, "sem escolha, nada a buscar");
  });

  test("enquanto busca, e se falhar, a tela diz — nunca um campo vazio mudo", () => {
    assert.ok(MENSAGENS_DO_SELETOR.carregandoEscolhido);
    assert.match(MENSAGENS_DO_SELETOR.indisponivel, /indisponível/);
    assert.equal(textoDoEscolhido(null, () => "x"), "");
    assert.equal(textoDoEscolhido({ _id: "a" }, (i) => `rótulo ${i._id}`), "rótulo a");
  });

  test("o seletor busca pelo id e avisa a faixa de contexto do item resolvido", () => {
    const seletor = semComentarios(ler("src/components/ui/SeletorComBusca.jsx"));
    assert.match(seletor, /buscarPorIdRef\.current\(valor\)/);
    assert.match(seletor, /onEscolhidoRef\.current\?\.\(item\)/);
    assert.match(seletor, /setEstadoDoId\('indisponivel'\)/);
  });

  for (const [arquivo, campo, servico] of [
    ["src/pages/fees/FeeFormPage.jsx", "processoId", /processService\.getProcessById\(pid\)/],
    ["src/pages/installments/InstallmentFormPage.jsx", "feeId", /feeService\.getFeeById\(hid\)/],
    ["src/pages/payments/PaymentFormPage.jsx", "honorarioId", /feeService\.getFeeById\(hid\)/],
  ]) {
    test(`${arquivo.split("/").pop()} entrega o id escolhido ao seletor e busca pelo id`, () => {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, new RegExp(`<SeletorComBusca[\\s\\S]*?valor=\\{formData\\.${campo}\\}`));
      assert.match(fonte, servico);
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

  test("o detalhe do honorário vira o formato da listagem (cliente dentro do processo)", () => {
    const fee = { _id: "f", descricao: "D", processoId: { _id: "p", numeroProcesso: "1" }, cliente: { tipoPessoa: "fisica", nomeCompleto: "Ana" } };
    assert.equal(honorarioDoDetalhe(fee).processoId.clientePrincipalId.nomeCompleto, "Ana");
    assert.equal(rotuloDoHonorarioNoSeletor(honorarioDoDetalhe(fee)), "D — Processo nº 1 — Ana");
  });
});

describe("Fase 2b · item 4 — o rótulo do honorário (DEC-086, decisão 3 da 3.2)", () => {
  test("descrição — Processo nº número — cliente principal", () => {
    const fee = {
      descricao: "Contratuais", valor: 5000,
      processoId: { _id: "p", titulo: "Cobrança", numeroProcesso: "0001234-56.2024.8.16.0001",
        clientePrincipalId: { tipoPessoa: "juridica", razaoSocial: "Agro Ltda" } },
    };
    assert.equal(rotuloDoHonorarioNoSeletor(fee), "Contratuais — Processo nº 0001234-56.2024.8.16.0001 — Agro Ltda");
  });

  test("sem número, o título; sem processo populado, só a descrição; o valor saiu", () => {
    assert.equal(rotuloDoHonorarioNoSeletor({ descricao: "X", valor: 10, processoId: { titulo: "Inventário" } }),
      "X — Processo: Inventário");
    assert.equal(rotuloDoHonorarioNoSeletor({ descricao: "X", valor: 10, processoId: "p1" }), "X");
  });

  test("os forms de parcela e de pagamento usam o rótulo novo", () => {
    for (const arquivo of ["src/pages/installments/InstallmentFormPage.jsx", "src/pages/payments/PaymentFormPage.jsx"]) {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, /rotulo=\{rotuloDoHonorarioNoSeletor\}/);
      assert.doesNotMatch(fonte, /formatFeeLabel/, "o rótulo antigo saiu");
    }
  });
});

// ── Item 5 — DEC-087 ──────────────────────────────────────────────────────
import { comVoltar, destinoDepoisDeSalvar } from "../../src/components/layout/contexto.js";

describe("Fase 2b · item 5 — os botões de lançamento da ficha (DEC-087)", () => {
  const ficha = semComentarios(ler("src/components/financeiro/ProcessFinancialSheet.jsx"));

  test("+ Honorário, + Parcela e + Pagamento com o vínculo e o caminho de volta", () => {
    assert.match(ficha, /comVoltar\(`\/dashboard\/honorarios\/novo\?processoId=\$\{processoId\}`, voltar\)/);
    assert.match(ficha, /comVoltar\(`\/dashboard\/parcelas\/novo\?honorarioId=\$\{h\._id\}`, voltar\)/);
    assert.match(ficha, /comVoltar\(`\/dashboard\/pagamentos\/novo\?honorarioId=\$\{h\._id\}`, voltar\)/);
    assert.match(ficha, /const voltar = `\/dashboard\/processos\/detalhe\/\$\{processoId\}`/);
  });

  test("honorário cancelado não oferece + Parcela nem + Pagamento", () => {
    const i = ficha.indexOf("{cancelado ? (");
    const parcela = ficha.indexOf("+ Parcela");
    const fimDoRamo = ficha.indexOf(") : (", i);
    assert.ok(i > 0 && fimDoRamo > i && parcela > fimDoRamo, "os dois botões só no ramo do não cancelado");
  });

  test("sem sinal, o botão é anunciado como desabilitado, como o Editar Processo", () => {
    assert.match(ficha, /if \(online\) return <Link to=\{to\} className="ficha-lancar">/);
    assert.match(ficha, /aria-disabled="true" onClick=\{\(e\) => e\.preventDefault\(\)\}/);
  });

  test("comVoltar acrescenta o parâmetro codificado, e recusa destino externo", () => {
    assert.equal(
      comVoltar("/dashboard/parcelas/novo?honorarioId=h1", "/dashboard/processos/detalhe/p1"),
      "/dashboard/parcelas/novo?honorarioId=h1&voltar=%2Fdashboard%2Fprocessos%2Fdetalhe%2Fp1"
    );
    assert.equal(comVoltar("/dashboard/honorarios/novo", "https://evil.example"), "/dashboard/honorarios/novo");
  });

  test("depois de salvar: o voltar válido, ou o destino de sempre", () => {
    assert.equal(destinoDepoisDeSalvar("/dashboard/processos/detalhe/p1", "/dashboard/parcelas"), "/dashboard/processos/detalhe/p1");
    assert.equal(destinoDepoisDeSalvar("//evil.example", "/dashboard/parcelas"), "/dashboard/parcelas");
    assert.equal(destinoDepoisDeSalvar(null, "/dashboard/parcelas"), "/dashboard/parcelas");
  });

  for (const [arquivo, padrao] of [
    ["src/pages/fees/FeeFormPage.jsx", "/dashboard/honorarios"],
    ["src/pages/installments/InstallmentFormPage.jsx", "/dashboard/parcelas"],
  ]) {
    test(`${arquivo.split("/").pop()} volta pelo ?voltar= validado no Salvar e no Cancelar`, () => {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, new RegExp(`destinoDepoisDeSalvar\\(searchParams\\.get\\('voltar'\\), '${padrao.replace(/\//g, "\\/")}'\\)`));
      assert.equal((fonte.match(/navigate\(saida\)/g) || []).length, 2);
      assert.doesNotMatch(fonte, new RegExp(`navigate\\('${padrao.replace(/\//g, "\\/")}'\\)`));
    });
  }

  test("o pagamento não sai sozinho (F-1b) e oferece Voltar ao processo", () => {
    const fonte = semComentarios(ler("src/pages/payments/PaymentFormPage.jsx"));
    assert.match(fonte, /setRealizado\(res\.data\);\s*return;/, "a regra da F-1b continua");
    assert.match(fonte, /<Link to=\{voltarAoProcesso\} className="btn-primary">\s*Voltar ao processo/);
    assert.match(fonte, /const voltarAoProcesso = voltarValido\(searchParams\.get\('voltar'\)\)/);
  });
});

// ── Item 6 — DEC-088 ──────────────────────────────────────────────────────
import {
  emailPendente, avisoDispensado, dispensarAviso, limparDispensaDoAviso
} from "../../src/components/layout/confirmacaoEmail.js";

const armazenamentoFalso = () => {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};
const armazenamentoQueLanca = () => ({
  get length() { throw new Error("bloqueado"); },
  key() { throw new Error("bloqueado"); },
  getItem() { throw new Error("bloqueado"); },
  setItem() { throw new Error("bloqueado"); },
  removeItem() { throw new Error("bloqueado"); },
});

describe("Fase 2b · item 6 — o aviso de e-mail compacto e dispensável (DEC-088)", () => {
  test("pendente só com null; undefined (servidor sem o campo) não é pendente", () => {
    assert.equal(emailPendente({ emailConfirmadoEm: null }), true);
    assert.equal(emailPendente({ emailConfirmadoEm: "2026-10-25" }), false);
    assert.equal(emailPendente({}), false);
    assert.equal(emailPendente(null), false);
  });

  test("dispensar vale por usuário, e o login limpa", () => {
    const s = armazenamentoFalso();
    assert.equal(avisoDispensado("u1", s), false);
    assert.equal(dispensarAviso("u1", s), true);
    assert.equal(avisoDispensado("u1", s), true);
    assert.equal(avisoDispensado("u2", s), false, "outra conta não herda a dispensa");
    s.setItem("outra:chave", "x");
    limparDispensaDoAviso(s);
    assert.equal(avisoDispensado("u1", s), false);
    assert.equal(s.getItem("outra:chave"), "x", "só as chaves do aviso saem");
  });

  test("sem sessionStorage (ou bloqueado), nada lança e a faixa continua aparecendo", () => {
    const s = armazenamentoQueLanca();
    assert.equal(dispensarAviso("u1", s), false);
    assert.equal(avisoDispensado("u1", s), false);
    assert.doesNotThrow(() => limparDispensaDoAviso(s));
    assert.equal(avisoDispensado("u1", null), false);
    // E na suíte (Node, sem `sessionStorage` global) o padrão também não lança.
    assert.doesNotThrow(() => avisoDispensado("u1"));
  });

  test("a faixa: uma linha, Reenviar, Já confirmei e o × rotulado", () => {
    const fonte = semComentarios(ler("src/components/layout/EmailConfirmationBanner.jsx"));
    assert.match(fonte, /\{enviando \? 'Enviando…' : 'Reenviar'\}/);
    assert.match(fonte, /Já confirmei/);
    assert.match(fonte, /aria-label="Dispensar o aviso até o próximo login"/);
    assert.match(fonte, /avisoDispensado\(user\.id\)/);
    const css = semComentarios(ler("src/components/layout/EmailConfirmationBanner.css"));
    assert.match(css, /\.email-banner__texto\s*\{[^}]*white-space:\s*nowrap[^}]*text-overflow:\s*ellipsis/);
    assert.match(css, /\.email-banner__acoes\s*\{[^}]*flex-shrink:\s*0/, "os botões nunca encolhem");
  });

  test("o login limpa a dispensa; o recarregar (checkAuth) não", () => {
    const fonte = semComentarios(ler("src/contexts/AuthContext.jsx"));
    const login = fonte.slice(fonte.indexOf("const login = useCallback"), fonte.indexOf("const register = useCallback"));
    assert.match(login, /limparDispensaDoAviso\(\)/);
    const check = fonte.slice(fonte.indexOf("const checkAuth = useCallback"), fonte.indexOf("const login = useCallback"));
    assert.doesNotMatch(check, /limparDispensaDoAviso/);
  });

  test("a indicação permanente: o ponto no avatar e o item no menu e no Mais", () => {
    const menu = semComentarios(ler("src/components/layout/MenuUsuario.jsx"));
    assert.match(menu, /\{pendente && <span className="menu-usuario__alerta" \/>\}/);
    assert.match(menu, /e-mail não confirmado/, "o estado está no nome acessível do botão, não só no ponto");
    assert.match(menu, /'Confirmar e-mail'/);
    const mais = semComentarios(ler("src/components/layout/BottomNav.jsx"));
    assert.match(mais, /\{pendente && \(/);
    assert.match(mais, /'Confirmar e-mail'/);
    // Nenhum dos dois é dispensável: não leem a dispensa.
    assert.doesNotMatch(menu + mais, /avisoDispensado/);
  });

  test("o reenvio não mudou: o mesmo POST, o jaConfirmado e o texto do servidor", () => {
    const hook = semComentarios(ler("src/hooks/useConfirmacaoEmail.js"));
    assert.match(hook, /authService\.resendConfirmation\(\)/);
    assert.match(hook, /if \(res\.data\?\.jaConfirmado\) \{\s*await checkAuth\(\);/);
    assert.match(hook, /getApiErrorMessage\(err, 'Não foi possível enviar o e-mail agora\.'\)/);
  });
});

// ── Achado da validação da fase: uma chave sobrando em Header.css ─────────
describe("Fase 2b · toda folha de estilo tem as chaves balanceadas", () => {
  test("nenhuma .css de src/ abre ou fecha chave a mais", () => {
    // A remoção da trilha deixou um `}` sobrando no fim de `Header.css`. O
    // navegador ignora, o minificador avisa e segue — nenhuma outra
    // verificação pegava. Comentários fora, porque o texto deles não conta.
    const desbalanceadas = arquivos(SRC, [".css"]).filter((c) => {
      const css = readFileSync(c, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      let nivel = 0;
      for (const ch of css) {
        if (ch === "{") nivel += 1;
        if (ch === "}") nivel -= 1;
        if (nivel < 0) return true;
      }
      return nivel !== 0;
    }).map((c) => relative(SRC, c));
    assert.deepEqual(desbalanceadas, []);
  });
});
