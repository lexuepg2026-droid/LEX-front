// ═══════════════════════════════════════════════════════════════════════════
// O CABEÇALHO DA VERSÃO — um nome só, dos dois lados (F-5b, DEC-060)
//
// O cliente manda **o `updatedAt` que ele viu**, e o servidor recusa com 409 se
// o registro tiver mudado desde então. O nome do cabeçalho está escrito aqui e
// em `lex-backend/src/services/concurrencyGuard.js`, e em nenhum outro lugar:
// dois literais soltos divergiriam no dia em que um deles fosse renomeado — e
// divergiriam em silêncio, porque cabeçalho desconhecido não dá erro, só
// desliga a verificação.
//
// Não é o `If-Unmodified-Since` do HTTP porque aquele carrega HTTP-date, com
// precisão de SEGUNDOS: duas edições dentro do mesmo segundo passariam pela
// verificação, que é exatamente a janela que a guarda existe para fechar.
// ═══════════════════════════════════════════════════════════════════════════

export const CABECALHO_VERSAO = 'X-If-Unmodified-Since';

// O par pronto para o axios: `{ 'X-If-Unmodified-Since': '2026-08-29T…' }`, ou
// nada quando a tela não tem versão a declarar (uma criação, por exemplo).
export const cabecalhoDeVersao = (updatedAt) =>
  updatedAt ? { [CABECALHO_VERSAO]: updatedAt } : {};
