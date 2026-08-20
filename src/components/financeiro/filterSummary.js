import { descricaoDoPeriodo } from '../ui/periodo.js';
import { rotuloCurtoDoHonorario } from '../../utils/feeLabel.js';

// ═══════════════════════════════════════════════════════════════════════════
// A FRASE QUE DIZ O QUE ESTÁ FILTRANDO — Fase F-1b.3
//
// ── Por que a frase existe ───────────────────────────────────────────────
// "Nenhum recebimento encontrado." numa tela com três controles preenchidos
// faz a pessoa procurar o pagamento — reabrir a tela, conferir se lançou, ligar
// para o cliente. A frase que a tela precisa dizer é a que nomeia o RECORTE:
// "nenhum pagamento neste período para este honorário".
//
// A mesma frase serve às duas ocasiões: a barra de filtros aplicados (que
// responde "esta lista é curta ou está filtrada?") e o estado vazio. Duas
// redações para o mesmo recorte é o formato em que uma delas fica para trás.
//
// ── Função pura, testada como função pura ────────────────────────────────
// A suíte é `node --test` sem DOM. Concordância, ordem dos trechos e o caso do
// honorário que sumiu da lista são decisões de verdade — dentro do JSX só se
// provaria que a linha existe.
// ═══════════════════════════════════════════════════════════════════════════

// Os trechos entram numa ORDEM fixa: busca, honorário, extras da listagem,
// período. É a ordem em que a pessoa preencheu os controles, da esquerda para
// a direita — e uma frase cuja ordem muda conforme o que está preenchido se lê
// como outra frase a cada consulta.
export const descricaoDoRecorteFinanceiro = ({
  filtros = {},
  busca = '',
  honorarios = [],
  extras = []
} = {}) => {
  const trechos = [];

  const termo = (busca ?? '').trim();
  if (termo) trechos.push(`com "${termo}"`);

  if (filtros.honorarioId) {
    const achado = honorarios.find((h) => String(h._id) === String(filtros.honorarioId));
    // O honorário pode não estar na lista do seletor — ela carrega 100, e o
    // filtro pode ter vindo de um link. Dizer "para este honorário" sem nomeá-lo
    // é menos preciso e continua verdadeiro; inventar um nome não.
    trechos.push(
      achado ? `do honorário "${rotuloCurtoDoHonorario(achado.descricao)}"` : 'para este honorário'
    );
  }

  for (const extra of extras) {
    if (extra) trechos.push(extra);
  }

  const periodo = descricaoDoPeriodo(filtros.preset, { de: filtros.de, ate: filtros.ate });
  if (periodo) trechos.push(periodo);

  if (trechos.length === 0) return '';
  if (trechos.length === 1) return trechos[0];

  // Vírgulas e um "e" no fim. "com "pix", do honorário X e neste mês" se lê;
  // "com "pix", do honorário X, neste mês" se lê como uma lista inacabada.
  const ultimo = trechos[trechos.length - 1];
  return `${trechos.slice(0, -1).join(', ')} e ${ultimo}`;
};

export default { descricaoDoRecorteFinanceiro };
