import api from './axiosConfig';

const listPayments = ({ page = 1, limit = 20, installmentId, processoId, formaPagamento } = {}) => {
  const params = { page, limit };
  if (installmentId) params.installmentId = installmentId;
  if (processoId) params.processoId = processoId;
  if (formaPagamento) params.formaPagamento = formaPagamento;
  return api.get('/payments', { params });
};
const getPaymentById = (id) => api.get(`/payments/${id}`);
const createPayment = (data) => api.post('/payments', data);
const updatePayment = (id, data) => api.put(`/payments/${id}`, data);
const removePayment = (id) => api.delete(`/payments/${id}`);

export default { listPayments, getPaymentById, createPayment, updatePayment, removePayment };
