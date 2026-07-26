import api from './axiosConfig';

const getAllClients = ({ page = 1, limit = 20, busca } = {}) => {
  const params = { page, limit };
  if (busca) params.busca = busca;
  return api.get('/clients', { params });
};

const getClientById = (id) => api.get(`/clients/${id}`);

const createClient = (data) => api.post('/clients', data);

// PATCH: a rota faz merge parcial, só sobrescreve o que vem no payload.
// O PUT continua existindo no backend como alias depreciado.
const updateClient = (id, data) => api.patch(`/clients/${id}`, data);

const deleteClient = (id) => api.delete(`/clients/${id}`);

export default { getAllClients, getClientById, createClient, updateClient, deleteClient };
