import api from './axiosConfig';

// Seção é template reutilizável, não pertence a um documento: o mesmo texto de
// qualificação serve a procuração, contrato e declaração. A ligação com o
// documento — e a ordem dentro dele — é a tela de montagem da Fase 2D.2.

const listSecoes = ({ page = 1, limit = 20, tipo, busca } = {}) => {
  const params = { page, limit };
  if (tipo) params.tipo = tipo;
  // A busca do backend ignora caixa e acento: "qualificacao" acha
  // "Qualificação". Não normalizar nada aqui.
  if (busca) params.busca = busca;
  return api.get('/secoes', { params });
};

const getSecaoById = (id) => api.get(`/secoes/${id}`);

const createSecao = (data) => api.post('/secoes', data);

// PATCH: a rota faz merge parcial, como no resto do projeto.
const updateSecao = (id, data) => api.patch(`/secoes/${id}`, data);

// Soft delete. Recusa com 409 quando a seção está vinculada a documento ativo,
// e a mensagem do backend já diz a quais — só exibir.
const deleteSecao = (id) => api.delete(`/secoes/${id}`);

export default {
  listSecoes,
  getSecaoById,
  createSecao,
  updateSecao,
  deleteSecao,
};
