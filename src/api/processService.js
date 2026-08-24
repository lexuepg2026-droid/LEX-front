import api from './axiosConfig';

const listProcesses = ({ page = 1, limit = 20, busca, status, situacao, fase, liminar } = {}) => {
  const params = { page, limit };
  if (busca) params.busca = busca;
  if (status) params.status = status;
  // DEC-052: sem `situacao` o backend mantém o padrão de sempre (só ativos).
  // Não confundir com `status`, que é o andamento jurídico do processo.
  if (situacao) params.situacao = situacao;
  // DEC-054 — os dois eixos novos. `fase` é onde o processo está; `liminar`
  // recorta por `com`/`sem`, e vazio não filtra nada.
  if (fase) params.fase = fase;
  if (liminar) params.liminar = liminar;
  return api.get('/processes', { params });
};
const getProcessById = (id) => api.get(`/processes/${id}`);
const createProcess = (data) => api.post('/processes', data);
// `PATCH` é o verbo de update do projeto. O `PUT` continua no backend como
// alias depreciado, mas não se chama mais daqui.
const updateProcess = (id, data) => api.patch(`/processes/${id}`, data);
const deleteProcess = (id) => api.delete(`/processes/${id}`);

// ── DEC-054 — a fase tem rota própria ───────────────────────────────────────
//
// Não é `updateProcess` com mais um campo, e a diferença é de contrato: toda
// mudança de fase grava uma entrada de `historicoFase` no servidor, e o PATCH
// comum não teria onde pendurar isso. `fase` está fora da allowlist dele de
// propósito, e mandá-la por lá volta 400 apontando para cá.
//
// `motivo` é OPCIONAL — *"não precisa anotar o porquê, só se ela quiser
// mesmo"*. Vazio não é enviado; a transição acontece igual.
const mudarFase = (id, { fase, motivo } = {}) => {
  const corpo = { fase };
  if (motivo && motivo.trim()) corpo.motivo = motivo.trim();
  return api.patch(`/processes/${id}/fase`, corpo);
};

// DEC-052 — a volta. Restaura o processo e só os vínculos que a cascata dele
// derrubou. `PATCH` em sub-rota própria: `ativo` está fora da allowlist de
// update do backend desde a Fase 4.5.
const reactivateProcess = (id) => api.patch(`/processes/${id}/reactivate`);

// A contagem que o modal mostra ANTES de confirmar — quantos vínculos caem (se
// o processo está ativo) ou quantos voltam (se está desativado).
const getActivationPreview = (id) => api.get(`/processes/${id}/activation-preview`);

// ── Participantes do processo (junção processo × cliente) ───────────────────
// O processo passou a ter vários clientes, cada um com o seu papel. A criação
// manda `clientes: [{ clienteId, papel, principal }]`; daí em diante os
// participantes são mexidos por estes endpoints, um a um.

const listProcessClientes = (id) => api.get(`/processes/${id}/clientes`);

const addProcessCliente = (id, { clienteId, papel }) =>
  api.post(`/processes/${id}/clientes`, { clienteId, papel });

const updateProcessClientePapel = (id, clienteId, papel) =>
  api.patch(`/processes/${id}/clientes/${clienteId}`, { papel });

// Promove a principal e rebaixa o anterior no mesmo movimento, no servidor.
// Nunca fazer isso em duas chamadas daqui: entre uma e outra o processo teria
// dois principais, ou nenhum.
const setProcessClientePrincipal = (id, clienteId) =>
  api.patch(`/processes/${id}/clientes/${clienteId}/principal`);

const removeProcessCliente = (id, clienteId) =>
  api.delete(`/processes/${id}/clientes/${clienteId}`);

// Endpoint próprio, e não campo da listagem: o código de acesso não vem junto
// com os participantes de propósito, para não vazar em log nem em print de
// tela. Só é buscado quando a advogada pede o de um participante específico.
const getProcessClienteCodigoAcesso = (id, clienteId) =>
  api.get(`/processes/${id}/clientes/${clienteId}/codigo-acesso`);

// ── Confirmações de visualização (Fase 3.1, consumidas na 3.2) ─────────────
//
// O histórico é do PROCESSO, não de um participante: num litisconsórcio a
// advogada quer ver quem confirmou e quem não, lado a lado.
const listProcessConfirmacoes = (id) => api.get(`/processes/${id}/confirmacoes`);

// Marca como vistas as do processo inteiro, e não uma a uma. "Vista" descreve
// o ato de a advogada abrir a ficha e olhar — que acontece por processo, não
// por registro. É isso que zera o contador do dashboard.
const marcarConfirmacoesVistas = (id) =>
  api.patch(`/processes/${id}/confirmacoes/vistas`);

export default {
  listProcesses,
  getProcessById,
  createProcess,
  updateProcess,
  mudarFase,
  deleteProcess,
  reactivateProcess,
  getActivationPreview,
  listProcessClientes,
  addProcessCliente,
  updateProcessClientePapel,
  setProcessClientePrincipal,
  removeProcessCliente,
  getProcessClienteCodigoAcesso,
  listProcessConfirmacoes,
  marcarConfirmacoesVistas,
};
