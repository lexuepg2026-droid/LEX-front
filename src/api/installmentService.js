import api from './axiosConfig';

const listInstallments = () => api.get('/installments');
const getInstallmentById = (id) => api.get(`/installments/${id}`);
const createInstallment = (data) => api.post('/installments', data);
const updateInstallment = (id, data) => api.put(`/installments/${id}`, data);
const deleteInstallment = (id) => api.delete(`/installments/${id}`);

export default { listInstallments, getInstallmentById, createInstallment, updateInstallment, deleteInstallment };
