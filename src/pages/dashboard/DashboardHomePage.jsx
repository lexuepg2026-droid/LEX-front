import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale, Users, FileText, AlertCircle, FolderOpen, BellRing,
  HandCoins, Wallet, CalendarClock, CalendarCheck,
} from 'lucide-react';
import dashboardService from '../../api/dashboardService';
import financeiroService from '../../api/financeiroService';
import installmentService from '../../api/installmentService';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/common/Loading';
import { formatCurrency, formatDate, formatMonthKey } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
// `link-interno` (F-1b) mora em `styles/modules.css`, junto das demais
// classes compartilhadas das telas de módulo.
import '../../styles/modules.css';
import './DashboardPage.css';
import { rotuloDaParcela } from '../../components/financeiro/installmentLabel';

const DashboardCharts = lazy(() => import('./DashboardCharts'));

// ── Cartões de contagem ────────────────────────────────────────────────────
//
// Dois saíram desta lista na Fase 4.3, e nos dois casos porque o mesmo número
// passou a ser dito melhor em outro lugar:
//
// - **"Pagamentos do Mês"** virou "Recebido em {mês}", na faixa de dinheiro.
//   Era o cartão que abria esta fase: exibia "R$ 0,00" com o seed inteiro
//   quitado em meses passados, e não havia como distinguir "não entrou nada
//   neste mês" de "o número quebrou". O rótulo com o mês resolve a ambiguidade
//   na própria frase.
// - **"Parcelas Vencidas"** foi absorvido pelo cartão "Total vencido", que traz
//   o VALOR e a contagem juntos. Manter os dois deixaria dois números do mesmo
//   assunto lado a lado, vindos de rotas diferentes e livres para divergir.
const CARDS = [
  { key: 'processosAtivos',        label: 'Processos Ativos',       Icon: Scale,      color: 'primary' },
  { key: 'clientesCadastrados',    label: 'Clientes Cadastrados',   Icon: Users,      color: 'primary' },
  { key: 'honorariosAReceber',     label: 'Honorários a Receber',   Icon: FileText,   color: 'warning' },
  { key: 'documentosCadastrados',  label: 'Documentos Cadastrados', Icon: FolderOpen, color: 'neutral' },
  // `info` e não `success`: é coisa a fazer, não resultado alcançado. E não é
  // `warning`: confirmação chegando é o sistema funcionando, nada está errado.
  { key: 'confirmacoesNaoVistas',  label: 'Confirmações Novas',     Icon: BellRing,   color: 'info'    },
];

// ── Indicadores em dinheiro ────────────────────────────────────────────────
//
// Todos de `GET /api/financeiro/resumo`. A Fase 4.2 registrou que o backend
// não expunha recorte mensal nem valor de vencido, e rotulou o que tinha com
// honestidade ("Em Aberto (total)"). A Fase 4.3 cumpriu a DEC-028(d) no
// backend, e os rótulos agora podem dizer o que a advogada perguntou.
//
// **O mês do rótulo vem do servidor** (`mesReferencia`), e não de
// `new Date()` aqui. Os dois quase sempre concordam — e no dia em que não
// concordarem, o cartão estaria dizendo "agosto" sobre o número de julho.
const CARDS_DO_MES = [
  {
    key: 'aReceberNoMes',
    label: (mes) => `A receber em ${mes}`,
    Icon: CalendarClock,
    color: 'warning',
    vazio: 'nada a vencer no mês',
  },
  {
    key: 'recebidoNoMes',
    label: (mes) => `Recebido em ${mes}`,
    Icon: CalendarCheck,
    color: 'success',
    vazio: 'nenhum recebimento no mês',
  },
];

const CARDS_ACUMULADOS = [
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

// O que a advogada ainda tem a receber NESTA parcela. A parcela parcialmente
// paga é o caso que o valor cheio erraria: 4.000 contratados com 1.000 já
// recebidos precisam aparecer como 3.000 na lista de cobranças urgentes.
const emAbertoDaParcela = (inst) =>
  Math.max(0, Number(inst.valor || 0) - Number(inst.valorPago || 0));

const pluralParcelas = (n) => (n === 1 ? '1 parcela vencida' : `${n} parcelas vencidas`);

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

  // Falha aqui não derruba o painel: os cartões de contagem e os gráficos
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

  const mesRotulo = formatMonthKey(resumoFinanceiro?.mesReferencia);
  const proximos = resumoFinanceiro?.proximosVencimentos ?? [];
  const vencidas = resumoFinanceiro?.vencidas ?? 0;

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
            {CARDS.map(({ key, label, Icon, color }) => (
              <div key={key} className={`summary-card summary-card--${color}`}>
                <div className="card-icon">
                  <Icon size={22} />
                </div>
                <p className="card-label">{label}</p>
                <p className="card-value">
                  {summary[key] != null ? summary[key].toLocaleString('pt-BR') : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {resumoFinanceiro && (
        <section className="summary-section">
          <h2 className="summary-title">
            {mesRotulo === '—' ? 'No mês' : `No mês — ${mesRotulo}`}
          </h2>

          <div className="summary-grid">
            {CARDS_DO_MES.map(({ key, label, Icon, color, vazio }) => {
              const valor = resumoFinanceiro[key] ?? 0;
              return (
                <div key={key} className={`summary-card summary-card--${color}`}>
                  <div className="card-icon">
                    <Icon size={22} />
                  </div>
                  <p className="card-label">{label(mesRotulo)}</p>
                  <p className="card-value">{formatCurrency(valor)}</p>
                  {/* Zero REAL diz por extenso que é zero. Era exatamente esta
                      frase que faltava quando "Pagamentos do mês: R$ 0,00"
                      parecia defeito e era só o seed com tudo quitado antes. */}
                  {valor === 0 && <p className="card-note">{vazio}</p>}
                </div>
              );
            })}

            {/* Valor e contagem no MESMO cartão: são a mesma pergunta em duas
                unidades, e separá-los foi o que criou dois números do mesmo
                assunto no painel antigo. */}
            <div className="summary-card summary-card--danger">
              <div className="card-icon">
                <AlertCircle size={22} />
              </div>
              <p className="card-label">Total vencido</p>
              <p className="card-value">{formatCurrency(resumoFinanceiro.valorVencido ?? 0)}</p>
              <p className="card-note">
                {vencidas > 0 ? pluralParcelas(vencidas) : 'nenhuma parcela vencida'}
              </p>
            </div>
          </div>
        </section>
      )}

      {resumoFinanceiro && (
        <section className="summary-section">
          <h2 className="summary-title">Acumulado do escritório</h2>
          <div className="summary-grid">
            {CARDS_ACUMULADOS.map(({ key, label, Icon, color }) => (
              <div key={key} className={`summary-card summary-card--${color}`}>
                <div className="card-icon">
                  <Icon size={22} />
                </div>
                <p className="card-label">{label}</p>
                <p className="card-value">{formatCurrency(resumoFinanceiro[key] ?? 0)}</p>
              </div>
            ))}
          </div>

          {/* ── O terceiro termo, dito em uma linha (F-1a) ──────────────────
              `pendente` passou a ser `contratado − recebido − saldoAdiantado`.
              Sem esta nota, a advogada faz a subtração dos dois cartões de cima
              e não chega ao terceiro — e a conclusão natural é que o painel
              está errado, não que existe um valor a mais na conta.

              Nota condicional, e não um quarto cartão: `saldoAdiantado` é zero
              na maioria dos escritórios, e um cartão permanente em R$ 0,00
              ocuparia o lugar de informação real. Redesenho de painel é F-1b. */}
          {(resumoFinanceiro.saldoAdiantado ?? 0) > 0 && (
            <p className="summary-nota">
              Inclui {formatCurrency(resumoFinanceiro.saldoAdiantado)} recebidos
              como adiantamento, ainda sem parcela correspondente. Esse valor já
              está abatido do total em aberto.
            </p>
          )}
        </section>
      )}

      {/* ── Próximos vencimentos (DEC-028d) ───────────────────────────────────
          As cinco parcelas em aberto que vencem mais cedo, de hoje em diante.
          Vêm prontas do backend, com a descrição do honorário e o número do
          processo — a tela não junta nada. */}
      {resumoFinanceiro && (
        <section className="upcoming-section">
          <h2 className="summary-title">Próximos vencimentos</h2>

          {proximos.length === 0 ? (
            <EmptyState
              title="Nenhum vencimento à frente."
              description="Não há parcela em aberto com vencimento de hoje em diante."
            />
          ) : (
            <ul className="upcoming-list">
              {proximos.map(parcela => (
                <li key={parcela._id} className="upcoming-item">
                  <div className="upcoming-info">
                    {/* ── DOIS destinos, e não um (F-1b) ─────────────────
                        A linha inteira levava à parcela, e o nome do honorário
                        era só texto dentro do link. Agora o NOME leva à página
                        da cobrança e "Parcela N" continua levando à parcela.
                        Não dá para aninhar um link no outro — HTML inválido —,
                        então são dois irmãos. */}
                    <span className="upcoming-desc">
                      {parcela.honorarioId ? (
                        <Link
                          to={`/dashboard/honorarios/${parcela.honorarioId}`}
                          className="link-interno"
                        >
                          {parcela.descricaoHonorario || 'Honorário'}
                        </Link>
                      ) : (
                        parcela.descricaoHonorario || 'Honorário'
                      )}
                      {' — '}
                      <Link
                        to={`/dashboard/parcelas/editar/${parcela._id}`}
                        className="upcoming-link"
                      >
                        {rotuloDaParcela({ numeroParcela: parcela.numeroParcela, totalParcelas: parcela.totalParcelas ?? null })}
                      </Link>
                    </span>
                    <span className="upcoming-due">
                      {formatDate(parcela.dataVencimento)}
                      {parcela.numeroProcesso ? ` · ${parcela.numeroProcesso}` : ''}
                    </span>
                  </div>
                  <div className="upcoming-right">
                    {/* O EM ABERTO, e não o valor da parcela: numa parcela com
                        pagamento parcial os dois números são diferentes, e o
                        que ela vai cobrar é este. */}
                    <span className="upcoming-value">{formatCurrency(parcela.emAberto)}</span>
                    <StatusBadge status={parcela.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
                  {/* Mesma divisão do bloco acima: o nome leva à cobrança,
                      "Parcela N" leva à parcela. */}
                  <span className="upcoming-desc">
                    {inst.feeId?._id ? (
                      <Link
                        to={`/dashboard/honorarios/${inst.feeId._id}`}
                        className="link-interno"
                      >
                        {inst.feeId.descricao || 'Honorário'}
                      </Link>
                    ) : (
                      inst.feeId?.descricao || 'Honorário'
                    )}
                    {' — '}
                    <Link
                      to={`/dashboard/parcelas/editar/${inst._id}`}
                      className="upcoming-link"
                    >
                      {rotuloDaParcela({ numeroParcela: inst.numeroParcela, totalParcelas: inst.totalParcelas ?? null })}
                    </Link>
                  </span>
                  <span className="upcoming-due">{daysUntilLabel(inst.dataVencimento)}</span>
                </div>
                <div className="upcoming-right">
                  <span className="upcoming-value">{formatCurrency(emAbertoDaParcela(inst))}</span>
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
