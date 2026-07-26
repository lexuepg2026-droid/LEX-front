import api from './axiosConfig';

const register = (payload) => api.post('/auth/register', payload);

const login = (email, senha) => api.post('/auth/login', { email, senha });

const logout = () => api.post('/auth/logout');

const getMe = () => api.get('/auth/me');

const updateMe = (payload) => api.patch('/auth/me', payload);

const changePassword = (senhaAtual, novaSenha) =>
  api.post('/auth/alterar-senha', { senhaAtual, novaSenha });

export default { register, login, logout, getMe, updateMe, changePassword };
