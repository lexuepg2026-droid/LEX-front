import api from './axiosConfig';

const register = (payload) => api.post('/auth/register', payload);

const login = (email, senha) => api.post('/auth/login', { email, senha });

const logout = () => api.post('/auth/logout');

const getMe = () => api.get('/auth/me');

const updateMe = (payload) => api.patch('/auth/me', payload);

const changePassword = (senhaAtual, novaSenha) =>
  api.post('/auth/alterar-senha', { senhaAtual, novaSenha });

// ── A-2 (DEC-064) — confirmação de e-mail e recuperação de senha ────────────
//
// As quatro usam `POST` mesmo a confirmação, que "só lê um link": o link do
// e-mail abre uma TELA, e é a tela que chama a API. Um `GET` com o token na URL
// seria consumido por qualquer coisa que pré-visualiza links (antivírus do
// provedor, leitor de e-mail) e o link chegaria gasto à pessoa.
const confirmEmail = (token) => api.post('/auth/confirm-email', { token });

const resendConfirmation = () => api.post('/auth/resend-confirmation');

const forgotPassword = (email) => api.post('/auth/forgot-password', { email });

const resetPassword = (token, novaSenha) =>
  api.post('/auth/reset-password', { token, novaSenha });

export default {
  register, login, logout, getMe, updateMe, changePassword,
  confirmEmail, resendConfirmation, forgotPassword, resetPassword,
};
