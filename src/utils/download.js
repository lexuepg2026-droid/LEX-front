// Nome do arquivo sugerido pelo backend, lido do `Content-Disposition`.
//
// O header só é legível porque as rotas de download o expõem em
// `Access-Control-Expose-Headers`. Sem isso o navegador o esconde mesmo estando
// na resposta, e todo arquivo cairia com o nome alternativo — indistinguíveis
// na pasta de downloads.
//
// Vivia duplicado em `api/documentService.js` (como `nomeDoAnexo`) e ia ser
// copiado uma terceira vez pelo recibo (Fase 4.2). Duas cópias da mesma regra
// divergem na primeira vez que uma delas muda; três, mais rápido.
//
// Sem dependência nenhuma de propósito: é o que permite testá-lo direto, sem
// arrastar o axios e o interceptor de sessão para dentro da suíte.
export const nomeDoAnexo = (response, alternativo) => {
  const disposition = response?.headers?.['content-disposition'] ?? '';
  return disposition.match(/filename="?([^";]+)"?/)?.[1] ?? alternativo;
};
