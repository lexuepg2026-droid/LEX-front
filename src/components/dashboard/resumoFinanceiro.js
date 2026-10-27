import { formatCurrency } from '../../utils/formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// OS CARTÕES DO RESUMO FINANCEIRO — uma definição para os dois painéis
// (Fase 3.7, DEC-131)
//
// O Início e a Visão geral do Financeiro mostram os mesmos números de
// `GET /financeiro/resumo`. Rótulo, campo e nota moram AQUI, e as duas telas
// os importam: dois mapas escritos à mão divergem — foi assim que o badge e o
// donut discordaram na 4.3 —, e aqui divergir seria a advogada ler "Em aberto"
// com um valor num painel e outro no vizinho.
//
// `tests/regressions/fase37.test.js` trava que as duas telas leem estes
// campos por estas definições.
// ═══════════════════════════════════════════════════════════════════════════

// Os acumulados, sem recorte de mês.
export const CARTOES_DO_ACUMULADO = Object.freeze([
  { key: 'valorContratado', label: 'Valor Contratado (total)', icone: 'documento', color: 'primary' },
  { key: 'recebido',        label: 'Recebido (total)',         icone: 'dinheiro',  color: 'success' },
  { key: 'pendente',        label: 'Em Aberto (total)',        icone: 'relogio',   color: 'warning' },
]);

// Retrato de HOJE, não do mês: o rótulo diz isso. O valor é `valorVencido` do
// resumo; a contagem da nota vem do sino (`/calendar/avisos`), a fonte única
// do número de vencidas (DEC-057).
export const CARTAO_VENCIDO_HOJE = Object.freeze({
  key: 'valorVencido', label: 'Total vencido hoje', color: 'danger',
});

// O crédito do cliente (DEC-036/040): dinheiro recebido sem parcela ainda.
export const CARTAO_SALDO_ADIANTADO = Object.freeze({
  key: 'saldoAdiantado', label: 'Saldo adiantado', icone: 'dinheiro', color: 'info',
});

// Os campos do resumo que os dois painéis leem em comum.
export const CAMPOS_EM_COMUM = Object.freeze([
  ...CARTOES_DO_ACUMULADO.map((c) => c.key),
  CARTAO_VENCIDO_HOJE.key,
  CARTAO_SALDO_ADIANTADO.key,
]);

// A frase do Início, que já existia (`pluralParcelas`): o adjetivo concorda
// junto, e `pluralizar` só flexiona uma palavra.
export const notaDasVencidas = (quantidade) => {
  if (!(quantidade > 0)) return 'nenhuma parcela vencida';
  return quantidade === 1 ? '1 parcela vencida' : `${quantidade} parcelas vencidas`;
};

// ── A nota do saldo adiantado ────────────────────────────────────────────
//
// Fase 3.7: a frase da F-1a dizia que o valor "já está abatido do total em
// aberto". Era verdade na F-1a e deixou de ser na DEC-040: desde lá o crédito
// sai NOMEADO e não entra em conta nenhuma — nem no "Recebido" (que é o
// alocado em parcelas) nem no "Em aberto" (que tem piso zero por honorário).
// A frase passou a dizer o que o número é.
export const notaDoSaldoAdiantado = (valor) =>
  `${formatCurrency(valor)} recebidos como adiantamento, ainda sem parcela ` +
  'correspondente. É crédito do cliente: não entra no "Recebido" nem abate o ' +
  '"Em aberto".';

export default {
  CARTOES_DO_ACUMULADO,
  CARTAO_VENCIDO_HOJE,
  CARTAO_SALDO_ADIANTADO,
  CAMPOS_EM_COMUM,
  notaDasVencidas,
  notaDoSaldoAdiantado,
};
