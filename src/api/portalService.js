import portalApi from './portalAxios';

// ═══════════════════════════════════════════════════════════════════════════
// CHAMADAS DO PORTAL DO CLIENTE
//
// Toda função daqui usa `portalApi` — a instância do portal. Nenhuma usa a
// instância da advogada, e é isso que impede um 401 de portal de sequestrar a
// sessão da advogada (e vice-versa). Ver `portalAxios.js`.
// ═══════════════════════════════════════════════════════════════════════════

// O código vai como o cliente digitou. A normalização de caixa e de espaço é
// do BACKEND, de propósito: a advogada dita o código por telefone, e uma tela
// mais rígida que a API rejeitaria "lex-77c8 8fvs" que o servidor aceitaria.
const login = (codigoAcesso, senha) =>
  portalApi.post('/portal/login', { codigoAcesso, senha });

const logout = () => portalApi.post('/portal/logout');

const sessao = () => portalApi.get('/portal/sessao');

const trocarSenha = (senhaAtual, novaSenha) =>
  portalApi.patch('/portal/senha', { senhaAtual, novaSenha });

const obterProcesso = () => portalApi.get('/portal/processo');

const listarDocumentos = () => portalApi.get('/portal/documentos');

const textoConfirmacao = () => portalApi.get('/portal/confirmacoes/texto');

// O corpo é ignorado pelo backend de propósito: o `textoConfirmado` gravado no
// recibo é a constante do servidor, não o que o navegador mandou. Se viesse
// daqui, o recibo afirmaria o que o cliente enviou — e deixaria de ser prova.
const confirmar = () => portalApi.post('/portal/confirmacoes', {});

const listarConfirmacoes = () => portalApi.get('/portal/confirmacoes');

// ── Download ───────────────────────────────────────────────────────────────
// Mesmo mecanismo das telas da advogada: `responseType: 'blob'` (sem ele o
// axios decodifica o binário como texto e o arquivo salva corrompido), nome
// vindo do `Content-Disposition`, e `<a download>` temporário — com cookie
// httpOnly não dá para apontar o href direto para a rota, porque quem carrega
// o cookie é o axios.

const baixarDocumento = (id, formato = 'pdf') =>
  portalApi.get(`/portal/documentos/${id}/download`, {
    params: { formato },
    responseType: 'blob',
  });

const nomeDoAnexo = (response, alternativo) => {
  const disposition = response?.headers?.['content-disposition'] ?? '';
  return disposition.match(/filename="?([^";]+)"?/)?.[1] ?? alternativo;
};

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
    // Sem o revoke, cada download deixa o blob preso na memória da aba até o
    // F5 — e no celular, que é onde este portal roda, isso importa mais.
    URL.revokeObjectURL(url);
  }

  return { nome, tamanho: response.data?.size ?? 0 };
};

export default {
  login,
  logout,
  sessao,
  trocarSenha,
  obterProcesso,
  listarDocumentos,
  textoConfirmacao,
  confirmar,
  listarConfirmacoes,
  baixarDocumento,
  nomeDoAnexo,
  baixarEsalvar,
};
