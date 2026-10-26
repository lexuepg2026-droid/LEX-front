// ═══════════════════════════════════════════════════════════════════════════
// O DETALHE DO PROCESSO — as regras que a tela só exibe (Fase 3.3b)
//
// Funções puras, pela razão de sempre neste projeto: a suíte é `node --test`
// sem DOM, e regra dentro do JSX só se testaria por varredura de texto.
// ═══════════════════════════════════════════════════════════════════════════

// ── A situação de cada participante no portal (DEC-111) ───────────────────
// Três estados, e um quarto que não é estado: NÃO SABER.
//
//   - `portal_sem_acesso`   — a pessoa não tem senha de portal;
//   - `portal_liberado`     — tem, e este processo está liberado para ela;
//   - `portal_nao_liberado` — tem, e este processo não está liberado;
//   - `null`                — a lista com o portal não carregou.
//
// O `null` existe porque essa lista NÃO tem espelho local (decisão da F-5a,
// no comentário da tela): sem sinal ela não chega, e dizer "sem acesso" de
// quem tem acesso seria afirmar o contrário do que é.
export const SITUACOES_NO_PORTAL = Object.freeze(['portal_sem_acesso', 'portal_liberado', 'portal_nao_liberado']);

export const situacaoNoPortal = (noPortal, { carregado = true } = {}) => {
  if (!carregado) return null;
  if (!noPortal || noPortal.temAcessoPortal !== true) return 'portal_sem_acesso';
  return noPortal.liberadoNoPortal === true ? 'portal_liberado' : 'portal_nao_liberado';
};

// O interruptor só existe para quem tem acesso — liberar sem senha não abriria
// nada (DEC-097). Sem a lista carregada, também não: não se sabe a posição.
export const temInterruptor = (situacao) =>
  situacao === 'portal_liberado' || situacao === 'portal_nao_liberado';

// ── A cor da bolinha do cabeçalho (DEC-111) ────────────────────────────────
// É o TOM do status, o mesmo do `StatusBadge` (`utils/statusVisual.js`): a
// bolinha diz por cor o que o subtítulo diz por extenso.
export const classeDaBolinha = (tom) => `processo-cabecalho__bolinha--${tom || 'neutral'}`;

// ── As confirmações são marcadas como vistas DEPOIS de aparecer (DEC-112) ──
// Passo 97: o contador do Início zera quando a advogada OLHA a lista, não
// quando abre o processo. "Olhar" é a lista estar na tela: o efeito que marca
// roda depois do render que a mostrou, uma vez por abertura, e só se há o que
// marcar.
export const deveMarcarComoVistas = (confirmacoes, jaMarcadas) =>
  Array.isArray(confirmacoes) && confirmacoes.length > 0 && !jaMarcadas;

export default {
  SITUACOES_NO_PORTAL,
  situacaoNoPortal,
  temInterruptor,
  classeDaBolinha,
  deveMarcarComoVistas,
};
