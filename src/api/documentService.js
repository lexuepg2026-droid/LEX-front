import api from './axiosConfig';

const listDocuments = ({ page = 1, limit = 20, processoId } = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  return api.get('/documents', { params });
};
const getDocumentById = (id) => api.get(`/documents/${id}`);
const createDocument = (data) => api.post('/documents', data);
// PATCH: a rota faz merge parcial. O PUT segue no backend como alias depreciado.
const updateDocument = (id, data) => api.patch(`/documents/${id}`, data);
const deleteDocument = (id) => api.delete(`/documents/${id}`);

export default { listDocuments, getDocumentById, createDocument, updateDocument, deleteDocument };
