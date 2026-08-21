import axios from 'axios';
import { toast } from '../utils/toast';
import { BASE_URL } from './baseURL';
import { ehSessaoPerdida, haviaSessao, registrarSessao } from './sessionLoss';

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

// Uma redireção só: várias requisições em paralelo devolvem vários 401, e sem
// isto a advogada veria o toast repetido e uma navegação por resposta.
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
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
