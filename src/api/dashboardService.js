import api from './axiosConfig';

const getDashboardSummary = () => api.get('/dashboard');

export default { getDashboardSummary };
