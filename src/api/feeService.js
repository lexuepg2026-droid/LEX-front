import api from './axiosConfig';

// `busca` ALARGOU na F-1b.3 (casa também o número do processo) e ganhou o par
// de período `de`/`ate`, por VENCIMENTO do honorário.
const listFees = ({ page = 1, limit = 20, processoId, busca, tipo, status, de, ate } = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  if (busca) params.busca = busca;
  if (tipo) params.tipo = tipo;
  if (status) params.status = status;
  if (de) params.de = de;
  if (ate) params.ate = ate;
  return api.get('/fees', { params });
};
// Fase 3.2 (DEC-101): a busca do seletor de honorário dos formulários de
// parcela e de pagamento. Dispara pela digitação (espera de 300 ms), então vai
// com `semToastGlobal` (DEC-084): a falha aparece em linha, no próprio campo.
// Até 20 sugestões — quem não achou digita mais uma letra.
export const LIMITE_DE_SUGESTOES = 20;
const buscarHonorarios = (busca) =>
  api.get('/fees', { params: { page: 1, limit: LIMITE_DE_SUGESTOES, busca }, semToastGlobal: true });
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
  buscarHonorarios,
  getFeeById,
  createFee,
  updateFee,
  deleteFee,
  getStatement,
  listRenegotiations,
  createRenegotiation
};
