// ═══════════════════════════════════════════════════════════════════════════
// F-5b — VARREDURA ESTÁTICA: a fiação que a função pura não alcança
//
// Três coisas desta fase só existem na ligação entre as peças, e são
// exatamente as três que, se sumirem num refactor, produzem **perda de dado
// silenciosa**:
//
//   1. nenhum caminho descarta entrada sozinho;
//   2. o logout com fila pendente avisa antes;
//   3. a fila é escopada por usuário, e o financeiro continua fora dela.
//
// ⚠️ É esta varredura que a mutação obrigatória (b) — descartar a entrada que
// falhou sem perguntar — precisa derrubar.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

import { RAIZ } from "../helpers/cssScan.js";

const ler = (relativo) => readFileSync(resolve(RAIZ, relativo), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const arquivosFonte = (dir = resolve(RAIZ, "src"), acc = []) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosFonte(caminho, acc);
    else if (/\.jsx?$/.test(nome)) acc.push(caminho);
  }
  return acc;
};

const relativo = (caminho) => caminho.replace(`${RAIZ}/`, "");

// ═════════════════════════════════════════════════════════════════════════
// 1. NADA É DESCARTADO AUTOMATICAMENTE
// ═════════════════════════════════════════════════════════════════════════

describe("nada sai da fila sem sucesso do servidor ou gesto humano", () => {
  const outbox = semComentarios(ler("src/offline/outbox.js"));

  test("não existe limite de tentativas, prazo nem expurgo", () => {
    // Uma fila que se limpa sozinha é uma fila que perde trabalho sem contar a
    // ninguém. Não há "falhou três vezes, some", não há prazo de validade e
    // não há varredura periódica.
    for (const proibido of [
      "maxTentativas", "MAX_TENTATIVAS", "limiteDeTentativas",
      "expirar", "expiraEm", "setInterval", "setTimeout"
    ]) {
      assert.ok(
        !outbox.includes(proibido),
        `"${proibido}" na fila: descarte automático é perda de dado que ninguém pediu`
      );
    }
    assert.ok(!/tentativas\s*[>>=]=?\s*\d/.test(outbox), "há um teto de tentativas escondido");
  });

  test("a remoção só acontece depois do envio aceito, ou por decisão explícita", () => {
    // As três chamadas de remoção do arquivo, e nenhuma outra:
    //   • dentro de `enviarFila`, DEPOIS de `await enviar(entrada)`;
    //   • em `descartar`, que só a tela chama, com confirmação;
    //   • em `manterMinhaVersao`, que troca a entrada por uma nova.
    const remocoes = [...outbox.matchAll(/store\.removeFila\(/g)].length;
    assert.equal(remocoes, 3, `esperadas 3 remoções, encontradas ${remocoes}`);

    const trechoEnvio = outbox.slice(outbox.indexOf("export const enviarFila"));
    const posEnviar = trechoEnvio.indexOf("await enviar(entrada)");
    const posRemover = trechoEnvio.indexOf("store.removeFila");
    assert.ok(posEnviar > -1 && posRemover > posEnviar, "a entrada sai antes de o servidor aceitar");
  });

  test("a falha GUARDA a entrada — ela não some, e leva o motivo junto", () => {
    const trecho = outbox.slice(outbox.indexOf("} catch (err) {"));
    assert.match(trecho, /marcarFalha\(entrada, falha\)/);
    assert.match(trecho, /await gravar\(userId, marcada\)/);
    assert.match(trecho, /break;/, "sem o `break`, a fila continuaria depois de uma falha");
  });

  test("o descarte é chamado por UMA tela, e ela pergunta antes", () => {
    const chamam = arquivosFonte()
      .filter((c) => {
        const rel = relativo(c);
        if (rel.startsWith("src/offline/")) return false;
        return /\bdescartar\s*\(/.test(semComentarios(readFileSync(c, "utf8")));
      })
      .map(relativo);

    assert.deepEqual(
      chamam.sort(),
      ["src/contexts/OutboxContext.jsx", "src/pages/pendencias/PendenciasPage.jsx"],
      "alguém passou a descartar entrada de fila fora da tela de pendências"
    );

    const tela = semComentarios(ler("src/pages/pendencias/PendenciasPage.jsx"));
    // O descarte passa pelo Modal: o clique ABRE a confirmação, e quem chama
    // `descartar` é o `onConfirm`.
    assert.match(tela, /setDescarteAberto\(entrada\)/);
    assert.match(tela, /mensagemDeDescarte\(descarteAberto\)/);
    assert.match(tela, /onConfirm=\{confirmarDescarte\}/);
    assert.ok(
      !/onClick=\{\(\)\s*=>\s*descartar\(/.test(tela),
      "há um botão que descarta direto, sem passar pela confirmação"
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 2. O LOGOUT COM FILA PENDENTE AVISA ANTES
// ═════════════════════════════════════════════════════════════════════════

describe("sair com fila pendente avisa, e diz quantas são", () => {
  const dashboard = semComentarios(ler("src/pages/dashboard/DashboardPage.jsx"));

  test("o logout confere a fila antes de sair", () => {
    // A DEC-058 manda apagar tudo no logout, e continua valendo. A fila, porém,
    // é trabalho que nunca chegou ao servidor: apagá-la junto, em silêncio,
    // seria perda de dado sem aviso.
    assert.match(dashboard, /if \(quantidade > 0\)/);
    const posGuarda = dashboard.indexOf("if (quantidade > 0)");
    const posSair = dashboard.indexOf("await sair();", posGuarda);
    const posAviso = dashboard.indexOf("setAvisoDeFila(true)", posGuarda);
    assert.ok(posAviso > -1 && posAviso < posSair, "o aviso precisa vir ANTES da saída");
  });

  test("o aviso NOMEIA a quantidade e pede confirmação", () => {
    assert.match(dashboard, /mensagemDeLogoutComFila\(quantidade\)/);
    assert.match(dashboard, /confirmLabel="Sair e descartar"/);
    assert.match(dashboard, /onCancel=\{\(\) => setAvisoDeFila\(false\)\}/);
  });

  test("a limpeza do logout continua apagando TUDO, inclusive a fila", () => {
    // O aviso não afrouxa a DEC-058: quem confirma, sai com o navegador limpo.
    const store = semComentarios(ler("src/offline/offlineStore.js"));
    const trechoClear = store.slice(store.indexOf("export const clear"));
    assert.match(trechoClear, /objectStore\(STORE_FILA\)\.clear\(\)/);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 3. O ESCOPO, E O FINANCEIRO DE FORA
// ═════════════════════════════════════════════════════════════════════════

describe("a fila é escopada, e o financeiro não entra nela", () => {
  const outbox = semComentarios(ler("src/offline/outbox.js"));
  const config = semComentarios(ler("src/api/axiosConfig.js"));

  test("toda chave de entrada passa por `buildQueueKey` com o usuário", () => {
    assert.match(outbox, /const chaveDe = \(userId, id\) => buildQueueKey\(\{ userId, chave: id \}\)/);
    const chamadasDiretas = [...outbox.matchAll(/store\.(putFila|removeFila)\(/g)].length;
    const comChave = [...outbox.matchAll(/chaveDe\(userId,/g)].length;
    assert.ok(comChave >= chamadasDiretas - 1, "há escrita na fila sem a chave escopada");
  });

  test("ninguém escreve na fila fora de `offline/outbox.js`", () => {
    const ofensores = arquivosFonte()
      .filter((c) => relativo(c) !== "src/offline/outbox.js")
      .filter((c) => relativo(c) !== "src/offline/offlineStore.js")
      .filter((c) => /store\.putFila|putFila\(/.test(semComentarios(readFileSync(c, "utf8"))))
      .map(relativo);
    assert.deepEqual(ofensores, []);
  });

  test("o interceptor só enfileira o que a lista fechada permite", () => {
    assert.match(config, /identificarOperacao\(\{ method: config\.method, url: config\.url \}\)/);
    // Sem operação reconhecida, a recusa é a da F-5a — inteira.
    assert.match(config, /if \(!operacao \|\| !userId\) return Promise\.reject\(offlineWriteError\(config\)\)/);
    assert.match(config, /enfileirarComSeguranca\(\{/);
    // E, se a gravação na fila NÃO acontecer (banco indisponível), a recusa
    // volta a ser a da F-5a: dizer "ficou na fila" sobre o que não ficou em
    // lugar nenhum seria perda de dado com mensagem de sucesso.
    assert.match(config, /if \(!entrada\) return Promise\.reject\(offlineWriteError\(config\)\)/);
  });

  test("o reenvio não se enfileira de novo", () => {
    // Sem esta saída, uma falha de rede no meio do reenvio enfileiraria a
    // entrada outra vez, e a fila cresceria sozinha com cópias.
    assert.match(config, /if \(config\.daFila\) return config;/);
    const sender = semComentarios(ler("src/api/outboxSender.js"));
    assert.match(sender, /daFila: true/);
  });

  test("o reenvio manda a chave de idempotência E a versão vista", () => {
    const sender = semComentarios(ler("src/api/outboxSender.js"));
    assert.match(sender, /'Idempotency-Key': entrada\.chaveIdempotencia/);
    assert.match(sender, /entrada\.versaoVista/);
    assert.match(sender, /CABECALHO_VERSAO/);
  });

  test("as telas financeiras continuam BLOQUEADAS, e não enfileiram", () => {
    const FINANCEIRAS = [
      "src/pages/fees/FeeFormPage.jsx",
      "src/pages/installments/InstallmentFormPage.jsx",
      "src/pages/payments/PaymentFormPage.jsx",
      "src/pages/fees/FeeRenegotiationPage.jsx"
    ];
    for (const arquivo of FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /if \(!online\) return;/,
        `${arquivo}: a tela de dinheiro deixou de barrar a gravação sem sinal`
      );
      assert.ok(
        !/OfflineQueueNotice/.test(codigo),
        `${arquivo}: o aviso de fila apareceu numa tela de dinheiro`
      );
    }
  });

  test("as duas telas que enfileiram avisam que enfileiram", () => {
    for (const arquivo of [
      "src/pages/calendar/EventFormPage.jsx",
      "src/pages/processes/ProcessDetailPage.jsx"
    ]) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /OfflineQueueNotice/, `${arquivo}: não avisa que a gravação vai para a fila`);
      assert.match(
        codigo, /err\?\.enfileirado/,
        `${arquivo}: trata o enfileiramento como erro — e ele é o oposto de uma perda`
      );
    }
  });

  test("a versão vista viaja nas duas escritas que a fila envia", () => {
    const eventos = semComentarios(ler("src/api/eventService.js"));
    const processos = semComentarios(ler("src/api/processService.js"));
    assert.match(eventos, /cabecalhoDeVersao\(versaoVista\)/);
    assert.match(processos, /cabecalhoDeVersao\(versaoVista\)/);
    // No corpo, não: `camposPermitidos` do backend recusa campo desconhecido.
    assert.ok(!/versaoVista:\s*versaoVista/.test(eventos));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// 4. A TELA DE PENDÊNCIAS EXISTE, E MOSTRA AS DUAS VERSÕES
// ═════════════════════════════════════════════════════════════════════════

describe("a tela de pendências — sem ela, a fila é perda silenciosa", () => {
  const tela = semComentarios(ler("src/pages/pendencias/PendenciasPage.jsx"));

  test("tem rota, e o contador leva até ela", () => {
    const rotas = semComentarios(ler("src/routes/AppRoutes.jsx"));
    assert.match(rotas, /path="pendencias"/);
    assert.match(rotas, /<PendenciasPage \/>/);

    const badge = semComentarios(ler("src/components/layout/PendingUploads.jsx"));
    assert.match(badge, /to="\/dashboard\/pendencias"/);
    // Zero não aparece — mesma regra do sino da F-3.
    assert.match(badge, /if \(quantidade === 0\) return null;/);

    const header = semComentarios(ler("src/components/layout/Header.jsx"));
    assert.match(header, /<PendingUploads \/>/);
  });

  test("descreve cada entrada em português, e nunca por rota", () => {
    assert.match(tela, /descreverEntrada\(entrada\)/);
    assert.ok(!/entrada\.url/.test(tela), "a tela mostra a rota — é o `POST /events 409` de volta");
    assert.ok(!/entrada\.method/.test(tela));
  });

  test("no conflito, mostra AS DUAS versões e deixa escolher", () => {
    assert.match(tela, /ComparacaoDeVersoes/);
    assert.match(tela, /A sua versão/);
    assert.match(tela, /O que está no servidor/);
    assert.match(tela, /Manter a minha versão/);
    assert.match(tela, /Ficar com a do servidor/);
  });

  test("'manter a minha' vira uma entrada NOVA, com chave nova", () => {
    // A fila é append-only: sobrescrever de propósito, depois de ver as duas
    // versões, é outra intenção — e por isso ganha chave de idempotência nova,
    // em vez de reaproveitar a da entrada que levou 409.
    const outbox = semComentarios(ler("src/offline/outbox.js"));
    const trecho = outbox.slice(outbox.indexOf("export const manterMinhaVersao"));
    assert.match(trecho, /montarEntrada\(\{/);
    assert.match(trecho, /versaoVista: versaoDoServidor/);
  });
});
