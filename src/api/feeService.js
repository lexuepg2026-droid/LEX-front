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
// PATCH, e não PUT (Fase 4.2). `PUT` sobrevive no backend apenas como alias
// depreciado; os dois caem no mesmo handler, mas o verbo do projeto é PATCH
// desde a Fase 1.3 e manter o alias vivo no cliente é o que faz um alias
// "temporário" durar cinco fases.
const updateFee = (id, data) => api.patch(`/fees/${id}`, data);
const deleteFee = (id) => api.delete(`/fees/${id}`);

// ── Sub-recursos do honorário (F-1a) ───────────────────────────────────────
//
// O EXTRATO é a linha do tempo do dinheiro desta cobrança — pagamentos,
// estornos, alocações com vínculo, reparcelamentos e mudanças de status,
// mesclados por data e paginados no padrão da F-0. A tela é da F-1b.
//
// O REPARCELAMENTO (DEC-037) recebe o plano de parcelas novas, cuja soma
// precisa igualar o saldo em aberto. A tela ponta a ponta é da F-1c.
const getStatement = (id, { page = 1, limit = 100 } = {}) =>
  api.get(`/fees/${id}/statement`, { params: { page, limit } });
const listRenegotiations = (id) => api.get(`/fees/${id}/renegotiations`);
const createRenegotiation = (id, data) => api.post(`/fees/${id}/renegotiations`, data);

export default {
  listFees,
  getFeeById,
  createFee,
  updateFee,
  deleteFee,
  getStatement,
  listRenegotiations,
  createRenegotiation
};
