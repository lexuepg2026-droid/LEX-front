import api from './axiosConfig';

const listDocuments = ({ page = 1, limit = 20, processoId } = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  return api.get('/documents', { params });
};
const getDocumentById = (id) => api.get(`/documents/${id}`);
const createDocument = (data) => api.post('/documents', data);
const updateDocument = (id, data) => api.put(`/documents/${id}`, data);
const deleteDocument = (id) => api.delete(`/documents/${id}`);

export default { listDocuments, getDocumentById, createDocument, updateDocument, deleteDocument };
