import axios from 'axios';
import { toast } from '../utils/toast';
import { BASE_URL } from './baseURL';
import { ehSessaoPerdida, haviaSessao, registrarSessao } from './sessionLoss';
import { lerOnline } from '../offline/online';
import { shouldBlockWrite, offlineWriteError, offlineQueuedError } from '../offline/writeGuard';
import { identificarOperacao } from '../offline/outboxOperations';
import { tituloDaRequisicao } from '../offline/outboxMessages';
import { enfileirar } from '../offline/outbox';
import { usuarioAtual } from '../offline/currentUser';
import { CABECALHO_VERSAO } from '../offline/versionHeader';
import { offlineErrorMessage } from '../offline/offlineMessages';

// URL da API por variável de ambiente: endereço de máquina dentro de código
// comitado é a mesma classe de problema do CORS_ORIGIN que derrubou o login
// numa apresentação. A resolução (e o fallback só-em-dev) mora em
// `api/baseURL.js`, compartilhada com a instância do portal.
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ═══════════════════════════════════════════════════════════════════════════
// O INTERCEPTOR DE SESSÃO PERDIDA — DEC-050
//
// A REGRA mora em `api/sessionLoss.js`, com o histórico do defeito V-2 e o
// motivo de ela não ser uma lista de rotas. Aqui ficou só a fiação: perguntar,
// e agir se a resposta for sim.
//
// Havia dois testes de URL neste arquivo — `url === '/auth/me'` e
// `pathname === '/login'`. Os dois SAÍRAM. O interceptor não olha mais nem a
// rota da requisição nem o caminho da página: ele pergunta se havia sessão a
// perder, e mais nada.
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// SEM SINAL — a segunda barreira da escrita, e o fim do erro genérico (F-5a)
//
// A REGRA mora em `offline/writeGuard.js`, com o motivo de ela ser a segunda
// barreira e não a única. Aqui, como no interceptor de sessão, ficou só a
// fiação: perguntar, e agir se a resposta for sim.
//
// **A escrita sem sinal nem sai do aparelho.** Ela é recusada aqui, antes da
// rede, com a frase que diz o que fazer — porque deixar o envio partir para
// dar erro depois perde o que foi digitado.
//
// Este é o único ramo do app onde o interceptor da advogada escreve na
// mensagem do erro, e é deliberado: `getApiErrorMessage` lê `err.message`
// depois do corpo do servidor, então **toda tela que já usa o helper passa a
// dizer "sem conexão" em vez de "falha ao carregar" sem ser tocada.** É o que
// cumpre "nada de erro genérico de rede na tela" nas dezenas de telas que esta
// fase não converteu.
//
// O `portalAxios.js` NÃO recebe nada disto: o portal roda no aparelho do
// cliente e a F-5a não toca nele (Parte 0).
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
// F-5b — A EXCEÇÃO DA FILA (DEC-059)
//
// A regra da F-5a continua sendo a regra: **sem sinal, escrita não sai**. O que
// a F-5b acrescentou é uma lista fechada de exceções — compromisso da agenda e
// mudança de fase — que, em vez de serem recusadas, são **enfileiradas**.
//
// O financeiro NÃO está nessa lista, e a razão está escrita em
// `offline/outboxOperations.js`: toda validação de dinheiro depende de estado
// do servidor que o aparelho offline não tem como conferir.
//
// A requisição continua não saindo daqui; o que muda é o que a rejeição
// significa. `offlineQueuedError` carrega a marca `enfileirado`, e é por ela —
// e não pelo texto da mensagem — que a tela distingue "ficou guardado" de
// "não deu para fazer".
// ═══════════════════════════════════════════════════════════════════════════
api.interceptors.request.use(async (config) => {
  // O reenvio da fila passa por aqui de volta. Sem esta saída, uma falha de
  // rede no meio do reenvio enfileiraria a entrada de novo — e a fila cresceria
  // sozinha, com cópias da mesma gravação.
  if (config.daFila) return config;

  if (!shouldBlockWrite({ method: config.method, online: lerOnline() })) return config;

  const operacao = identificarOperacao({ method: config.method, url: config.url });
  const userId = usuarioAtual();

  // Sem operação enfileirável, ou sem usuário para escopar a entrada, a recusa
  // é a da F-5a — inteira, com a frase que diz o que fazer.
  if (!operacao || !userId) return Promise.reject(offlineWriteError(config));

  const entrada = await enfileirarComSeguranca({
    userId,
    method: config.method,
    url: config.url,
    body: config.data ?? null,
    // O `updatedAt` que a tela leu, quando ela mandou um (DEC-060). É o que
    // permite ao servidor recusar a gravação atrasada em vez de atropelar a de
    // outro aparelho — horas depois, quando a fila subir.
    // `AxiosHeaders` preserva a caixa original, mas `get()` é o acessor que
    // não depende disso — e o cabeçalho tem de chegar íntegro à fila, senão a
    // guarda de versão simplesmente não acontece lá na frente, em silêncio.
    versaoVista:
      config.headers?.get?.(CABECALHO_VERSAO) ?? config.headers?.[CABECALHO_VERSAO] ?? null,
    titulo: tituloDaRequisicao(operacao.id, config.data)
  });

  // Enfileirar falhou (banco indisponível): a recusa volta a ser a da F-5a. É
  // pior do que guardar, mas é honesto — e a advogada continua com o que
  // digitou na tela, que é o que a Parte 4 da F-5a protege.
  if (!entrada) return Promise.reject(offlineWriteError(config));

  return Promise.reject(offlineQueuedError(config, entrada));
});

// `enfileirar` já devolve `null` quando não gravou; o `try` cobre o caso de o
// próprio banco lançar antes disso.
async function enfileirarComSeguranca(dados) {
  try {
    return await enfileirar(dados);
  } catch {
    return null;
  }
}

// Uma redireção só: várias requisições em paralelo devolvem vários 401, e sem
// isto a advogada veria o toast repetido e uma navegação por resposta.
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Sem sinal, a mensagem passa a ser a que explica o estado. `null` quando
    // não é o caso — e aí o erro segue exatamente como estava.
    const semSinal = offlineErrorMessage(error, { online: lerOnline() });
    if (semSinal) error.message = semSinal;

    if (ehSessaoPerdida(error.response?.status, haviaSessao()) && !isRedirecting) {
      isRedirecting = true;
      // A sessão já era. Baixar a bandeira aqui evita que um 401 atrasado, que
      // chegue durante a navegação, tente redirecionar de novo.
      registrarSessao(false);
      toast.error('Sessão expirada. Faça login novamente.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
