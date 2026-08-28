// ═══════════════════════════════════════════════════════════════════════════
// F-5a — A IDADE DO DADO, E AS FRASES DO ESTADO SEM SINAL
//
// "Dado offline nunca se apresenta como dado ao vivo." Um saldo de parcela de
// duas horas atrás, exibido igual a um saldo de agora, faz a advogada dizer um
// número errado ao cliente ao telefone — e ela nem saberia que precisava
// desconfiar. É a mesma regra da DEC-044: **o que deixou de ser confiável diz
// que deixou.**
//
// Os instantes deste arquivo são construídos em hora LOCAL (`new Date(ano, mês,
// dia, hora, minuto)`) de propósito: a formatação é local — instante se lê no
// fuso de quem olha —, e um instante em UTC faria o teste passar ou falhar
// conforme o fuso da máquina.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { formatUpdatedAt, offlineNoticeText } from "../../src/offline/dataAge.js";
import {
  MENSAGEM_ESCRITA_OFFLINE,
  MENSAGEM_LEITURA_SEM_CACHE,
  MENSAGEM_DOWNLOAD_OFFLINE,
  isNetworkError,
  offlineErrorMessage
} from "../../src/offline/offlineMessages.js";
import {
  isWriteMethod,
  shouldBlockWrite,
  offlineWriteError,
  WRITE_METHODS
} from "../../src/offline/writeGuard.js";

const instante = (ano, mes, dia, hora, minuto) =>
  new Date(ano, mes - 1, dia, hora, minuto).getTime();

const AGORA = instante(2026, 8, 28, 16, 5);

describe("a hora exibida é a da última atualização DAQUELE dado", () => {
  test("hoje", () => {
    assert.equal(formatUpdatedAt(instante(2026, 8, 28, 14, 32), AGORA), "hoje às 14:32");
  });

  test("ontem — e ontem é dia de calendário, não 24 horas", () => {
    // Às 00:30, um dado das 23:50 tem 40 minutos de idade e é de ONTEM. Quem lê
    // "ontem às 23:50" entende na hora; "há 40 minutos" esconderia a virada do
    // dia, que é justamente quando um vencimento muda de lado.
    assert.equal(formatUpdatedAt(instante(2026, 8, 27, 23, 50), AGORA), "ontem às 23:50");
    assert.equal(
      formatUpdatedAt(instante(2026, 8, 27, 23, 50), instante(2026, 8, 28, 0, 30)),
      "ontem às 23:50"
    );
  });

  test("mais velho que ontem sai com a data cheia", () => {
    assert.equal(formatUpdatedAt(instante(2026, 8, 25, 9, 5), AGORA), "25/08/2026 às 09:05");
  });

  test("instante no futuro não vira 'hoje' — cai na data cheia", () => {
    // Relógio do aparelho ajustado para trás depois da gravação. Não se inventa
    // proximidade que não se pode afirmar.
    assert.equal(formatUpdatedAt(instante(2026, 8, 29, 8, 0), AGORA), "29/08/2026 às 08:00");
  });

  test("sem instante devolve null — quem chama decide o que dizer", () => {
    for (const vazio of [undefined, null, 0, -1, NaN, "2026-08-28"]) {
      assert.equal(formatUpdatedAt(vazio, AGORA), null, `deveria recusar: ${vazio}`);
    }
  });
});

describe("a frase do topo da tela", () => {
  test("diz que está sem conexão E de quando é o dado", () => {
    const frase = offlineNoticeText(instante(2026, 8, 28, 14, 32), AGORA);
    assert.equal(frase, "Sem conexão. Dados de hoje às 14:32.");
  });

  test("sem dado guardado, não inventa hora nenhuma", () => {
    const frase = offlineNoticeText(null, AGORA);
    assert.match(frase, /Sem conexão/);
    assert.ok(!/\d{2}:\d{2}/.test(frase), `inventou uma hora: ${frase}`);
  });

  test("a hora exibida NUNCA é a hora atual", () => {
    // A regressão que este teste existe para pegar: trocar `atualizadoEm` por
    // `Date.now()` faria a tela dizer que o dado é de agora — que é a mentira
    // exata que a Parte 3 da fase proíbe.
    const frase = offlineNoticeText(instante(2026, 8, 28, 14, 32), AGORA);
    assert.ok(!frase.includes("16:05"), `exibiu a hora atual: ${frase}`);
  });
});

describe("indisponível não é quebrado — as frases da Parte 4", () => {
  test("a mensagem de escrita diz o que dá para fazer, e o que fazer depois", () => {
    assert.match(MENSAGEM_ESCRITA_OFFLINE, /Sem conexão/);
    assert.match(MENSAGEM_ESCRITA_OFFLINE, /consultar/);
    assert.match(MENSAGEM_ESCRITA_OFFLINE, /não registrar/);
    assert.match(MENSAGEM_ESCRITA_OFFLINE, /quando o sinal voltar/);
  });

  test("a mensagem da tela nunca aberta não é 'falha ao carregar'", () => {
    assert.match(MENSAGEM_LEITURA_SEM_CACHE, /Sem conexão/);
    assert.match(MENSAGEM_LEITURA_SEM_CACHE, /não há dados guardados/);
    for (const generico of [/falha/i, /erro/i]) {
      assert.ok(!generico.test(MENSAGEM_LEITURA_SEM_CACHE), MENSAGEM_LEITURA_SEM_CACHE);
    }
  });

  test("o download sem sinal explica que o arquivo é do servidor", () => {
    assert.match(MENSAGEM_DOWNLOAD_OFFLINE, /servidor/);
    assert.match(MENSAGEM_DOWNLOAD_OFFLINE, /quando o sinal voltar/);
  });
});

describe("a troca do erro genérico pela explicação", () => {
  const erroDeRede = { response: undefined, message: "Network Error" };
  const erro500 = { response: { status: 500, data: { message: "Erro interno" } } };

  test("com sinal, não troca nada — dizer 'sem conexão' a quem está conectado manda procurar no lugar errado", () => {
    assert.equal(offlineErrorMessage(erroDeRede, { online: true }), null);
    assert.equal(offlineErrorMessage(erro500, { online: true }), null);
  });

  test("sem sinal, falha de rede vira a explicação", () => {
    assert.equal(offlineErrorMessage(erroDeRede, { online: false }), MENSAGEM_LEITURA_SEM_CACHE);
  });

  test("sem sinal, resposta do SERVIDOR continua sendo do servidor", () => {
    // O 500 chegou: houve resposta. Trocar a mensagem dele por "sem conexão"
    // esconderia um defeito do servidor atrás de um problema de rede.
    assert.equal(offlineErrorMessage(erro500, { online: false }), null);
  });

  test("a escrita recusada localmente se identifica", () => {
    const recusa = offlineWriteError({ url: "/clients" });
    assert.equal(recusa.offline, true);
    assert.equal(recusa.message, MENSAGEM_ESCRITA_OFFLINE);
    assert.equal(offlineErrorMessage(recusa, { online: false }), MENSAGEM_ESCRITA_OFFLINE);
  });

  test("requisição cancelada não é falta de sinal", () => {
    assert.equal(isNetworkError({ code: "ERR_CANCELED" }), false);
    assert.equal(isNetworkError(erroDeRede), true);
    assert.equal(isNetworkError(erro500), false);
  });
});

describe("a guarda de escrita", () => {
  test("os quatro verbos que gravam são barrados sem sinal", () => {
    for (const metodo of WRITE_METHODS) {
      assert.equal(shouldBlockWrite({ method: metodo, online: false }), true, metodo);
      assert.equal(shouldBlockWrite({ method: metodo.toUpperCase(), online: false }), true, metodo);
    }
  });

  test("leitura NUNCA é barrada — a fase é de leitura", () => {
    for (const metodo of ["get", "GET", "head", "options"]) {
      assert.equal(shouldBlockWrite({ method: metodo, online: false }), false, metodo);
    }
    assert.equal(isWriteMethod("get"), false);
  });

  test("com sinal, nada é barrado", () => {
    for (const metodo of WRITE_METHODS) {
      assert.equal(shouldBlockWrite({ method: metodo, online: true }), false, metodo);
    }
    // `undefined` (sinal desconhecido) não barra: a guarda só age sobre o
    // `false` de `navigator.onLine`, que é o único lado confiável dele.
    assert.equal(shouldBlockWrite({ method: "post", online: undefined }), false);
  });
});
