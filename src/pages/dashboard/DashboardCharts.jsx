import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import EmptyState from '../../components/ui/EmptyState';

const STATUS_COLORS = {
  ativo:     'var(--color-accent)',
  pago:      'var(--color-success)',
  pendente:  'var(--color-warning)',
  suspenso:  'var(--color-warning)',
  encerrado: 'var(--color-text-secondary)',
  vencido:   'var(--color-danger)',
  cancelado: 'var(--color-danger)',
  parcial:   'var(--color-accent)',
};

const TICK_STYLE  = { fontSize: 12, fill: 'var(--color-text-muted)' };
const GRID_COLOR  = 'var(--color-border)';

const toChartData = (obj) =>
  Object.entries(obj || {}).map(([name, value]) => ({ name, value }));

function DashboardCharts({ statusData, feesByMonth }) {
  return (
    <>
      {statusData && (
        <div className="charts-grid">
          {[
            { key: 'processos',  label: 'Processos'  },
            { key: 'honorarios', label: 'Honorários' },
            { key: 'parcelas',   label: 'Parcelas'   },
          ].map(({ key, label }) => {
            const data = toChartData(statusData[key]);
            return (
              <div key={key} className="chart-panel">
                <p className="chart-panel-title">{label}</p>
                {data.length === 0 ? (
                  <p className="chart-empty">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={65}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {data.map(entry => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name] ?? 'var(--color-text-muted)'}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            );
          })}
        </div>
      )}

      <h2 className="summary-title chart-sub-title">Honorários por Mês</h2>

      {feesByMonth.length === 0 ? (
        <EmptyState
          title="Sem dados mensais."
          description="Nenhum honorário registrado nos últimos 6 meses."
        />
      ) : (
        <div className="chart-bar-wrapper">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={feesByMonth} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis dataKey="mes" tick={TICK_STYLE} />
              <YAxis
                tick={TICK_STYLE}
                width={70}
                tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
              />
              <Tooltip formatter={(value) => [formatCurrency(value), 'Total']} />
              <Bar dataKey="total" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}

export default DashboardCharts;
