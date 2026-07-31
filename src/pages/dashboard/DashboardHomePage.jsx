import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Scale, Users, FileText, AlertCircle, FolderOpen, Banknote, BellRing, HandCoins, Wallet } from 'lucide-react';
import dashboardService from '../../api/dashboardService';
import financeiroService from '../../api/financeiroService';
import installmentService from '../../api/installmentService';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/common/Loading';
import { formatCurrency } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import './DashboardPage.css';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

const CARDS = [
  { key: 'processosAtivos',        label: 'Processos Ativos',       format: 'number',   Icon: Scale,       color: 'primary' },
  { key: 'clientesCadastrados',    label: 'Clientes Cadastrados',   format: 'number',   Icon: Users,       color: 'primary' },
  { key: 'honorariosAReceber',     label: 'Honorários a Receber',   format: 'number',   Icon: FileText,    color: 'warning' },
  { key: 'parcelasVencidas',       label: 'Parcelas Vencidas',      format: 'number',   Icon: AlertCircle, color: 'danger'  },
  { key: 'documentosCadastrados',  label: 'Documentos Cadastrados', format: 'number',   Icon: FolderOpen,  color: 'neutral' },
  { key: 'pagamentosRecebidosMes', label: 'Pagamentos do Mês',      format: 'currency', Icon: Banknote,    color: 'success' },
  // Confirmações de leitura que a advogada ainda não olhou (Fase 3.2). Sai do
  // mesmo `GET /dashboard` dos outros seis — é mais um número do mesmo painel,
  // não uma chamada a mais.
  //
  // `info` e não `success`: é coisa a fazer, não resultado alcançado. E não é
  // `warning`: confirmação chegando é o sistema funcionando, nada está errado.
  { key: 'confirmacoesNaoVistas',  label: 'Confirmações Novas',     format: 'number',   Icon: BellRing,    color: 'info'    },
];

// ── Indicadores em dinheiro (Fase 4.2) ─────────────────────────────────────
//
// Saem de `GET /api/financeiro/resumo`, que já existia — nenhum endpoint foi
// criado nesta fase, e nenhum total é somado aqui.
//
// **Os rótulos dizem exatamente o que o número é.** O roteiro da fase pedia "a
// receber no mês" e "total vencido em valor"; o backend não expõe nenhum dos
// dois. O que ele expõe é o acumulado do escritório inteiro, sem recorte de
// período. Rotular "Em aberto" como "A receber no mês" seria mais bonito e
// estaria errado — e é o tipo de erro que ninguém percebe até a advogada
// planejar o mês com o número de todos os tempos.
const CARDS_FINANCEIROS = [
  { key: 'valorContratado', label: 'Valor Contratado (total)', Icon: FileText,  color: 'primary' },
  { key: 'recebido',        label: 'Recebido (total)',         Icon: HandCoins, color: 'success' },
  { key: 'pendente',        label: 'Em Aberto (total)',        Icon: Wallet,    color: 'warning' },
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
  const [resumoFinanceiro, setResumoFinanceiro] = useState(null);

  useEffect(() => {
    dashboardService.getDashboardSummary()
      .then(res => setSummary(res.data))
      .catch(err => setError(getApiErrorMessage(err, 'Falha ao carregar o resumo.')))
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
      .catch(err => toast.error(getApiErrorMessage(err, 'Não foi possível carregar cobranças urgentes.')));
  }, []);

  // Falha aqui não derruba o painel: os outros seis cartões e os gráficos
  // continuam legíveis, e o que se perde é a faixa em dinheiro.
  useEffect(() => {
    financeiroService.getResumo()
      .then(res => setResumoFinanceiro(res.data))
      .catch(err => toast.error(getApiErrorMessage(err, 'Não foi possível carregar os totais financeiros.')));
  }, []);

  useEffect(() => {
    dashboardService.getStatusCounts()
      .then(res => setStatusData(res.data))
      .catch(err => toast.error(getApiErrorMessage(err, 'Não foi possível carregar estatísticas do dashboard.')));
  }, []);

  useEffect(() => {
    dashboardService.getFeesByMonth()
      .then(res => setFeesByMonth(res.data))
      .catch(err => toast.error(getApiErrorMessage(err, 'Não foi possível carregar gráfico financeiro.')));
  }, []);

  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-date">{formatCurrentDate()}</p>
      </div>

      <section className="summary-section">
        <h2 className="summary-title">Resumo Geral</h2>

        {loading && <Loading />}
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
        {resumoFinanceiro && (
          <div className="summary-grid">
            {CARDS_FINANCEIROS.map(({ key, label, Icon, color }) => (
              <div key={key} className={`summary-card summary-card--${color}`}>
                <div className="card-icon">
                  <Icon size={22} />
                </div>
                <p className="card-label">{label}</p>
                <p className="card-value">{formatCurrency(resumoFinanceiro[key] ?? 0)}</p>
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
        <Suspense fallback={<Loading />}>
          <DashboardCharts statusData={statusData} feesByMonth={feesByMonth} />
        </Suspense>
      </section>
    </div>
  );
}

export default DashboardHomePage;
