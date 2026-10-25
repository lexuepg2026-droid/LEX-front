// ═══════════════════════════════════════════════════════════════════════════
// SELETOR LIMITADO AO TETO DA API — paliativo da Fase 0 (DEC-067)
//
// Os seletores de processo (formulário de honorário) e de honorário
// (formulário de parcela) pediam a listagem SEM `limit`, recebiam os 20 do
// padrão do backend e mostravam só esses — com mais de 20 cadastros, os mais
// antigos não apareciam e a tela não dizia nada.
//
// O paliativo é pedir o teto que o backend aceita e DIZER quando o conjunto é
// maior. Não se baixam todas as páginas: o conserto de verdade é a busca no
// servidor (`CampoComSugestoes`), na fase 3.
// ═══════════════════════════════════════════════════════════════════════════

// O teto do `limit` nas rotas de listagem: `Math.min(100, …)` em cada
// controller do backend (`processController.js`, `feeController.js`).
export const LIMITE_DO_SELETOR = 100;

// A frase abaixo do seletor quando a lista foi cortada, ou `null` quando ela
// está inteira. "Mais recentes" porque as duas listagens ordenam por
// `createdAt` decrescente no backend.
export const avisoDeSeletorLimitado = (mostrados, total) => {
  const n = Number(mostrados);
  const t = Number(total);
  if (!Number.isFinite(n) || !Number.isFinite(t) || t <= n) return null;
  return `Mostrando os ${n} mais recentes de ${t}.`;
};
