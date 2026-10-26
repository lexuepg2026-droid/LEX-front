// ═══════════════════════════════════════════════════════════════════════════
// "A FILA MUDOU" — um aviso sem React (Fase 3.4, DEC-113)
//
// O interceptor de `api/axiosConfig.js` grava na fila (`outbox.enfileirar`)
// sem passar pelo `OutboxContext`, e o contexto só relia as entradas no
// próximo gesto dele (enviar, descartar, tentar de novo). Resultado: a tela
// que acabou de enfileirar dizia "ficou na fila" no toast e não mostrava o
// "Há alteração não enviada" até a próxima recarga.
//
// Este módulo é o elo: quem grava a fila AVISA, quem mostra a fila ASSINA. Não
// importa nada — nem axios, nem React —, e por isso a suíte o executa.
// ═══════════════════════════════════════════════════════════════════════════
const assinantes = new Set();

// Devolve a função que cancela a assinatura (o formato do `useEffect`).
export const aoMudarFila = (fn) => {
  if (typeof fn !== 'function') return () => {};
  assinantes.add(fn);
  return () => { assinantes.delete(fn); };
};

// Um assinante que lança não impede os outros de saberem.
export const avisarFilaMudou = (userId) => {
  for (const fn of [...assinantes]) {
    try { fn(userId); } catch { /* o próximo continua sendo avisado */ }
  }
};

export default { aoMudarFila, avisarFilaMudou };
