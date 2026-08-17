import api from './axiosConfig';
import { nomeDoAnexo } from '../utils/download';

// `installmentId` continua existindo e continua filtrando pela parcela — desde
// a F-1a ele filtra POR ALOCAÇÃO ("pagamentos que tocaram esta parcela"), que é
// a mesma pergunta. `honorarioId` e `tipo` são novos: o pagamento passou a
// nascer contra o honorário.
//
// `inativos` SAIU. O modo existia para a tela poder oferecer "Reativar"; a rota
// de reativação morreu (DEC-034) e o pagamento deixou de ser desativável —
// desfazer entrada é ESTORNO. Um filtro que nunca devolve nada é pior que a
// ausência dele: sugere que existe um conjunto para olhar.
const listPayments = ({ page = 1, limit = 20, installmentId, honorarioId, processoId, formaPagamento, tipo } = {}) => {
  const params = { page, limit };
  if (installmentId) params.installmentId = installmentId;
  if (honorarioId) params.honorarioId = honorarioId;
  if (processoId) params.processoId = processoId;
  if (formaPagamento) params.formaPagamento = formaPagamento;
  if (tipo) params.tipo = tipo;
  return api.get('/payments', { params });
};
const getPaymentById = (id) => api.get(`/payments/${id}`);
const createPayment = (data) => api.post('/payments', data);
// PATCH, e não PUT — ver a nota em `feeService.js`.
// A allowlist do backend tem UM campo: `observacoes` (DEC-032). Valor, data e
// forma de pagamento se corrigem por ESTORNO, não por edição.
const updatePayment = (id, data) => api.patch(`/payments/${id}`, data);

// ── `removePayment` e `reativarPayment` SAÍRAM na F-1a ───────────────────
//
// As duas rotas morreram no backend e respondem 404. Mantê-las aqui deixaria
// dois métodos que só sabem produzir erro — e a próxima tela a ser escrita
// chamaria um deles achando que funciona.
//
// O caminho para desfazer um pagamento é o ESTORNO (DEC-033), e para desfazer
// um estorno é a ANULAÇÃO. As duas telas são da F-1b; as funções abaixo já
// existem para quando ela chegar.
const listReversals = (id) => api.get(`/payments/${id}/reversals`);
const createReversal = (id, data) => api.post(`/payments/${id}/reversals`, data);

// Preview de alocação: o que ACONTECERIA se este pagamento fosse registrado.
// Não grava nada, e usa a MESMA função de planejamento que a criação — é o que
// impede o preview de mentir. A tela que o consome é da F-1b.
const preverAlocacao = (data) => api.post('/payments/preview', data);

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
  listReversals,
  createReversal,
  preverAlocacao,
  baixarRecibo,
  baixarEsalvarRecibo,
};
