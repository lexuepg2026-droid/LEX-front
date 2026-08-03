import api from './axiosConfig';

const listInstallments = ({ page = 1, limit = 20, processoId, status, inativos } = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  if (status) params.status = status;
  // `inativos=true` lista SÓ as desativadas — é um modo, não um "incluir".
  if (inativos) params.inativos = true;
  return api.get('/installments', { params });
};
const getInstallmentById = (id) => api.get(`/installments/${id}`);
const createInstallment = (data) => api.post('/installments', data);
// PATCH, e não PUT — ver a nota em `feeService.js`.
const updateInstallment = (id, data) => api.patch(`/installments/${id}`, data);
const deleteInstallment = (id) => api.delete(`/installments/${id}`);
// Reativação (Fase 4.5): rota própria, sem corpo.
const reativarInstallment = (id) => api.patch(`/installments/${id}/reativar`);

export default {
  listInstallments,
  getInstallmentById,
  createInstallment,
  updateInstallment,
  reativarInstallment,
  deleteInstallment
};
