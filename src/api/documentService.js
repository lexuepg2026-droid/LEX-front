import api from './axiosConfig';
import { nomeDoAnexo } from '../utils/download';

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

// Modelo se cria por esta rota, e não por POST /documents: o backend impõe
// `ehModelo: true` e `origem: "gerado"`, e ignora `processoId` — modelo não
// pertence a processo. `ehModelo` é imutável depois da criação, então não há
// como transformar um documento comum em modelo pelo update.
const criarModelo = ({ nome, tipo, descricao } = {}) =>
  api.post('/documents/modelos', { nome, tipo, descricao });

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

// Compatibilidade modelo × cliente (Fase 4.6). Leitura: diz se o modelo tem
// variáveis que não se aplicam ao tipo do cliente, ANTES de gerar. Não bloqueia.
const compatibilidadeModelo = (modeloId, clienteId) =>
  api.get(`/documents/modelos/${modeloId}/compatibilidade`, { params: { clienteId } });

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

// ── Vínculos documento ↔ seção (a montagem) ────────────────────────────────
//
// A ordem é do backend, não da tela. Três regras vivem lá e NÃO devem ser
// reimplementadas aqui:
//
//   1. `ordem` informada INSERE na posição e EMPURRA as seguintes; omitida,
//      anexa ao fim; fora do intervalo, encaixa na borda mais próxima.
//   2. dois índices únicos parciais em `documento_secao` impedem a mesma seção
//      duas vezes e duas seções na mesma posição. A tela antecipa a restrição
//      para não deixar a advogada tentar — mas quem garante é o banco.
//   3. a renumeração roda em duas fases, porque o índice único é verificado a
//      cada operação e reatribuir 1..N direto colidiria no meio do caminho.

const listDocumentSecoes = (id) => api.get(`/documents/${id}/secoes`);

// `ordem` omitida anexa ao fim — é o caminho do botão "Adicionar". Informada,
// insere na posição — é o caminho do arrastar. Os dois chamam este método.
const vincularSecao = (id, { secaoId, ordem } = {}) =>
  api.post(`/documents/${id}/secoes`, { secaoId, ordem });

// O id do path é o da SEÇÃO, não o do vínculo. O backend renumera o que sobra
// para não deixar buraco na sequência.
const desvincularSecao = (id, secaoId) =>
  api.delete(`/documents/${id}/secoes/${secaoId}`);

// `secoes` é o array de ids de seção na ordem desejada, e precisa conter
// exatamente as seções já vinculadas — reordenar é permutar, não incluir nem
// remover. Faltando ou sobrando, o backend responde 400 dizendo qual.
const reordenarSecoes = (id, secoes) =>
  api.patch(`/documents/${id}/secoes/reordenar`, { secoes });

// ── Visibilidade no portal do cliente ──────────────────────────────────────
// Omitir `visivelPortal` faz o backend alternar. Enviamos o valor explícito
// para a tela não depender de adivinhar o estado atual do servidor.
const alternarVisibilidadePortal = (id, visivelPortal) =>
  api.patch(`/documents/${id}/visibilidade-portal`, { visivelPortal });

// ── Catálogo de variáveis ──────────────────────────────────────────────────
// Somente leitura. Devolve { total, grupos: [{ origem, rotulo, descricao,
// total, variaveis: [{ chave, rotulo, descricao }] }] }. Os rótulos e as
// descrições são escritos à mão no backend — exibir como vêm, nunca derivar
// texto da chave.
const listarVariaveis = () => api.get('/documents/variaveis');

// ── Download ───────────────────────────────────────────────────────────────

// `responseType: 'blob'` é obrigatório: sem ele o axios tenta decodificar o
// binário como texto e o arquivo salvo fica corrompido.
const baixarDocumento = (id, formato = 'pdf') =>
  api.get(`/documents/${id}/download`, {
    params: { formato },
    responseType: 'blob',
  });

// O nome sugerido pelo backend (derivado de tipo + cliente + data) sai de
// `utils/download.js`. Estava aqui como função local e ia ser copiado pelo
// recibo na Fase 4.2 — duas cópias da mesma regra divergem na primeira vez que
// uma delas muda.

// Baixa e entrega o arquivo ao navegador, num passo só.
//
// O <a download> temporário é o único caminho que funciona nos dois casos que
// importam: com cookie httpOnly não dá para apontar o href direto para a rota
// e deixar o navegador baixar (o axios é quem carrega o cookie), e o blob
// precisa de uma URL para virar arquivo. O revoke é obrigatório — sem ele cada
// download deixa o blob preso na memória da aba até o F5.
const baixarEsalvar = async (id, formato = 'pdf') => {
  const response = await baixarDocumento(id, formato);
  const nome = nomeDoAnexo(response, `documento.${formato}`);
  const url = URL.createObjectURL(response.data);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }

  return { nome, tamanho: response.data?.size ?? 0 };
};

export default {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  criarModelo,
  listModelos,
  gerarDocumento,
  compatibilidadeModelo,
  previewDocumento,
  listDocumentSecoes,
  vincularSecao,
  desvincularSecao,
  reordenarSecoes,
  alternarVisibilidadePortal,
  atualizarTexto,
  listarVariaveis,
  baixarDocumento,
  nomeDoAnexo,
  baixarEsalvar,
};
