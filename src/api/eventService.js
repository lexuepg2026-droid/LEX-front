import api from './axiosConfig';

const listEvents = ({ page = 1, limit = 20, processoId, tipo, situacao, concluido, busca } = {}) => {
  const params = { page, limit };
  if (processoId) params.processoId = processoId;
  if (tipo) params.tipo = tipo;
  if (situacao) params.situacao = situacao;
  if (concluido !== undefined && concluido !== '') params.concluido = concluido;
  if (busca) params.busca = busca;
  return api.get('/events', { params });
};

const getEventById = (id) => api.get(`/events/${id}`);
const createEvent = (data) => api.post('/events', data);

// PATCH, e não PUT: recurso novo não ganha o alias depreciado — ele existe só
// em `/clients`, `/processes` e `/documents`, por compatibilidade.
const updateEvent = (id, data) => api.patch(`/events/${id}`, data);

// Rota PRÓPRIA. `concluido` e `concluidoEm` são um fato só com carimbo, e o
// PATCH comum os recusa — a mesma razão que deu rota própria à `fase` na
// DEC-054.
const concludeEvent = (id, concluido) => api.patch(`/events/${id}/concluir`, { concluido });

const deleteEvent = (id) => api.delete(`/events/${id}`);
const reactivateEvent = (id) => api.patch(`/events/${id}/reactivate`);

export default {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  concludeEvent,
  deleteEvent,
  reactivateEvent,
};
