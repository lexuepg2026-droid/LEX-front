// ═══════════════════════════════════════════════════════════════════════════
// O REENVIO — em ordem, e PARANDO na primeira falha (F-5b, Parte 3)
//
// Este arquivo não envia nada: ele decide **o que enviar em seguida**. Toda a
// regra do reenvio cabe em função pura, e é por isso que ela pode ser provada
// numa suíte sem navegador e sem IndexedDB.
//
// ── Em ordem de criação ─────────────────────────────────────────────────
// Criar um compromisso e depois editá-lo são DUAS entradas. Fora de ordem, a
// segunda chega antes da primeira e falha com "não encontrado" — e o pior é
// que ela falharia por um motivo que não tem nada a ver com o que a advogada
// fez.
//
// ── Se uma falha, PARA ──────────────────────────────────────────────────
// Não se pula para a seguinte. A próxima pode depender da que falhou (a edição
// do compromisso que não foi criado), e continuar produziria um estado que
// ninguém pediu — metade das alterações aplicadas, sem que nada na tela
// explique quais.
//
// **Parar é o comportamento seguro**: a fila fica inteira, com o motivo na
// primeira entrada, e a advogada decide.
//
// ── Nada é descartado automaticamente ───────────────────────────────────
// Nunca, por nenhum motivo. Não há limite de tentativas que apague, não há
// prazo que expire, não há "falhou três vezes, some". Descarte é gesto humano,
// com confirmação, e vem da tela de pendências.
// ═══════════════════════════════════════════════════════════════════════════

// A ordem é a de criação, e `seq` desempata dentro do mesmo milissegundo.
// Ordenar por `id` (UUID) seria ordenar por sorteio.
export const ordenarFila = (entradas = []) =>
  [...entradas].sort((a, b) => {
    const ta = Number(a?.criadoEm) || 0;
    const tb = Number(b?.criadoEm) || 0;
    if (ta !== tb) return ta - tb;
    return (Number(a?.seq) || 0) - (Number(b?.seq) || 0);
  });

// A PRÓXIMA a enviar — ou `null`, que quer dizer "não envie mais nada agora".
//
// `null` sai em dois casos, e eles são diferentes na tela mas iguais aqui: a
// fila acabou, ou a primeira da fila **falhou**. No segundo caso, tudo que
// vem depois fica esperando — inclusive entradas que talvez passassem, porque
// "talvez passassem" não é garantia de que a ordem não importava.
export const proximaEntrada = (entradas = []) => {
  const fila = ordenarFila(entradas);
  const primeira = fila[0];
  if (!primeira) return null;
  return primeira.estado === 'pendente' ? primeira : null;
};

// Quantas ainda não chegaram ao servidor. É o número que a tela mostra ao lado
// do sino e o que o aviso do logout precisa dizer.
export const contarPendencias = (entradas = []) => entradas.length;

export const contarFalhas = (entradas = []) =>
  entradas.filter((e) => e?.estado === 'falhou').length;

// "A fila está travada?" — há uma entrada falhada na frente, e nada anda até
// alguém resolvê-la.
export const filaTravada = (entradas = []) => {
  const primeira = ordenarFila(entradas)[0];
  return Boolean(primeira && primeira.estado === 'falhou');
};

// O plano inteiro, para a tela e para o teste: a ordem em que as entradas
// SERIAM enviadas se todas passassem, e onde a fila para hoje.
export const planejarReenvio = (entradas = []) => {
  const fila = ordenarFila(entradas);
  const paradaEm = fila.findIndex((e) => e.estado !== 'pendente');
  return {
    ordem: fila.map((e) => e.id),
    enviaveis: (paradaEm === -1 ? fila : fila.slice(0, paradaEm)).map((e) => e.id),
    travadaPor: paradaEm === -1 ? null : fila[paradaEm].id
  };
};

// Um registro tem alteração pendente? É o que faz a tela onde ele aparece
// dizer "há alteração não enviada" — ver o dado antigo achando que é o atual é
// o mesmo defeito da idade do dado, na F-5a.
export const temPendenciaPara = (entradas = [], { operacao, url }) =>
  entradas.some((e) => (!operacao || e.operacao === operacao) && (!url || e.url === url));
