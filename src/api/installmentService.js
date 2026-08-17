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

// `reativarInstallment` SAIU na F-1a: a rota morreu (DEC-034) e responde 404.
// Parcela que sai de circulação por decisão da advogada sai por REPARCELAMENTO,
// cancelada COM vínculo — "reativar" uma dessas ressuscitaria uma cobrança que
// foi substituída, ao lado da que a substituiu.

export default {
  listInstallments,
  getInstallmentById,
  createInstallment,
  updateInstallment,
  deleteInstallment
};
