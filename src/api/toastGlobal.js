import { getApiErrorStatus, getApiServerMessage } from '../utils/apiError.js';

// ═══════════════════════════════════════════════════════════════════════════
// O TOAST GLOBAL DE ERRO — a política, estreita de propósito (Fase 2b, DEC-084)
//
// O interceptor de `axiosConfig.js` só emitia um toast: "Sessão expirada". O
// resto ficava com cada tela, e as falhas que nenhuma tela sabe explicar — o
// servidor fora, o 500, o excesso de tentativas — chegavam como "Network
// Error" num `catch` ou não chegavam.
//
// A regra é a do inventário (seção 4.3): o toast automático é para o que a
// tela NÃO tem como tratar melhor.
//
//   mostra      sem resposta com sinal (servidor fora, CORS, tempo esgotado),
//               5xx (inclui o 502 do envio de e-mail) e 429;
//   não mostra  400, 404, 409 e 422 — a tela destaca o campo ou lista as
//               pendências, e um toast por cima repetiria a frase;
//               401 — é a sessão perdida, que tem o próprio toast;
//               a escrita recusada ou enfileirada sem sinal (`offline`), que
//               já tem frase na tela;
//               o pedido cancelado (`ERR_CANCELED`), que não é falha;
//               e qualquer pedido com `semToastGlobal: true` — as chamadas de
//               fundo, que não podem gritar a cada cinco minutos.
//
// ── Por que módulo separado ──────────────────────────────────────────────
// O motivo de `api/sessionLoss.js`: `axiosConfig.js` importa sem extensão e a
// suíte (`node --test`) não o carrega. Aqui a decisão é chamada de verdade,
// caso a caso, em `tests/regressions/fase2b.test.js`.
//
// O portal NÃO usa isto: `portalAxios.js` é outra instância, roda no aparelho
// do cliente, e há teste travando que ele não importa este arquivo.
// ═══════════════════════════════════════════════════════════════════════════

const ehTempoEsgotado = (erro) => erro?.code === 'ECONNABORTED' || erro?.code === 'ETIMEDOUT';

export function deveExibirToastGlobal(erro, config, online) {
  if (config?.semToastGlobal === true) return false;
  // A fila offline (F-5a/F-5b): recusada ou guardada, a tela já diz o quê.
  if (erro?.offline === true || erro?.enfileirado === true) return false;
  if (erro?.code === 'ERR_CANCELED') return false;

  const status = getApiErrorStatus(erro);

  // Sem resposta. Com sinal, é o servidor que não respondeu; sem sinal, quem
  // explica é a frase da F-5a, e a tela de leitura cai no espelho local.
  if (status === null) return online === true;

  if (status === 401) return false;
  if (status === 429) return true;
  return status >= 500;
}

export const MENSAGEM_SEM_RESPOSTA =
  'Não foi possível falar com o servidor. Confira a conexão e tente de novo.';
export const MENSAGEM_TEMPO_ESGOTADO =
  'O servidor demorou demais para responder. Tente de novo em instantes.';
export const MENSAGEM_ERRO_DO_SERVIDOR =
  'O servidor encontrou um erro e não concluiu o pedido. Tente de novo em instantes.';
export const MENSAGEM_MUITAS_TENTATIVAS =
  'Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.';

// A frase do servidor quando ele escreveu uma (o 429 "Aguarde um minuto…", o
// 502 "Não foi possível enviar o e-mail agora…"); a nossa quando não — o 500
// genérico, e o 502/503 do proxy, que chega sem corpo nosso.
export function mensagemDoToastGlobal(erro) {
  const status = getApiErrorStatus(erro);
  if (status === null) return ehTempoEsgotado(erro) ? MENSAGEM_TEMPO_ESGOTADO : MENSAGEM_SEM_RESPOSTA;

  const doServidor = getApiServerMessage(erro);
  if (status === 429) return doServidor ?? MENSAGEM_MUITAS_TENTATIVAS;
  if (doServidor && doServidor !== 'Erro interno do servidor') return doServidor;
  return MENSAGEM_ERRO_DO_SERVIDOR;
}

// ── A marca no erro, para a tela não repetir ─────────────────────────────
// Uma tela que faz `toast.error(getApiErrorMessage(err))` no `catch` mostraria
// o mesmo problema duas vezes, com duas frases — e frases diferentes a
// deduplicação da DEC-083 não junta. O interceptor marca o erro que já foi
// avisado; a tela pergunta antes do próprio toast. O erro EM LINHA continua:
// ele diz onde, e o toast diz o quê.
export const marcarAvisado = (erro) => {
  if (erro && typeof erro === 'object') erro.avisadoPeloToastGlobal = true;
};

export const jaAvisadoPeloToastGlobal = (erro) => erro?.avisadoPeloToastGlobal === true;
