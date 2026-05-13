import React, { useState, useEffect } from 'react';
import { Scale, Users, FileText, AlertCircle, FolderOpen, Banknote } from 'lucide-react';
import dashboardService from '../../api/dashboardService';
import installmentService from '../../api/installmentService';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { formatDate, formatCurrency } from '../../utils/formatters';
import './DashboardPage.css';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const STATUS_COLORS = {
  ativo:     '#C8A96B',
  pago:      '#22c55e',
  pendente:  '#f59e0b',
  suspenso:  '#f59e0b',
  encerrado: '#6b7280',
  vencido:   '#ef4444',
  cancelado: '#ef4444',
};

const toChartData = (obj) =>
  Object.entries(obj || {}).map(([name, value]) => ({ name, value }));

const CARDS = [
  { key: 'processosAtivos',        label: 'Processos Ativos',       format: 'number',   Icon: Scale,       color: 'primary' },
  { key: 'clientesCadastrados',    label: 'Clientes Cadastrados',   format: 'number',   Icon: Users,       color: 'primary' },
  { key: 'honorariosAReceber',     label: 'Honorários a Receber',   format: 'number',   Icon: FileText,    color: 'warning' },
  { key: 'parcelasVencidas',       label: 'Parcelas Vencidas',      format: 'number',   Icon: AlertCircle, color: 'danger'  },
  { key: 'documentosCadastrados',  label: 'Documentos Cadastrados', format: 'number',   Icon: FolderOpen,  color: 'neutral' },
  { key: 'pagamentosRecebidosMes', label: 'Pagamentos do Mês',      format: 'currency', Icon: Banknote,    color: 'success' },
];

const formatCurrentDate = () =>
  new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

const daysUntilLabel = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0)   return 'Vencida';
  if (diff === 0) return 'Vence hoje';
  if (diff === 1) return 'Vence amanhã';
  return `Vence em ${diff} dias`;
};

function DashboardHomePage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upcoming, setUpcoming] = useState([]);
  const [statusData, setStatusData] = useState(null);
  const [feesByMonth, setFeesByMonth] = useState([]);

  useEffect(() => {
    dashboardService.getDashboardSummary()
      .then(res => setSummary(res.data))
      .catch(() => setError('Falha ao carregar o resumo.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    installmentService.listInstallments()
      .then(res => {
        const all = res.data.data ?? res.data;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);

        const urgent = all
          .filter(inst => {
            if (inst.status === 'vencido') return true;
            if (inst.status !== 'pendente') return false;
            return new Date(inst.dataVencimento) <= in7Days;
          })
          .sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

        setUpcoming(urgent);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    dashboardService.getStatusCounts()
      .then(res => setStatusData(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    dashboardService.getFeesByMonth()
      .then(res => setFeesByMonth(res.data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-date">{formatCurrentDate()}</p>
      </div>

      <section className="summary-section">
        <h2 className="summary-title">Resumo Geral</h2>

        {loading && <p>Carregando...</p>}
        {error && <p className="error-message">{error}</p>}

        {summary && (
          <div className="summary-grid">
            {CARDS.map(({ key, label, format, Icon, color }) => (
              <div key={key} className={`summary-card summary-card--${color}`}>
                <div className="card-icon">
                  <Icon size={22} />
                </div>
                <p className="card-label">{label}</p>
                <p className="card-value">
                  {format === 'currency'
                    ? formatCurrency(summary[key])
                    : summary[key] != null ? summary[key].toLocaleString('pt-BR') : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="upcoming-section">
        <h2 className="summary-title">Parcelas que precisam de atenção</h2>

        {upcoming.length === 0 ? (
          <EmptyState
            title="Nenhuma parcela urgente."
            description="Todas as parcelas estão em dia nos próximos 7 dias."
          />
        ) : (
          <ul className="upcoming-list">
            {upcoming.map(inst => (
              <li key={inst._id} className="upcoming-item">
                <div className="upcoming-info">
                  <span className="upcoming-desc">
                    {inst.feeId?.descricao || 'Honorário'} — Parcela {inst.numeroParcela}
                  </span>
                  <span className="upcoming-due">{daysUntilLabel(inst.dataVencimento)}</span>
                </div>
                <div className="upcoming-right">
                  <span className="upcoming-value">{formatCurrency(inst.valor)}</span>
                  <StatusBadge status={inst.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="charts-section">
        <h2 className="summary-title">Distribuição por Status</h2>

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
                            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#6b7280'} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#888' }}
                  width={70}
                  tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
                />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Total']} />
                <Bar dataKey="total" fill="#C8A96B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardHomePage;
