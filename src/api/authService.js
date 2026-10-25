import api from './axiosConfig';

const register = (payload) => api.post('/auth/register', payload);

// ── `semToastGlobal` nas três telas que já mostram o erro EM LINHA ──────────
// (Fase 2b, DEC-084): login, "esqueci a senha" e o reenvio da confirmação. O
// 429 do limite de tentativas e o 502 do envio de e-mail entrariam no toast
// global E na frase da tela, e a advogada leria a mesma coisa duas vezes. Aqui
// quem fala é a tela — no reenvio pelo menu do usuário, que fecha ao clicar,
// o próprio menu mostra o toast (`useConfirmacaoEmail` devolve `jaAvisado`
// falso, e ele não se cala).
const SO_A_TELA_AVISA = { semToastGlobal: true };

const login = (email, senha) => api.post('/auth/login', { email, senha }, SO_A_TELA_AVISA);

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

const resendConfirmation = () => api.post('/auth/resend-confirmation', undefined, SO_A_TELA_AVISA);

const forgotPassword = (email) => api.post('/auth/forgot-password', { email }, SO_A_TELA_AVISA);

const resetPassword = (token, novaSenha) =>
  api.post('/auth/reset-password', { token, novaSenha });

export default {
  register, login, logout, getMe, updateMe, changePassword,
  confirmEmail, resendConfirmation, forgotPassword, resetPassword,
};
