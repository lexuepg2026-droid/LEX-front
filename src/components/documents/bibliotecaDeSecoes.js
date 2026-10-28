// ═══════════════════════════════════════════════════════════════════════════
// A BIBLIOTECA DA MONTAGEM, POR BUSCA NO SERVIDOR (Fase 3.9b, DEC-146)
//
// Pedia `listSecoes({ limit: 100 })`: a 101ª seção não existia para a
// montagem — o último teto de 100 do módulo de documentos. Passou a pedir 20
// por vez (`GET /secoes?busca=&tipo=&page=`, título sem acento, em ordem
// alfabética) e a ACUMULAR com "Carregar mais", em vez de paginar: é uma lista
// dentro de uma coluna (ou de um painel), lida de cima para baixo, e trocar de
// página no meio dela tiraria da vista a seção armada.
//
// Funções puras, pela razão de sempre: a suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

export const POR_PAGINA_DA_BIBLIOTECA = 20;

// A página 1 SUBSTITUI (busca ou tipo novos); as seguintes acrescentam. Uma
// seção que já está na lista não entra duas vezes — entre um pedido e o outro
// a advogada pode ter cadastrado uma seção que empurra a ordem alfabética.
export const acumularSecoes = (anteriores, novas, pagina) => {
  const lista = Array.isArray(novas) ? novas : [];
  if (pagina <= 1) return lista;
  const vistas = new Set((anteriores ?? []).map((s) => String(s._id)));
  return [...(anteriores ?? []), ...lista.filter((s) => !vistas.has(String(s._id)))];
};

export const secoesRestantes = (total, carregadas) =>
  typeof total === 'number' ? Math.max(0, total - carregadas) : 0;

// "Carregar mais" diz quantas faltam — silêncio no lugar dele seria uma lista
// curta com cara de completa (a regra do extrato, F-1b).
export const rotuloDoCarregarMais = (restantes) =>
  restantes === 1 ? 'Carregar mais (falta 1)' : `Carregar mais (faltam ${restantes})`;

export const FRASE_SEM_CONEXAO_DA_BIBLIOTECA =
  'A busca precisa de conexão. Conecte-se para procurar seções.';
