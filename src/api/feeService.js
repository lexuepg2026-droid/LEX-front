import api from './axiosConfig';

const listFees = ({ page = 1, limit = 20, processoId, busca, tipo, status } = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  if (busca) params.busca = busca;
  if (tipo) params.tipo = tipo;
  if (status) params.status = status;
  return api.get('/fees', { params });
};
const getFeeById = (id) => api.get(`/fees/${id}`);
const createFee = (data) => api.post('/fees', data);
const updateFee = (id, data) => api.put(`/fees/${id}`, data);
const deleteFee = (id) => api.delete(`/fees/${id}`);

export default { listFees, getFeeById, createFee, updateFee, deleteFee };
