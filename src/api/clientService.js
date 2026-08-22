import api from './axiosConfig';

const getAllClients = ({ page = 1, limit = 20, busca, situacao } = {}) => {
  const params = { page, limit };
  // DEC-052: sem `situacao`, o padrão do backend é só ativos — nada muda.
  if (situacao) params.situacao = situacao;
  if (busca) params.busca = busca;
  return api.get('/clients', { params });
};

const getClientById = (id) => api.get(`/clients/${id}`);

const createClient = (data) => api.post('/clients', data);

// PATCH: a rota faz merge parcial, só sobrescreve o que vem no payload.
// O PUT continua existindo no backend como alias depreciado.
const updateClient = (id, data) => api.patch(`/clients/${id}`, data);

const deleteClient = (id) => api.delete(`/clients/${id}`);

// DEC-052 — a volta. NÃO reativa os processos do cliente: cada registro se
// reativa por si, e a resposta traz o aviso que a tela repete.
const reactivateClient = (id) => api.patch(`/clients/${id}/reactivate`);

// ── Acesso ao portal do cliente ────────────────────────────────────────────
//
// A SENHA entra por `senhaPortal` no corpo da criação e do `PATCH` — não há
// rota dedicada para defini-la, de propósito: é um campo do cliente como
// qualquer outro, e o formulário que já existe é onde a advogada está quando
// decide dar acesso.
//
// Toda gravação de senha pela advogada volta `senhaPortalProvisoria` para
// `true`. É deliberado, e é o fluxo de esquecimento: o cliente perdeu a senha,
// ela cadastra uma nova, ele troca no primeiro acesso. Não existe "ver a senha
// atual" — é hash, e a tela mostra ESTADO, nunca valor.
//
// A REVOGAÇÃO tem rota própria porque é ação deliberada com consequência
// imediata (o cliente perde o acesso agora), e não um campo esvaziado por
// descuido no meio de um formulário grande.
const revogarSenhaPortal = (id) => api.delete(`/clients/${id}/senha-portal`);

export default {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  reactivateClient,
  revogarSenhaPortal,
};
