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

// ── Modelos, geração e preview ─────────────────────────────────────────────

const listModelos = ({ page = 1, limit = 20, tipo } = {}) => {
  const params = { page, limit };
  if (tipo) params.tipo = tipo;
  return api.get('/documents/modelos', { params });
};

// `clienteId` escolhe de qual participante do processo sai a qualificação
// (omitido, usa o principal). `honorarioId` só é exigido quando o modelo usa
// variáveis de honorário e o processo tem mais de um ativo — nesse caso o
// backend devolve 422 listando as opções.
// `confirmarSobrescrita` só é necessário ao regerar por cima de um documento
// já editado à mão, que sem ela responde 409.
const gerarDocumento = (modeloId, { processoId, clienteId, honorarioId, confirmarSobrescrita } = {}) =>
  api.post(`/documents/modelos/${modeloId}/gerar`, {
    processoId,
    clienteId,
    honorarioId,
    confirmarSobrescrita,
  });

const previewDocumento = (id, { processoId, clienteId, honorarioId } = {}) => {
  const params = {};
  if (processoId) params.processoId = processoId;
  if (clienteId) params.clienteId = clienteId;
  if (honorarioId) params.honorarioId = honorarioId;
  return api.get(`/documents/${id}/preview`, { params });
};

// ── Texto final editável ───────────────────────────────────────────────────
// Depois de gerado, `textoResolvido` é a única fonte da verdade do documento —
// as seções permanecem só como rastreabilidade de origem. A primeira edição
// marca `editadoManualmente`, e a partir daí regerar exige confirmação.
// O editor em si é a Fase 2D; aqui vai apenas o método.
const atualizarTexto = (id, textoResolvido) =>
  api.patch(`/documents/${id}/texto`, { textoResolvido });

// ── Download ───────────────────────────────────────────────────────────────

// `responseType: 'blob'` é obrigatório: sem ele o axios tenta decodificar o
// binário como texto e o arquivo salvo fica corrompido.
const baixarDocumento = (id, formato = 'pdf') =>
  api.get(`/documents/${id}/download`, {
    params: { formato },
    responseType: 'blob',
  });

// Nome sugerido pelo backend (derivado de tipo + cliente + data). O header só
// é legível porque a rota expõe `Content-Disposition` via
// Access-Control-Expose-Headers.
const nomeDoAnexo = (response, alternativo) => {
  const disposition = response?.headers?.['content-disposition'] ?? '';
  return disposition.match(/filename="?([^";]+)"?/)?.[1] ?? alternativo;
};

export default {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  listModelos,
  gerarDocumento,
  previewDocumento,
  atualizarTexto,
  baixarDocumento,
  nomeDoAnexo,
};
