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
// ── DEC-044: a linha que deixou de valer diz que deixou de valer ──────────
// O estorno anulado já tinha esse tratamento desde a F-1b ("este estorno foi
// anulado depois"). A ALOCAÇÃO DESFEITA não tinha nenhum — e era ela que
// quebrava a leitura: depois de estornar R$ 1.000,00 de um pagamento de
// R$ 4.500,00 e anular o estorno, o extrato mostrava alocações de
// 3.000 + 1.500 + 500 + 1.000 = 6.000 para um pagamento de 4.500.
//
// A conta do sistema estava certa (a de 1.500 não vale mais). O que faltava
// era a linha DIZER isso. Três frases nasceram daqui:
//
//   • a alocação desfeita diz quando foi desfeita e por qual estorno;
//   • a substituta de estorno parcial diz de onde veio, para não parecer uma
//     alocação original do dia do pagamento (ela herda a data dele);
//   • a desalocação cujo estorno foi anulado diz que o valor voltou.
//
// A regra que fica: **nenhuma linha do extrato pode ser somada por quem lê e
// dar um total que o sistema não reconhece.**
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
// A REFERÊNCIA CURTA DO PAGAMENTO — DEC-044, item 3
//
// "Do pagamento de 18/08/2026" não distingue nada quando houve DOIS pagamentos
// naquele dia, e dois pagamentos no mesmo dia é o caso comum (o PIX do cliente
// e a transferência do sócio). O `pagamentoId` já estava no contrato e a tela
// já exibia "Pagamento #1ebee9" na linha do pagamento — o mesmo formato passa
// a entrar no vínculo, SOMANDO à data em vez de substituí-la: a data é o que
// situa a linha na história, o sufixo é o que a desempata.
//
// Seis caracteres do fim do ObjectId: os últimos bytes são o contador, que é
// o que muda entre dois documentos criados no mesmo instante. É a mesma fatia
// que a linha do pagamento exibe — uma referência que aparecesse em dois
// formatos não seria referência.
// ═══════════════════════════════════════════════════════════════════════════
export const refDoPagamento = (pagamentoId) =>
  pagamentoId ? `#${String(pagamentoId).slice(-6)}` : null;

// A data do pagamento é campo PRÓPRIO no contrato (`dataPagamento`), e não a
// data do evento. Uma alocação nascida de anulação carrega a data da anulação;
// escrever "do pagamento de {data do evento}" ali afirmava uma data em que
// pagamento nenhum aconteceu. `evento.data` fica como retaguarda para contrato
// antigo, não como fonte preferida.
const pagamentoEscrito = (evento) => {
  const data = formatDate(evento?.dataPagamento ?? evento?.data);
  const ref = refDoPagamento(evento?.pagamentoId);
  return ref ? `${data} (${ref})` : data;
};

// ═══════════════════════════════════════════════════════════════════════════
// AS DUAS LEITURAS QUE A DEC-044 CRIOU
//
// `alocacaoDesfeita` é a linha que NÃO PODE mais ser somada. `ativa === false`
// é o que o backend afirma; os campos de data e estorno são o que permite
// dizer POR QUE. A tela pergunta por `ativa`, e não pela presença do estorno,
// porque `ativa` é o campo que o contrato define como a resposta.
// ═══════════════════════════════════════════════════════════════════════════
export const alocacaoDesfeita = (evento) =>
  evento?.tipo === TIPO_EVENTO.ALOCACAO && evento?.ativa === false;

export const alocacaoSubstituta = (evento) =>
  evento?.tipo === TIPO_EVENTO.ALOCACAO && Boolean(evento?.substituiAlocacaoId);

// A linha inteira fica ATENUADA quando o que ela registra não vale mais —
// mesma escolha visual da parcela reparcelada e da linha `row-inativa` das
// listagens. Atenuar, e não esconder: sumir com a linha levaria junto o
// histórico, que é a razão de o extrato existir.
export const eventoAtenuado = (evento) => alocacaoDesfeita(evento);

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
    case TIPO_EVENTO.ALOCACAO: {
      // De onde veio e para onde foi. `saldoAdiantado` é a origem que explica
      // por que um dinheiro de meses atrás encostou numa parcela de hoje.
      const origem =
        evento.origem === 'saldoAdiantado'
          ? `De saldo adiantado, aplicado na ${parcelaEscrita(evento)}.`
          : `Do pagamento de ${pagamentoEscrito(evento)}, aplicado na ${parcelaEscrita(evento)}.`;

      // ── DEC-044 ────────────────────────────────────────────────────────
      // A frase da linha desfeita vem PRIMEIRO na ordem de checagem porque é a
      // que muda o que se pode fazer com o número: quem lê precisa saber que
      // esta linha não entra na soma antes de saber de onde ela veio.
      if (alocacaoDesfeita(evento)) {
        const quando = evento.desfeitaEm ? ` em ${formatDate(evento.desfeitaEm)}` : '';
        const porQual =
          evento.valorEstornoQueDesfez !== null && evento.valorEstornoQueDesfez !== undefined
            ? ` pelo estorno de ${formatCurrency(evento.valorEstornoQueDesfez)}`
            : ' por um estorno';
        return `${origem} Esta alocação foi desfeita${quando}${porQual} — não entra na soma.`;
      }

      // A SUBSTITUTA nasce de um estorno parcial (DEC-035) e HERDA a data do
      // pagamento: sem esta frase ela aparece no meio das alocações originais
      // daquele dia, e o bloco do dia parece alocar mais do que o pagamento
      // tinha. Ela vale — só não nasceu quando parece.
      if (alocacaoSubstituta(evento)) {
        const doEstorno =
          evento.valorEstornoQueGerou !== null && evento.valorEstornoQueGerou !== undefined
            ? ` de ${formatCurrency(evento.valorEstornoQueGerou)}`
            : '';
        return (
          `${origem} É o que restou de uma alocação maior, desfeita pelo estorno` +
          `${doEstorno} — não é uma alocação nova do dia do pagamento.`
        );
      }

      return origem;
    }

    case TIPO_EVENTO.DESALOCACAO:
      // A pergunta que esta linha responde é "por que esta parcela voltou a
      // dever" — e a resposta é o estorno, com o motivo dele.
      //
      // DEC-044: quando esse estorno foi ANULADO depois, o dinheiro que esta
      // linha tirou já voltou. Sem a ressalva, quem lê subtrai duas vezes.
      return (
        `Saiu da ${parcelaEscrita(evento)} por estorno` +
        (evento.motivo ? `: ${evento.motivo}` : '') +
        (evento.estornoAnulado
          ? ' (este estorno foi anulado depois: o valor voltou e foi realocado).'
          : '.')
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
  refDoPagamento,
  alocacaoDesfeita,
  alocacaoSubstituta,
  eventoAtenuado,
};
