// ═══════════════════════════════════════════════════════════════════════════
// A FILA — a fiação entre a política (pura) e o banco (fino). (F-5b, DEC-059)
//
// Como em `offlineCache.js`, não há decisão nova aqui: a ordem, a parada na
// primeira falha e a classificação do erro moram em `outboxPlan.js` e
// `outboxMessages.js`, que a suíte executa de verdade. O que este arquivo
// acrescenta é sequência e persistência.
//
// ── Append-only, e escopada ─────────────────────────────────────────────
// A entrada não se edita e não se reordena; o que muda é o **estado**. A chave
// do banco carrega o id do usuário (`buildQueueKey`), então a fila de outra
// conta é apagada pela mesma limpeza que apaga o cache dela — uma regra só,
// sem uma segunda que pudesse divergir.
//
// ── Nada é descartado automaticamente ───────────────────────────────────
// Não há limite de tentativas, prazo de validade nem "falhou demais, some".
// **A única remoção sem gesto humano é a da entrada que o servidor ACEITOU.**
// Descarte é decisão da advogada, com confirmação que nomeia o que se perde.
// ═══════════════════════════════════════════════════════════════════════════

import { buildQueueKey } from './cacheKey.js';
import * as store from './offlineStore.js';
import { montarEntrada, marcarFalha, marcarPendente } from './outboxEntry.js';
import { ordenarFila, proximaEntrada } from './outboxPlan.js';
import { classificarFalha, mensagemDaFalha } from './outboxMessages.js';
import {
  getApiErrorMessage,
  getApiErrorStatus,
  getApiErrorConflict,
  getApiErrorDetails
} from '../utils/apiError.js';

const chaveDe = (userId, id) => buildQueueKey({ userId, chave: id });

// Só as entradas DESTE usuário. A leitura é a segunda barreira do escopo: a
// primeira é a chave, e as duas erram de formas diferentes.
const lerFilaCrua = async (userId) => {
  const registros = await store.listFila();
  return registros
    .filter((r) => r?.chave === chaveDe(userId, r?.entrada?.id))
    .map((r) => r.entrada);
};

export const listarFila = async (userId) => {
  try {
    if (!userId) return [];
    return ordenarFila(await lerFilaCrua(userId));
  } catch {
    return [];
  }
};

export const contarFila = async (userId) => (await listarFila(userId)).length;

// Enfileirar é a ÚNICA escrita que a F-5b acrescenta ao banco local. `seq` sai
// do tamanho da fila no momento: duas gravações no mesmo milissegundo precisam
// de ordem determinística, e um contador de módulo zeraria ao recarregar a
// página — a fila, não.
export const enfileirar = async ({
  userId, method, url, body, versaoVista = null, titulo = null, agora = Date.now()
}) => {
  const fila = await listarFila(userId);
  const entrada = montarEntrada({
    method, url, body, versaoVista, titulo, agora, seq: fila.length
  });

  // ⚠️ Devolve `null` quando a gravação NÃO aconteceu — IndexedDB indisponível
  // (navegação privativa, cota, banco em estado ruim). Quem chama precisa
  // saber: dizer "ficou na fila" sobre algo que não ficou em lugar nenhum é
  // perda de dado com mensagem de sucesso, que é o pior desfecho possível
  // desta fase.
  const gravou = await store.putFila({ chave: chaveDe(userId, entrada.id), entrada });
  return gravou ? entrada : null;
};

const gravar = async (userId, entrada) =>
  store.putFila({ chave: chaveDe(userId, entrada.id), entrada });

// ── O motivo da falha, em forma que a tela entende ──────────────────────
//
// Nenhuma leitura de `err.response` aqui: quem abre o corpo do erro é
// `utils/apiError.js`, e essa regra não abre exceção para a fila.
export const descreverFalha = (err) => {
  const status = getApiErrorStatus(err);
  const { regra } = getApiErrorConflict(err);
  const classificacao = classificarFalha({
    status,
    regra,
    offline: status === null
  });

  return {
    classificacao,
    status,
    regra: regra ?? null,
    mensagem: mensagemDaFalha(classificacao, {
      motivoDoServidor: status === null ? null : getApiErrorMessage(err, null)
    }),
    // O 409 da DEC-060 manda o registro como está no servidor. É o que permite
    // à tela mostrar AS DUAS versões sem sair buscando nada logo depois de uma
    // falha de rede.
    atual: classificacao === 'conflito' ? (getApiErrorDetails(err)?.atual ?? null) : null,
    em: Date.now()
  };
};

// ── O reenvio ───────────────────────────────────────────────────────────
//
// `enviar` é injetado: quem sabe falar com o servidor é a camada de API, e
// receber a função aqui é o que permite provar a ORDEM e a PARADA na suíte,
// sem rede e sem navegador. É a mesma razão pela qual a política é pura.
export const enviarFila = async ({ userId, enviar }) => {
  let fila = await listarFila(userId);
  const enviadas = [];
  let bloqueio = null;

  for (;;) {
    const entrada = proximaEntrada(fila);
    if (!entrada) break;

    try {
      await enviar(entrada);
      await store.removeFila(chaveDe(userId, entrada.id));
      fila = fila.filter((e) => e.id !== entrada.id);
      enviadas.push(entrada.id);
    } catch (err) {
      const falha = descreverFalha(err);
      const marcada = marcarFalha(entrada, falha);
      await gravar(userId, marcada);
      fila = fila.map((e) => (e.id === entrada.id ? marcada : e));
      bloqueio = { id: entrada.id, falha };
      // ⚠️ PARA. A próxima pode depender desta, e continuar produziria um
      // estado que ninguém pediu — metade das alterações aplicadas, sem que
      // nada na tela explique quais.
      break;
    }
  }

  return { enviadas, bloqueio, restantes: fila.length };
};

// "Tentar de novo": a entrada volta a `pendente`, **com a mesma chave de
// idempotência**. Se a gravação anterior chegou ao servidor e só a resposta se
// perdeu, o reenvio devolve o resultado dela em vez de criar um segundo
// registro (DEC-059).
export const tentarDeNovo = async (userId, id) => {
  const fila = await listarFila(userId);
  const entrada = fila.find((e) => e.id === id);
  if (!entrada) return null;
  const pendente = marcarPendente(entrada);
  await gravar(userId, pendente);
  return pendente;
};

// ── O conflito, resolvido pela advogada (DEC-060) ───────────────────────
//
// "A minha versão vale": a entrada que levou 409 sai, e uma **nova** entra —
// mesmo corpo, mas com a versão que o servidor devolveu, e com uma chave de
// idempotência NOVA.
//
// A chave nova é o ponto: sobrescrever de propósito, depois de ver as duas
// versões, é **outra intenção** — não é o reenvio da primeira. Repetir a chave
// antiga faria o servidor devolver o 409 guardado, ou pior, tratá-la como a
// mesma gravação. E é o que mantém a fila append-only: a decisão de
// sobrescrever é um registro novo, não a edição de um registro antigo.
export const manterMinhaVersao = async (userId, id, agora = Date.now()) => {
  const fila = await listarFila(userId);
  const entrada = fila.find((e) => e.id === id);
  if (!entrada || entrada.falha?.classificacao !== 'conflito') return null;

  const versaoDoServidor = entrada.falha?.atual?.updatedAt ?? null;

  const nova = montarEntrada({
    method: entrada.method,
    url: entrada.url,
    body: entrada.body,
    versaoVista: versaoDoServidor,
    titulo: entrada.titulo,
    agora,
    seq: fila.length
  });

  await store.putFila({ chave: chaveDe(userId, nova.id), entrada: nova });
  await store.removeFila(chaveDe(userId, entrada.id));
  return nova;
};

// A ÚNICA remoção sem sucesso do servidor — e ela só existe porque a advogada
// pediu, na tela, com a frase que nomeia o que se perde. Nenhum caminho
// automático chama isto.
export const descartar = async (userId, id) => {
  await store.removeFila(chaveDe(userId, id));
  return true;
};
