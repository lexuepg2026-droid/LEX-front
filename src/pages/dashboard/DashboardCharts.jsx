import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';
import { formatCurrency, formatCurrencyCompact, formatMonthKey } from '../../utils/formatters';
import { corDoStatus, rotuloDoStatus } from '../../utils/statusVisual.js';
import { preencherMeses, toChartData } from '../../utils/chartSeries.js';
import EmptyState from '../../components/ui/EmptyState';

// ═══════════════════════════════════════════════════════════════════════════
// Os gráficos do dashboard (revistos na Fase 4.3).
//
// ── O que estava errado ───────────────────────────────────────────────────
// 1. Os três donuts não tinham legenda NENHUMA. Eram três anéis coloridos sem
//    nada dizendo o que cada cor significava.
// 2. As cores vinham de um segundo mapa de status, escrito à mão aqui, que já
//    divergia do `StatusBadge`: a fatia "Ativo" era dourada e o badge "Ativo",
//    verde. Mesmo com legenda, a cor não ajudaria a ligar gráfico e listagem.
// 3. `parcialmente_pago` não estava em mapa nenhum e caía no cinza de
//    "status desconhecido" — junto com os cancelados.
// 4. As barras não tinham rótulo de valor, e o eixo Y dizia "R$12k", com o "k"
//    do inglês.
// 5. Um mês sem honorário sumia do eixo, e fevereiro aparecia colado em maio.
//
// A cor agora vem de `utils/statusVisual.js`, que é o mesmo módulo que o
// `StatusBadge` consome. **A cor do gráfico É a cor do badge**, porque é uma
// leitura só do mesmo dado — não duas cópias em sincronia por disciplina.
// ═══════════════════════════════════════════════════════════════════════════

const TICK_STYLE = { fontSize: 12, fill: 'var(--color-text-muted)' };
const GRID_COLOR = 'var(--color-border)';
const LABEL_STYLE = { fontSize: 11, fill: 'var(--color-text-secondary)' };

// O tooltip do Recharts herda o estilo claro dele por padrão, que num tema
// escuro sai como um retângulo branco. Estes três objetos o trazem para as
// variáveis do projeto.
const TOOLTIP_CONTENT = {
  backgroundColor: 'var(--color-surface-raised)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text-primary)',
};
const TOOLTIP_LABEL = { color: 'var(--color-text-secondary)' };
const TOOLTIP_ITEM = { color: 'var(--color-text-primary)' };

const DONUTS = [
  { key: 'processos',  label: 'Processos'  },
  { key: 'honorarios', label: 'Honorários' },
  { key: 'parcelas',   label: 'Parcelas'   },
];

// Legenda escrita à mão, e não o `<Legend>` do Recharts: precisa mostrar
// quantidade ao lado do rótulo, quebrar em duas colunas no cartão estreito e
// usar as classes do projeto. O `<Legend>` daria um `<ul>` inline com estilo
// próprio, que teria de ser sobrescrito peça a peça.
function ChartLegend({ data }) {
  return (
    <ul className="chart-legend">
      {data.map((fatia) => (
        <li key={fatia.name} className="chart-legend-item">
          <span
            className="chart-legend-dot"
            style={{ backgroundColor: corDoStatus(fatia.name) }}
            aria-hidden="true"
          />
          <span className="chart-legend-label">{rotuloDoStatus(fatia.name)}</span>
          <span className="chart-legend-value">{fatia.value}</span>
        </li>
      ))}
    </ul>
  );
}

function DashboardCharts({ statusData, feesByMonth }) {
  // A janela do gráfico é sempre de 6 meses, com os vazios zerados. Ver
  // `utils/chartSeries.js`.
  const serieMensal = preencherMeses(feesByMonth);
  const temHonorarioNoPeriodo = serieMensal.some((m) => m.total > 0);

  return (
    <>
      {statusData && (
        <div className="charts-grid">
          {DONUTS.map(({ key, label }) => {
            const data = toChartData(statusData[key]);
            return (
              <div key={key} className="chart-panel">
                <p className="chart-panel-title">{label}</p>
                {data.length === 0 ? (
                  // Estado vazio próprio: um donut sem fatia é um buraco
                  // cinzento que parece falha de carregamento.
                  <p className="chart-empty">Sem dados no período</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={data}
                          cx="50%" cy="50%"
                          innerRadius={45} outerRadius={65}
                          dataKey="value"
                          paddingAngle={2}
                          isAnimationActive={false}
                        >
                          {data.map((fatia) => (
                            <Cell key={fatia.name} fill={corDoStatus(fatia.name)} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={TOOLTIP_CONTENT}
                          labelStyle={TOOLTIP_LABEL}
                          itemStyle={TOOLTIP_ITEM}
                          // O percentual vem calculado da série (o tooltip
                          // recebe uma fatia de cada vez e não conhece o
                          // total). "3 (75%)" responde as duas perguntas de
                          // uma vez.
                          formatter={(value, _name, item) => [
                            `${value} (${item?.payload?.percentual ?? 0}%)`,
                            rotuloDoStatus(item?.payload?.name),
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <ChartLegend data={data} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* O título diz o que a barra MEDE. A rota soma `Fee.valor` agrupando
          por `createdAt`: é o valor CONTRATADO, pelo mês em que a cobrança foi
          cadastrada — e não o recebido, que é outra coisa e vive nos cartões
          do mês. Rotular "Honorários por mês" deixava a advogada livre para
          ler como faturamento. */}
      <h2 className="summary-title chart-sub-title">
        Honorários contratados por mês de cadastro
      </h2>

      {!temHonorarioNoPeriodo ? (
        <EmptyState
          title="Sem dados no período."
          description="Nenhum honorário contratado nos últimos 6 meses."
        />
      ) : (
        <div className="chart-bar-wrapper">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={serieMensal} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey="mes"
                tick={TICK_STYLE}
                tickFormatter={(chave) => formatMonthKey(chave, { curto: true })}
              />
              <YAxis tick={TICK_STYLE} width={78} tickFormatter={formatCurrencyCompact} />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-raised)' }}
                contentStyle={TOOLTIP_CONTENT}
                labelStyle={TOOLTIP_LABEL}
                itemStyle={TOOLTIP_ITEM}
                // O tooltip mostra o valor POR EXTENSO: o rótulo sobre a barra
                // é compacto para caber, e nunca é a única forma de ler o
                // número.
                labelFormatter={(chave) => formatMonthKey(chave)}
                formatter={(value) => [formatCurrency(value), 'Contratado']}
              />
              <Bar dataKey="total" fill="var(--color-accent)" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey="total"
                  position="top"
                  style={LABEL_STYLE}
                  // Mês zerado fica sem rótulo: "R$ 0,00" flutuando sobre uma
                  // barra de altura zero vira ruído, e a ausência já se lê.
                  formatter={(valor) => (valor > 0 ? formatCurrencyCompact(valor) : '')}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

export default DashboardCharts;
