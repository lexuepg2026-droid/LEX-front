// ═══════════════════════════════════════════════════════════════════════════
// DEC-051 — AS PARCELAS AGRUPADAS POR GERAÇÃO, O PLANO VIGENTE PRIMEIRO
//
// ── O defeito ────────────────────────────────────────────────────────────
// Na página do honorário as parcelas vinham ordenadas por NÚMERO. Depois da
// DEC-048, que faz cada plano numerar a partir de 1, um honorário com três
// gerações mostrava:
//
//     Parcela 1 de 2   (morta)
//     Parcela 1 de 3   (morta)
//     Parcela 1 de 2   (VIVA)
//     Parcela 2 de 2   (morta)
//     ...
//
// Três linhas dizendo "Parcela 1", intercaladas, e a advogada tendo de CAÇAR
// quais são as que valem. O rótulo estava certo; a ordem é que não respondia
// pergunta nenhuma.
//
// ── A regra ──────────────────────────────────────────────────────────────
// Agrupar por plano. **O plano vigente primeiro**, em ordem numérica; os planos
// substituídos depois, também em ordem numérica, cada grupo com um separador
// que diga o que ele é.
//
// O motivo: a pergunta que a tela responde é *"quanto ainda se deve, e quando"*.
// O histórico é resposta de outra pergunta, e não pode disputar espaço com a
// primeira.
//
// **Isso não apaga nada.** As canceladas continuam visíveis, com o rótulo
// congelado e o badge "Reparcelada", como a DEC-048 exige. O que muda é onde
// elas ficam — depois, e sob um título que explica por que estão ali.
//
// ── Como se sabe qual plano é o vigente ──────────────────────────────────
// Não é "o que não tem parcela cancelada em lugar nenhum", e a diferença é sutil
// o bastante para ter merecido esta nota.
//
// `planoId` é a operação que CRIOU a parcela (`null` = plano original);
// `reparcelamentoId` é a operação que a CANCELOU. Um plano foi substituído
// quando ALGUMA parcela dele foi cancelada por um reparcelamento — e nem todas
// precisam ter sido: um plano de 3 com a parcela 1 já PAGA cancela só as outras
// duas, e a paga continua de pé, no plano velho.
//
// Por isso o grupo é que é "substituído", não a parcela. O badge de cada linha
// continua dizendo o que aconteceu com ELA — a paga diz "Pago", as outras
// dizem "Reparcelada" —, e o separador diz o que aconteceu com o PLANO.
//
// ── Ordem entre os grupos substituídos ───────────────────────────────────
// Por data de substituição, do mais antigo para o mais recente: lido de cima
// para baixo depois do plano vigente, o histórico sai em ordem cronológica, que
// é como se conta uma história. Três gerações ficam:
//
//     [vigente]                                    ← o que se deve hoje
//     [original, substituído no 1º reparcelamento] ← a história, na ordem
//     [2ª geração, substituída no 2º]                em que aconteceu
// ═══════════════════════════════════════════════════════════════════════════

// Chave estável do plano. `planoId` vem como `null` (plano original) ou como o
// id do reparcelamento que criou a geração — e ids chegam como string ou como
// objeto, dependendo de quem serializou. `String(...)` normaliza os dois sem
// que o chamador precise saber.
const chaveDoPlano = (parcela) => {
  const plano = parcela?.planoId ?? null;
  return plano === null ? null : String(plano);
};

const aoNumero = (valor) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

// Data em milissegundos, ou `null`. Parcela sem `reparceladaEm` (a paga que
// ficou no plano velho) não deve arrastar a data do grupo para nada.
const emMilissegundos = (valor) => {
  if (!valor) return null;
  const t = new Date(valor).getTime();
  return Number.isFinite(t) ? t : null;
};

/**
 * Agrupa as parcelas por plano e devolve os grupos na ordem de exibição.
 *
 * Cada grupo:
 *   { chave, vigente, substituidoEm, parcelas }
 *
 * `substituidoEm` é a data (Date) em que o plano foi substituído, ou `null` no
 * grupo vigente — é o que o separador usa para dizer "Substituídas pelo
 * reparcelamento de 21/08/2026".
 */
export const agruparParcelasPorPlano = (parcelas = []) => {
  const lista = Array.isArray(parcelas) ? parcelas.filter(Boolean) : [];
  if (lista.length === 0) return [];

  const porPlano = new Map();

  for (const parcela of lista) {
    const chave = chaveDoPlano(parcela);
    if (!porPlano.has(chave)) {
      porPlano.set(chave, { chave, vigente: true, substituidoEm: null, parcelas: [] });
    }
    const grupo = porPlano.get(chave);
    grupo.parcelas.push(parcela);

    // Uma parcela cancelada por reparcelamento basta para marcar o PLANO como
    // substituído — ver a nota sobre a parcela paga, no cabeçalho.
    if (parcela.reparcelamentoId) {
      grupo.vigente = false;
      const quando = emMilissegundos(parcela.reparceladaEm);
      if (quando !== null && (grupo.substituidoEm === null || quando < grupo.substituidoEm)) {
        grupo.substituidoEm = quando;
      }
    }
  }

  const grupos = [...porPlano.values()];

  for (const grupo of grupos) {
    // Dentro do grupo, sempre ordem numérica — é a ordem em que a advogada lê
    // um plano, e a única que faz "1, 2, 3" significar alguma coisa.
    grupo.parcelas.sort((a, b) => aoNumero(a?.numeroParcela) - aoNumero(b?.numeroParcela));
  }

  grupos.sort((a, b) => {
    // O vigente sempre primeiro. É a resposta à pergunta que a tela existe para
    // responder, e ela não disputa espaço com o histórico.
    if (a.vigente !== b.vigente) return a.vigente ? -1 : 1;

    // Entre substituídos: do mais antigo para o mais recente.
    // Sem data (dado antigo, anterior à DEC-048) vai para o fim, em vez de
    // fingir que é o mais velho de todos.
    const da = a.substituidoEm ?? Number.MAX_SAFE_INTEGER;
    const db = b.substituidoEm ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  return grupos.map((grupo) => ({
    ...grupo,
    substituidoEm: grupo.substituidoEm === null ? null : new Date(grupo.substituidoEm)
  }));
};

// O separador só aparece quando há mais de um grupo: um honorário que nunca foi
// reparcelado tem um plano só, e um título sobre uma lista única é ruído.
export const precisaDeSeparador = (grupos = []) => grupos.length > 1;

export default { agruparParcelasPorPlano, precisaDeSeparador };
