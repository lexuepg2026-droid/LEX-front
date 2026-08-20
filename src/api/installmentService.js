import api from './axiosConfig';

// `honorarioId`, `busca`, `de` e `ate` são da F-1b.3. O parâmetro chama-se
// `honorarioId` e não `feeId`: é o `feeId` do schema, com o nome que a tela e
// a listagem de pagamentos já usam — dois nomes para o mesmo recorte, um por
// rota, obrigaria a tela a lembrar qual é qual. O período recorta por
// VENCIMENTO.
const listInstallments = ({
  page = 1, limit = 20, processoId, honorarioId, status, inativos, busca, de, ate
} = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  if (honorarioId) params.honorarioId = honorarioId;
  if (status) params.status = status;
  // `inativos=true` lista SÓ as desativadas — é um modo, não um "incluir".
  if (inativos) params.inativos = true;
  if (busca) params.busca = busca;
  if (de) params.de = de;
  if (ate) params.ate = ate;
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
