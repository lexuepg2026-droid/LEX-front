import api from './axiosConfig';

const listFees = ({ page = 1, limit = 20, processoId } = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  return api.get('/fees', { params });
};
const getFeeById = (id) => api.get(`/fees/${id}`);
const createFee = (data) => api.post('/fees', data);
const updateFee = (id, data) => api.put(`/fees/${id}`, data);
const deleteFee = (id) => api.delete(`/fees/${id}`);

export default { listFees, getFeeById, createFee, updateFee, deleteFee };
