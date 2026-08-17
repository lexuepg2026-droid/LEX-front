// ═══════════════════════════════════════════════════════════════════════════
// STATUS → RÓTULO + COR. Fonte única (Fase 4.3).
//
// ── Por que este arquivo existe ────────────────────────────────────────────
// Havia dois mapas de status na interface, escritos à mão, e eles já tinham
// divergido:
//
//   `components/ui/StatusBadge.jsx`   `ativo` → success   `parcial` → info
//   `pages/dashboard/DashboardCharts` `ativo` → accent    `parcial` → accent
//
// Ou seja: a fatia "Ativo" do donut era DOURADA e o badge "Ativo" da listagem,
// VERDE. Um gráfico sem legenda em que a cor também não bate com a do badge
// não é ilegível por acidente — não há como lê-lo.
//
// E os dois mapas esqueceram `parcialmente_pago`, que nasceu na DEC-028: o
// badge do honorário exibia a string crua do enum, com sublinhado, em cinza.
//
// **A regra fixada é: a cor do gráfico é a cor do badge.** Não o contrário —
// o badge é o que a advogada vê o dia inteiro nas listagens, e o donut é
// consulta ocasional. Quem se ajustou foi o gráfico.
//
// ── Por que a cor é o TEXTO do badge, e não o fundo ────────────────────────
// O badge pinta fundo esmaecido (`--color-*-bg`, 10% de alpha) e texto em cor
// plena. Numa fatia de donut, o fundo de 10% seria cinza para qualquer olho.
// A cor que a pessoa identifica como "a cor do Vencido" é a do texto — é essa
// que a fatia usa.
// ═══════════════════════════════════════════════════════════════════════════

// Os cinco tons do sistema, e a variável CSS de cada um. `neutral` é o único
// que não tem `--color-neutral`: o cinza legível do projeto é o do texto
// secundário, e é ele que o badge neutro já usa.
export const COR_DO_TOM = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger:  'var(--color-danger)',
  info:    'var(--color-info)',
  neutral: 'var(--color-text-secondary)',
};

export const STATUS_VISUAL = {
  // Processos
  ativo:     { label: 'Ativo',     tom: 'success' },
  encerrado: { label: 'Encerrado', tom: 'neutral' },
  suspenso:  { label: 'Suspenso',  tom: 'warning' },

  // Honorários (DEC-028) / Parcelas / Pagamentos
  pendente:          { label: 'Pendente',          tom: 'warning' },
  // `parcialmente_pago` é do honorário e `parcial` é da parcela: nomes
  // diferentes para o mesmo fato em níveis diferentes, os dois no enum do
  // backend. Mesmo tom, porque para quem lê é a mesma informação — "entrou
  // parte do dinheiro".
  parcialmente_pago: { label: 'Parcialmente pago', tom: 'info'    },
  parcial:           { label: 'Parcial',           tom: 'info'    },
  pago:              { label: 'Pago',              tom: 'success' },
  recebido:          { label: 'Recebido',          tom: 'success' },
  vencido:           { label: 'Vencido',           tom: 'danger'  },
  cancelado:         { label: 'Cancelado',         tom: 'danger'  },
  // ── `reparcelada` NÃO é um status do backend (F-1a.1) ────────────────────
  //
  // No banco ela é `cancelado` com `reparcelamentoId` preenchido. A distinção
  // é de LEITURA e importa: uma cobrança cancelada foi desfeita, uma
  // reparcelada foi SUBSTITUÍDA — o dinheiro continua devido, em outras
  // parcelas. Chamar as duas de "Cancelado" faz a advogada ler baixa onde
  // houve renegociação.
  //
  // Entra aqui, e não numa string solta na ficha, porque este arquivo é a
  // fonte ÚNICA de rótulo e cor desde a 4.3 — badge e fatia de gráfico saem
  // dele, e um rótulo escrito à mão na tela seria o segundo mapa que a 4.3
  // existiu para eliminar.
  //
  // Tom `info`, e não `danger`: nada se perdeu, o plano mudou.
  reparcelada:       { label: 'Reparcelada',       tom: 'info'    },

  // Estado do participante no portal (Fase 3.2), de `config/portalEstados.js`.
  // A distinção que importa é entre ACESSAR e CONFIRMAR: abrir a página é
  // automático e não notifica; confirmar é clique deliberado e é o recibo. Por
  // isso "acessou, não confirmou" é `warning` e não `success`.
  nunca_acessou:         { label: 'Nunca acessou',          tom: 'neutral' },
  acessou_sem_confirmar: { label: 'Acessou, não confirmou', tom: 'warning' },
  confirmou:             { label: 'Confirmou a leitura',    tom: 'success' },
};

const normalizar = (status) =>
  typeof status === 'string' ? status.toLowerCase().trim() : '';

// Status desconhecido não some nem quebra: vira o próprio valor, em tom
// neutro. É o que já acontecia no `StatusBadge`, e é o comportamento certo —
// um enum novo do backend precisa aparecer na tela para alguém notar que
// falta rotulá-lo aqui.
export const visualDoStatus = (status) =>
  STATUS_VISUAL[normalizar(status)] ?? { label: status ?? '—', tom: 'neutral' };

export const rotuloDoStatus = (status) => visualDoStatus(status).label;

export const tomDoStatus = (status) => visualDoStatus(status).tom;

// A cor pronta para o gráfico, já como `var(--…)`. O Recharts a repassa para
// o atributo `fill` do SVG, que resolve variável CSS normalmente.
export const corDoStatus = (status) => COR_DO_TOM[tomDoStatus(status)];
