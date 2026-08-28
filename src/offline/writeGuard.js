// ═══════════════════════════════════════════════════════════════════════════
// A SEGUNDA BARREIRA — nenhuma escrita sai sem sinal (F-5a, Parte 4)
//
// A F-5a não grava offline: sem fila, sem outbox, sem `POST` guardado para
// depois — isso é a F-5b inteira, e misturar as duas é o modo mais fácil de
// estragar as duas. O que sobra para esta fase é **recusar cedo**, e recusar
// de um jeito que ensine.
//
// ── Duas barreiras, como na DEC-053 ──────────────────────────────────────
//
//   | Barreira | Onde | Contra o quê |
//   |---|---|---|
//   | botão desabilitado com o motivo | na TELA, ao renderizar | o clique inútil |
//   | esta guarda | no interceptor de requisição | o formulário que a tela não bloqueou, e o sinal que caiu entre abrir o formulário e clicar em Salvar |
//
// Sem a segunda, "nenhum formulário aceita envio que vai falhar" valeria só
// para as telas que alguém lembrou de converter — e o dia em que o sinal cai
// **entre** o clique e o envio não seria coberto por nenhuma delas.
//
// A escrita bloqueada aqui **nem sai do aparelho**: não é um erro de rede que
// voltou, é uma recusa local, imediata, com a frase que diz o que fazer. Deixar
// o envio partir para dar erro depois perde o que foi digitado — e é o que a
// Parte 4 proíbe.
//
// A regra mora neste arquivo, e não dentro do `axiosConfig.js`, pela razão que
// a DEC-050 registrou em `api/sessionLoss.js`: `axiosConfig.js` importa
// `utils/toast` sem extensão e a suíte não consegue carregá-lo. Regra que só
// pode ser verificada lendo texto não é regra provada.
// ═══════════════════════════════════════════════════════════════════════════

import { MENSAGEM_ESCRITA_OFFLINE } from './offlineMessages.js';

// `PATCH` é o verbo de atualização do projeto; `PUT` está na lista mesmo tendo
// sido eliminado das três rotas financeiras, porque a guarda é sobre o método
// HTTP, não sobre as rotas que existem hoje.
export const WRITE_METHODS = Object.freeze(['post', 'put', 'patch', 'delete']);

export const isWriteMethod = (method) =>
  typeof method === 'string' && WRITE_METHODS.includes(method.toLowerCase());

// `online` é PARÂMETRO, e não `navigator.onLine` lido aqui dentro: é o que
// permite provar os dois lados na suíte, sem navegador.
export const shouldBlockWrite = ({ method, online } = {}) =>
  isWriteMethod(method) && online === false;

// O erro que o interceptor rejeita. Ele carrega a frase em `message` de
// propósito: `getApiErrorMessage` lê `err.message` depois do corpo do servidor,
// então **toda tela que já usa o helper mostra a frase certa sem ser tocada**.
// A marca `offline` existe para quem precise distinguir isto de um erro de rede
// de verdade — ver `offlineErrorMessage`.
export const offlineWriteError = (config) => {
  const erro = new Error(MENSAGEM_ESCRITA_OFFLINE);
  erro.offline = true;
  erro.config = config;
  return erro;
};
