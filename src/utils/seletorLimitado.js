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

// ═══════════════════════════════════════════════════════════════════════════
// A OPÇÃO ESCOLHIDA NUNCA SOME DO SELETOR (Fase 2b, DEC-086)
//
// O limite conhecido da DEC-067: na edição, ou com o id vindo da URL
// (`?processoId=`, `?honorarioId=`), um processo ou honorário fora dos 100
// mais recentes não estava na lista, e o `<select>` aparecia em "Selecione…"
// com o valor guardado no estado — a advogada via um campo vazio e escolhia
// de novo, ou desistia. Agora a tela busca o item pelo id e o acrescenta.
//
// Enquanto a busca não volta (ou se ela falha), a opção existe do mesmo jeito,
// marcada: `{ _id, _pendente: 'carregando' | 'indisponivel' }`. É isso que
// garante que o `<select>` NUNCA fica sem a opção do valor que ele carrega.
// ═══════════════════════════════════════════════════════════════════════════
const mesmoId = (a, b) => String(a) === String(b);

export function comOpcaoGarantida(lista, idEscolhido, extra = null, pendente = 'carregando') {
  const opcoes = Array.isArray(lista) ? lista : [];
  if (!idEscolhido) return opcoes;
  if (opcoes.some((o) => mesmoId(o?._id, idEscolhido))) return opcoes;
  // Vai PRIMEIRO: é a escolhida, e a lista está em ordem de criação — no fim
  // ela ficaria a cem opções de distância de quem abre o seletor para conferir.
  if (extra && mesmoId(extra._id, idEscolhido)) return [extra, ...opcoes];
  return [{ _id: String(idEscolhido), _pendente: pendente }, ...opcoes];
}

export const precisaBuscarOpcao = (lista, idEscolhido, listaCarregada) =>
  Boolean(listaCarregada && idEscolhido) &&
  !(Array.isArray(lista) && lista.some((o) => mesmoId(o?._id, idEscolhido)));

export const ROTULO_OPCAO_PENDENTE = Object.freeze({
  carregando: 'Carregando…',
  indisponivel: 'Registro indisponível — confira se ele não foi desativado',
});
