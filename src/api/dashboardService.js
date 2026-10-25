import api from './axiosConfig';

const getDashboardSummary = () => api.get('/dashboard');
const getStatusCounts    = () => api.get('/dashboard/status');
// `mes` (DEC-098): a janela de 6 meses TERMINA no mês escolhido.
const getFeesByMonth     = (mes) =>
  api.get('/dashboard/honorarios-por-mes', mes ? { params: { mes } } : undefined);

export default { getDashboardSummary, getStatusCounts, getFeesByMonth };
