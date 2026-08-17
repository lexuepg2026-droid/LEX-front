import axios from 'axios';
import { toast } from '../utils/toast';
import { BASE_URL } from './baseURL';

// URL da API por variável de ambiente: endereço de máquina dentro de código
// comitado é a mesma classe de problema do CORS_ORIGIN que derrubou o login
// numa apresentação. A resolução (e o fallback só-em-dev) mora em
// `api/baseURL.js`, compartilhada com a instância do portal.
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthMe = error.config?.url === '/auth/me';
    const isOnLogin = window.location.pathname === '/login';
    if (error.response?.status === 401 && !isAuthMe && !isOnLogin && !isRedirecting) {
      isRedirecting = true;
      toast.error('Sessão expirada. Faça login novamente.');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;