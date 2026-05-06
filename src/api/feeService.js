import api from './axiosConfig';

const listFees = () => api.get('/fees');
const getFeeById = (id) => api.get(`/fees/${id}`);
const createFee = (data) => api.post('/fees', data);
const updateFee = (id, data) => api.put(`/fees/${id}`, data);
const deleteFee = (id) => api.delete(`/fees/${id}`);

export default { listFees, getFeeById, createFee, updateFee, deleteFee };
