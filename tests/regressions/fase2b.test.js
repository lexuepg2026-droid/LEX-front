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
