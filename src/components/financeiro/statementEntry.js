import { formatCurrency, formatDate } from '../../utils/formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// UMA ENTRADA DO EXTRATO, EM PALAVRAS — Fase F-1b
//
// ── Por que isto é função pura, e não JSX ─────────────────────────────────
// Mesma razão de `allocationSummary.js` e `paymentRow.js`: a suíte é
// `node --test` sem DOM. Frase montada dentro do componente só se testaria por
// varredura de texto, que prova que a linha existe — não que ela diz a coisa
// certa. Aqui há sete tipos de evento, concordância e, sobretudo, os VÍNCULOS.
//
// ── Os vínculos são a razão de o extrato existir ──────────────────────────
// Uma lista de "estorno — R$ 500,00 — 12/06" é um extrato bancário ruim. O que
// o modelo do Financeiro 2.0 guarda, e que nenhuma outra tela mostra, é de
// ONDE cada movimento saiu:
//
//   • o estorno diz de qual PAGAMENTO saiu;
//   • a alocação diz de qual PAGAMENTO veio e para qual PARCELA foi;
//   • a desalocação diz por qual ESTORNO a parcela voltou a dever;
//   • a anulação diz qual ESTORNO ela desfez;
//   • o reparcelamento diz quais parcelas saíram e quais nasceram.
//
// Sem isso o extrato é lista, não rastreabilidade — e rastreabilidade é a
// razão de o modelo ter sido feito assim (DEC-033/DEC-035/DEC-037).
//
// ── O vocabulário é FECHADO e vem do backend ──────────────────────────────
// `TIPO_EVENTO` de `services/statementService.js`. A tela não inventa tipo: um
// valor novo do backend cai no rótulo cru, e aparecer feio é o que faz alguém
// notar que falta rotulá-lo aqui — mesma escolha do `visualDoStatus`.
// ═══════════════════════════════════════════════════════════════════════════

export const TIPO_EVENTO = Object.freeze({
  PAGAMENTO: 'pagamento',
  ESTORNO: 'estorno',
  ANULACAO_ESTORNO: 'anulacaoEstorno',
  ALOCACAO: 'alocacao',
  DESALOCACAO: 'desalocacao',
  REPARCELAMENTO: 'reparcelamento',
  MUDANCA_STATUS: 'mudancaStatus',
});

// O rótulo legível de cada tipo. "Anulação de estorno" e "Estorno" são tipos
// DIFERENTES de propósito: um tira dinheiro, o outro devolve, e chamá-los pelo
// mesmo nome faria a advogada somar na direção errada ao ler a coluna.
const ROTULO = {
  [TIPO_EVENTO.PAGAMENTO]: 'Pagamento',
  [TIPO_EVENTO.ESTORNO]: 'Estorno',
  [TIPO_EVENTO.ANULACAO_ESTORNO]: 'Anulação de estorno',
  [TIPO_EVENTO.ALOCACAO]: 'Alocação',
  [TIPO_EVENTO.DESALOCACAO]: 'Desalocação',
  [TIPO_EVENTO.REPARCELAMENTO]: 'Reparcelamento',
  [TIPO_EVENTO.MUDANCA_STATUS]: 'Mudança de status',
};

export const rotuloDoEvento = (tipo) => ROTULO[tipo] ?? tipo ?? '—';

// O TOM da entrada, para a faixa lateral. Não usa `statusVisual` porque isto
// não é status de registro nenhum — é a DIREÇÃO do dinheiro, e reaproveitar o
// mapa de status faria "Pago" e "entrada de dinheiro" virarem a mesma ideia
// por acidente de cor.
const TOM = {
  [TIPO_EVENTO.PAGAMENTO]: 'entrada',
  [TIPO_EVENTO.ALOCACAO]: 'entrada',
  [TIPO_EVENTO.ANULACAO_ESTORNO]: 'entrada',
  [TIPO_EVENTO.ESTORNO]: 'saida',
  [TIPO_EVENTO.DESALOCACAO]: 'saida',
  [TIPO_EVENTO.REPARCELAMENTO]: 'neutro',
  [TIPO_EVENTO.MUDANCA_STATUS]: 'neutro',
};

export const tomDoEvento = (tipo) => TOM[tipo] ?? 'neutro';

// Entrada sem valor em dinheiro — a mudança de status. O backend manda
// `valor: null`, e é assim que a tela sabe não escrever "R$ 0,00" numa linha
// que não move dinheiro (o espírito do `"—"` da 4.3).
export const temValor = (evento) =>
  evento?.valor !== null && evento?.valor !== undefined;

const parcelaEscrita = (evento) =>
  evento?.numeroParcela !== null && evento?.numeroParcela !== undefined
    ? `parcela ${evento.numeroParcela}`
    : 'uma parcela que não está mais na lista';

// ═══════════════════════════════════════════════════════════════════════════
// A FRASE DO VÍNCULO
//
// Devolve `null` quando o evento não tem vínculo a declarar — e aí a tela não
// imprime linha vazia. Nunca inventa: quando o campo não veio, a frase diz o
// que se sabe em vez de fingir precisão.
// ═══════════════════════════════════════════════════════════════════════════
export const vinculoDoEvento = (evento) => {
  if (!evento || typeof evento !== 'object') return null;

  switch (evento.tipo) {
    case TIPO_EVENTO.ALOCACAO:
      // De onde veio e para onde foi. `saldoAdiantado` é a origem que explica
      // por que um dinheiro de meses atrás encostou numa parcela de hoje.
      return evento.origem === 'saldoAdiantado'
        ? `De saldo adiantado, aplicado na ${parcelaEscrita(evento)}.`
        : `Do pagamento de ${formatDate(evento.data)}, aplicado na ${parcelaEscrita(evento)}.`;

    case TIPO_EVENTO.DESALOCACAO:
      // A pergunta que esta linha responde é "por que esta parcela voltou a
      // dever" — e a resposta é o estorno, com o motivo dele.
      return (
        `Saiu da ${parcelaEscrita(evento)} por estorno` +
        (evento.motivo ? `: ${evento.motivo}.` : '.')
      );

    case TIPO_EVENTO.ESTORNO:
      return (
        `Estorno sobre o pagamento de ${formatCurrency(evento.valorPagamento)}` +
        (evento.motivo ? ` — ${evento.motivo}` : '') +
        (evento.anulado ? ' (este estorno foi anulado depois).' : '.')
      );

    case TIPO_EVENTO.ANULACAO_ESTORNO:
      return (
        `Desfaz o estorno de ${formatCurrency(evento.valorEstornoAnulado)}` +
        (evento.motivo ? ` — ${evento.motivo}` : '') +
        '. O valor voltou a ser considerado recebido e foi realocado.'
      );

    case TIPO_EVENTO.REPARCELAMENTO: {
      const canceladas = evento.parcelasCanceladas?.length ?? 0;
      const novas = evento.parcelasNovas?.length ?? 0;
      const numeros = (evento.parcelasCanceladas ?? [])
        .map((p) => p.numeroParcela)
        .filter((n) => n !== null && n !== undefined);
      const quais = numeros.length > 0 ? ` (${numeros.join(', ')})` : '';
      return (
        `${canceladas} parcela(s)${quais} saíram e ${novas} nasceram no lugar.`
      );
    }

    case TIPO_EVENTO.MUDANCA_STATUS:
      return evento.de
        ? `De "${evento.de}" para "${evento.para}".`
        : `Criado como "${evento.para}".`;

    case TIPO_EVENTO.PAGAMENTO:
      return evento.observacoes ? evento.observacoes : null;

    default:
      return null;
  }
};

// O pagamento ao qual a linha se refere, quando existe. É o que liga a linha do
// extrato ao modal de estorno — sem ele a advogada leria o evento e não teria
// por onde agir.
export const pagamentoDoEvento = (evento) => evento?.pagamentoId ?? null;

// Um estorno ANULÁVEL: estorno de verdade (não anulação) que ninguém anulou
// ainda. É a condição exata que o backend impõe — anular anulação responde 409
// `anulacaoDeAnulacao`, e anular duas vezes responde 409 `estornoJaAnulado`.
// Repetir a regra aqui não é segunda fonte de verdade: é a tela não oferecer um
// botão cuja recusa ela já conhece.
export const podeAnular = (evento) =>
  evento?.tipo === TIPO_EVENTO.ESTORNO && evento?.anulado !== true;

export default {
  TIPO_EVENTO,
  rotuloDoEvento,
  tomDoEvento,
  temValor,
  vinculoDoEvento,
  pagamentoDoEvento,
  podeAnular,
};
