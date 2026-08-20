// ═══════════════════════════════════════════════════════════════════════════
// AS CONTAS DO PAGINADOR — Fase F-1b.3
//
// Função pura, fora do componente, pela razão de sempre neste projeto: a suíte
// é `node --test` sem DOM (Fase 2E.2), e conta feita dentro do JSX só se
// testaria por varredura de texto — que prova que a linha existe, não que ela
// calcula certo.
//
// E aqui há conta de verdade: o índice do primeiro e do último item da página,
// que é o que responde "estou vendo quais destes?", e as duas bordas, que são
// o que desabilita os botões. Os erros clássicos são o off-by-one no último
// item da página cheia e o `totalPages` de um conjunto vazio — os dois estão
// fixados abaixo.
// ═══════════════════════════════════════════════════════════════════════════

import { pluralizar } from './plural.js';

// `total` é o do CONJUNTO FILTRADO, não o da base: é o backend que o manda,
// junto da página, e recalculá-lo aqui a partir do que veio na tela daria o
// tamanho da página em vez do tamanho do conjunto.
export const resumoDaPagina = ({ page = 1, limit = 20, total = 0 } = {}) => {
  const porPagina = Math.max(1, Number(limit) || 1);
  const quantos = Math.max(0, Number(total) || 0);

  // Conjunto vazio tem UMA página, e não zero: "página 1 de 0" não é uma
  // posição em que alguém possa estar.
  const totalPages = Math.max(1, Math.ceil(quantos / porPagina));

  // A página pedida, presa dentro do que existe. Um `?page=9` num conjunto de
  // duas páginas é o caso real — a pessoa filtrou depois de navegar — e a
  // resposta honesta é mostrar onde ela está de fato.
  const atual = Math.min(Math.max(1, Number(page) || 1), totalPages);

  const primeiro = quantos === 0 ? 0 : (atual - 1) * porPagina + 1;
  const ultimo = Math.min(atual * porPagina, quantos);

  return {
    page: atual,
    totalPages,
    total: quantos,
    primeiro,
    ultimo,
    temAnterior: atual > 1,
    temProxima: atual < totalPages
  };
};

// "1–20 de 137 pagamentos". O chamador passa o rótulo no SINGULAR
// (`pagamento`, `parcela`, `honorário`, `movimentação`) e a concordância é
// feita aqui, por `pluralizar`.
//
// ── Por que o singular, e não o plural (F-1b.3.1) ────────────────────────
// Até a F-1b.3 o chamador passava o plural e a frase de um resultado só
// escrevia "1 parcelas". Derivar o singular do plural não dá: "pagamentos" →
// "pagamento" exigiria saber que a palavra não termina em "s" no singular, e
// "lápis" quebraria a regra. O caminho só existe numa direção, e por isso é o
// singular que atravessa o componente.
//
// ── As duas formas da frase ──────────────────────────────────────────────
// Uma página só: "11 pagamentos" — o intervalo "1–11 de 11" é ruído, porque
// não há outro pedaço para o leitor estar vendo.
// Mais de uma: "21–40 de 137 pagamentos" — aí o intervalo é a informação, e
// o total é o que responde "quanto falta".
export const frasePosicao = (resumo, rotuloSingular = 'registro') => {
  if (resumo.total === 0) return `Nenhum resultado`;

  const palavra = pluralizar(resumo.total, rotuloSingular);
  if (resumo.totalPages <= 1) return `${resumo.total} ${palavra}`;
  return `${resumo.primeiro}–${resumo.ultimo} de ${resumo.total} ${palavra}`;
};

export default { resumoDaPagina, frasePosicao };
