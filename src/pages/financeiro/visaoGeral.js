import { contextoDoProcesso, datasProximas, TIPOS_DE_DATA } from '../dashboard/inicio.js';
import { destinoDoItem } from '../../utils/calendarLabels.js';
import { formatCurrency } from '../../utils/formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// A VISÃO GERAL DO FINANCEIRO — as regras (Fase 3.7, DEC-130)
//
// A página deixou de embutir as três listas (elas têm página própria, a um
// clique no submenu) e virou um PAINEL: resumo, parcelas vencidas, próximos
// vencimentos e atalhos. Nenhuma conta de dinheiro aqui: o em aberto de cada
// parcela vem pronto do servidor, e os cartões leem o resumo.
//
// Arquivo `.js` pela razão de sempre: a suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

export const LIMITE_DA_VISAO_GERAL = 8;

// "Ver todas" das vencidas: a lista de Parcelas com o filtro de status que
// já existe (`?situacao=vencido`, DEC-103). A chave da situação do REGISTRO
// nessa lista é `?registro=` (DEC-132), justamente para não colidir com esta.
export const DESTINO_DAS_VENCIDAS = '/dashboard/parcelas?situacao=vencido';

// As vencidas, da MESMA fonte que o sino e o Início contam
// (`GET /calendar/avisos`, DEC-057), na ordem do servidor (a mais antiga
// primeiro). A linha é a das Datas próximas, com a pílula "Vencida".
//
// - título: "{honorário} — Parcela N de M" (o rótulo vem pronto do servidor);
// - subtítulo: o EM ABERTO (`emAberto`, DEC-130 do back), não o valor cheio —
//   é o que falta receber; sem o campo (back antigo), não se inventa número;
// - contexto: "{processo} · {cliente}" (DEC-105);
// - destino: a parcela, o mesmo que a Agenda dá a uma derivada de parcela.
export const vencidasDoAviso = (avisos, limite = LIMITE_DA_VISAO_GERAL) =>
  (Array.isArray(avisos?.parcelasVencidas) ? avisos.parcelasVencidas : [])
    .slice(0, limite)
    .map((p) => ({
      chave: `vencida-${p._id}`,
      data: p.data,
      hora: null,
      tipo: TIPOS_DE_DATA.vencida.valor,
      titulo: `${p.subtitulo || 'Honorário'} — ${p.titulo}`,
      subtitulo: p.emAberto != null ? `${formatCurrency(p.emAberto)} em aberto` : null,
      contexto: contextoDoProcesso(null, p.processo?.numeroProcesso, p.processo?.clientePrincipalNome),
      destino: destinoDoItem(p),
    }));

// Os próximos vencimentos: a função das Datas próximas do Início, só com os
// vencimentos (sem compromissos), até 8.
export const proximosDoResumo = (resumo, limite = LIMITE_DA_VISAO_GERAL) =>
  datasProximas({ vencimentos: resumo?.proximosVencimentos ?? [], eventos: [], limite });

// Os atalhos: o total de cada lista e o caminho para ela e para o "+". O
// total sai da MESMA consulta-padrão que a lista faz ao abrir (sem filtro),
// pedida com `limit: 1` — o título da lista diz "(N)" com esse mesmo número.
export const ATALHOS = Object.freeze([
  {
    chave: 'honorarios', rotulo: 'Honorários', para: '/dashboard/honorarios', icone: 'documento',
    novo: { rotulo: '+ Novo honorário', para: '/dashboard/honorarios/novo' },
  },
  {
    chave: 'parcelas', rotulo: 'Parcelas', para: '/dashboard/parcelas', icone: 'calendario',
    novo: { rotulo: '+ Nova parcela', para: '/dashboard/parcelas/novo' },
  },
  {
    chave: 'pagamentos', rotulo: 'Pagamentos', para: '/dashboard/pagamentos', icone: 'dinheiro',
    novo: { rotulo: '+ Registrar pagamento', para: '/dashboard/pagamentos/novo' },
  },
]);

// O total do envelope de listagem; `null` quando não se sabe (sem sinal, ou
// a consulta falhou) — a tela diz "—", nunca "0".
export const totalDaLista = (resposta) => {
  const total = resposta?.data?.total;
  return Number.isFinite(total) ? total : null;
};

export default {
  LIMITE_DA_VISAO_GERAL,
  DESTINO_DAS_VENCIDAS,
  vencidasDoAviso,
  proximosDoResumo,
  ATALHOS,
  totalDaLista,
};
