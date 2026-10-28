// ═══════════════════════════════════════════════════════════════════════════
// O PROCESSO E O MODELO DA GERAÇÃO — regras puras (Fase 3.9a, DEC-140/141)
//
// A suíte é `node --test` sem DOM: o que decide mora aqui.
// ═══════════════════════════════════════════════════════════════════════════

// O `?processoId=` da montagem, quando a geração foi pedida a partir da lista
// filtrada por processo. Só um ObjectId passa: qualquer outra coisa é ignorada,
// como se não existisse — o seletor abriria vazio, e não com um id torto que a
// busca por id responderia 400.
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export const processoIdDaUrl = (searchParams) => {
  const valor = searchParams?.get?.('processoId');
  return typeof valor === 'string' && OBJECT_ID.test(valor.trim()) ? valor.trim() : '';
};

// O caminho da montagem de um modelo, levando o processo junto. Sem ele, quem
// escolhe o modelo no cartão de início perderia o processo da URL no caminho.
export const destinoDaMontagem = (modeloId, modo, processoId = '') => {
  const base = `/dashboard/documentos/montar/${modeloId}?modo=${modo}`;
  return processoId ? `${base}&processoId=${encodeURIComponent(processoId)}` : base;
};

// ── A escolha do modelo (DEC-141) ─────────────────────────────────────────
//
// Cada "montar um modelo novo" da geração cria um modelo; o back não tem
// teto. O cartão pedia os 100 mais recentes e o 101º não existia para a
// escolha. Agora a busca é no servidor, pelo nome, e o cartão diz quando
// mostra menos do que existe.
export const LIMITE_DA_ESCOLHA_DE_MODELO = 20;

// "Mostrando 20 de 134 modelos. Busque pelo nome para achar os outros." —
// ou nada, quando a lista mostrada é a inteira.
export const avisoDeModelosOcultos = (mostrados, total) => {
  if (typeof total !== 'number' || typeof mostrados !== 'number') return null;
  if (total <= mostrados) return null;
  return `Mostrando ${mostrados} de ${total} modelos. Busque pelo nome para achar os outros.`;
};

export default {
  processoIdDaUrl,
  destinoDaMontagem,
  LIMITE_DA_ESCOLHA_DE_MODELO,
  avisoDeModelosOcultos,
};
