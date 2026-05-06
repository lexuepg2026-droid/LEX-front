import api from './axiosConfig';

const listProcesses = () => api.get('/processes');
const getProcessById = (id) => api.get(`/processes/${id}`);
const createProcess = (data) => api.post('/processes', data);
const updateProcess = (id, data) => api.put(`/processes/${id}`, data);
const deleteProcess = (id) => api.delete(`/processes/${id}`);

export default { listProcesses, getProcessById, createProcess, updateProcess, deleteProcess };
