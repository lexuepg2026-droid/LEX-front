import axios from 'axios';
import { toast } from '../utils/toast';

// URL da API por variável de ambiente: endereço de máquina dentro de código
// comitado é a mesma classe de problema do CORS_ORIGIN que derrubou o login
// numa apresentação. O fallback mantém o `npm run dev` funcionando sem .env.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api',
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