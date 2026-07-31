import api from './axiosConfig';
import { nomeDoAnexo } from '../utils/download';

const listPayments = ({ page = 1, limit = 20, installmentId, processoId, formaPagamento } = {}) => {
  const params = { page, limit };
  if (installmentId) params.installmentId = installmentId;
  if (processoId) params.processoId = processoId;
  if (formaPagamento) params.formaPagamento = formaPagamento;
  return api.get('/payments', { params });
};
const getPaymentById = (id) => api.get(`/payments/${id}`);
const createPayment = (data) => api.post('/payments', data);
// PATCH, e não PUT — ver a nota em `feeService.js`.
const updatePayment = (id, data) => api.patch(`/payments/${id}`, data);
const removePayment = (id) => api.delete(`/payments/${id}`);

// ── Recibo de pagamento (Fase 4.1 no backend, Fase 4.2 na tela) ────────────
//
// `responseType: 'blob'` é obrigatório: sem ele o axios decodifica o PDF como
// texto e o arquivo salvo fica corrompido. Mesmo mecanismo do download de
// documento (`documentService.js`).
const baixarRecibo = (id) =>
  api.get(`/payments/${id}/recibo`, { responseType: 'blob' });

// Baixa e entrega ao navegador num passo só.
//
// O nome sai de `utils/download.js`, o mesmo que o download de documento usa —
// e do lado de lá vem de `nomeArquivoSeguro`, a mesma função para as duas
// rotas. A regra de nome de arquivo tem um lugar só nas duas pontas.
//
// O <a download> temporário é o único caminho que funciona aqui: com cookie
// httpOnly não dá para apontar o href direto para a rota e deixar o navegador
// baixar (quem carrega o cookie é o axios), e abrir a URL crua em nova aba
// mostraria uma tela de erro do navegador quando o pagamento estiver
// desativado, em vez da mensagem tratada. O revoke é obrigatório — sem ele
// cada download deixa o blob preso na memória da aba até o F5.
const baixarEsalvarRecibo = async (id) => {
  const response = await baixarRecibo(id);
  const nome = nomeDoAnexo(response, 'recibo.pdf');
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
  listPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  removePayment,
  baixarRecibo,
  baixarEsalvarRecibo,
};
