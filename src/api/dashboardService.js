import api from './axiosConfig';

const getDashboardSummary = () => api.get('/dashboard');

// Fase 4a2 (DEC-161): `getStatusCounts` (`/dashboard/status`) e
// `getFeesByMonth` (`/dashboard/honorarios-por-mes`) saíram com os gráficos do
// Início, que eram os únicos a chamá-las. As rotas continuam no back.
export default { getDashboardSummary };
