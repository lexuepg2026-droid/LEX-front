import api from './axiosConfig';

const listInstallments = ({ page = 1, limit = 20, processoId, status } = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  if (status) params.status = status;
  return api.get('/installments', { params });
};
const getInstallmentById = (id) => api.get(`/installments/${id}`);
const createInstallment = (data) => api.post('/installments', data);
const updateInstallment = (id, data) => api.put(`/installments/${id}`, data);
const deleteInstallment = (id) => api.delete(`/installments/${id}`);

export default { listInstallments, getInstallmentById, createInstallment, updateInstallment, deleteInstallment };
