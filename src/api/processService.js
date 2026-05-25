import api from './axiosConfig';

const listProcesses = ({ page = 1, limit = 20, busca, status } = {}) => {
  const params = { page, limit };
  if (busca) params.busca = busca;
  if (status) params.status = status;
  return api.get('/processes', { params });
};
const getProcessById = (id) => api.get(`/processes/${id}`);
const createProcess = (data) => api.post('/processes', data);
const updateProcess = (id, data) => api.put(`/processes/${id}`, data);
const deleteProcess = (id) => api.delete(`/processes/${id}`);

export default { listProcesses, getProcessById, createProcess, updateProcess, deleteProcess };
