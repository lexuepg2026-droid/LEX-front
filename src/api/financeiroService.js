import api from './axiosConfig';

const getResumo = () => api.get('/financeiro/resumo');

export default { getResumo };
