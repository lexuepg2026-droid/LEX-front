import axios from 'axios';
import { toast } from '../utils/toast';
import { BASE_URL } from './baseURL';
import { ehSessaoPerdida, haviaSessao, registrarSessao } from './sessionLoss';
import { lerOnline } from '../offline/online';
import { shouldBlockWrite, offlineWriteError } from '../offline/writeGuard';
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
api.interceptors.request.use((config) => {
  if (shouldBlockWrite({ method: config.method, online: lerOnline() })) {
    return Promise.reject(offlineWriteError(config));
  }
  return config;
});

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
