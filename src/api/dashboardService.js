import api from './axiosConfig';

const getDashboardSummary = () => api.get('/dashboard');
const getStatusCounts    = () => api.get('/dashboard/status');
const getFeesByMonth     = () => api.get('/dashboard/honorarios-por-mes');

export default { getDashboardSummary, getStatusCounts, getFeesByMonth };
