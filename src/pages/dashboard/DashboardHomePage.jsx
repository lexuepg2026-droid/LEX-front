import React, { lazy, Suspense, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Scale, Users, FileText, AlertCircle, FolderOpen, BellRing,
  HandCoins, Wallet, CalendarClock, CalendarCheck,
} from 'lucide-react';
import dashboardService from '../../api/dashboardService';
import financeiroService from '../../api/financeiroService';
import installmentService from '../../api/installmentService';
import calendarService from '../../api/calendarService';
import BlocoDoPainel from '../../components/dashboard/BlocoDoPainel';
import {
  contarParcelasVencidas,
  parcelasVencidasDoAviso,
  lerBlocosFechados,
  gravarBlocosFechados,
} from '../../utils/painel';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Loading from '../../components/common/Loading';
import { formatCurrency, formatDate, formatMonthKey } from '../../utils/formatters';
import { destinoDoItem } from '../../utils/calendarLabels';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
// `link-interno` (F-1b) mora em `styles/modules.css`, junto das demais
// classes compartilhadas das telas de módulo.
import '../../styles/modules.css';
// `Button.css` importado EXPLICITAMENTE: as ações dos blocos usam `.ui-btn`, e
// esta tela não monta o `PageHeader`, que é quem normalmente traz essas regras.
// Sem este import os botões de ação sairiam sem estilo nenhum — o defeito que a
// varredura de classes da Fase 2E.1 existe para pegar.
import '../../components/ui/Button.css';
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

  // ── DEC-057 / Parte 5 — o painel lê o vencido DA MESMA FONTE que o sino ──
  // `GET /api/calendar/avisos` é a requisição que o sino já faz. O painel não
  // conta vencidas por conta própria: ver `utils/painel.js` para por que uma
  // fonte só, e para o defeito que o passo 135 pegou quando havia duas.
  const [avisos, setAvisos] = useState(null);

  // Blocos colapsáveis, com a escolha lembrada por navegador. O que exige
  // ATENÇÃO nasce aberto; o que é ESTATÍSTICA nasce fechado — a pergunta que
  // a advogada faz ao abrir o sistema é "o que eu preciso fazer hoje", e a
  // estatística responde outra.
  const [fechados, setFechados] = useState(lerBlocosFechados);

  const alternarBloco = (chave) => {
    setFechados((prev) => {
      const proximo = { ...prev, [chave]: !prev[chave] };
      gravarBlocosFechados(proximo);
      return proximo;
    });
  };

  // `padraoFechado` é o estado inicial do bloco; a preferência gravada, quando
  // existe, manda. `?? padraoFechado` e não `||`: `false` gravado é escolha
  // deliberada de abrir, e `||` a descartaria.
  const estaAberto = (chave, padraoFechado = false) =>
    !(fechados[chave] ?? padraoFechado);

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

        // **Só o que está POR VENCER.** As vencidas saíram daqui na F-4: elas
        // vêm do sino, que é a fonte única da contagem (ver `utils/painel.js`).
        // Deixá-las nos dois lugares era o segundo caminho para o mesmo número.
        const urgent = all
          .filter(inst => {
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

  // Falhar aqui não derruba o painel: o bloco de atenção some, o resto fica.
  useEffect(() => {
    calendarService.getAvisos()
      .then(res => setAvisos(res.data))
      .catch(err => toast.error(getApiErrorMessage(err, 'Não foi possível carregar os avisos.')));
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
  // Do sino, não do resumo financeiro — uma fonte só para este número.
  const vencidas = contarParcelasVencidas(avisos);
  const parcelasVencidas = parcelasVencidasDoAviso(avisos);

  // ── A ordem dos blocos, e por que ela é esta ────────────────────────────
  // Atenção primeiro, estatística depois. Os três primeiros nascem abertos
  // porque respondem "o que eu preciso fazer hoje"; os três últimos nascem
  // fechados porque respondem "como está o escritório" — que é uma pergunta
  // boa, só não é a da primeira olhada do dia.
  return (
    <div>
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-date">{formatCurrentDate()}</p>
      </div>

      {/* ══ 1. PRECISA DE ATENÇÃO ═══════════════════════════════════════════
          As vencidas vêm do sino (`/calendar/avisos`), e é a MESMA fonte que
          o badge do cabeçalho conta. Os dois números da mesma coisa na mesma
          tela não podem divergir — ver `utils/painel.js`. */}
      <BlocoDoPainel
        chave="atencao"
        titulo="Precisa de atenção"
        Icone={AlertCircle}
        contagem={vencidas + upcoming.length}
        aberto={estaAberto('atencao')}
        aoAlternar={alternarBloco}
        acao={
          <Link to="/dashboard/pagamentos/novo" className="ui-btn ui-btn--primary ui-btn--sm">
            <HandCoins size={16} aria-hidden="true" />
            Registrar pagamento
          </Link>
        }
      >
        {vencidas === 0 && upcoming.length === 0 ? (
          <EmptyState
            title="Nada vencido nem vencendo."
            description="Nenhuma parcela vencida, e nenhuma vence nos próximos 7 dias."
          />
        ) : (
          <>
            {vencidas > 0 && (
              <>
                <h3 className="bloco__subtitulo">{pluralParcelas(vencidas)}</h3>
                <ul className="upcoming-list">
                  {parcelasVencidas.map((item) => {
                    const destino = destinoDoItem(item);
                    return (
                      <li key={`vencida-${item._id}`} className="upcoming-item">
                        <div className="upcoming-info">
                          <span className="upcoming-desc">
                            {destino ? (
                              <Link to={destino} className="link-interno">{item.titulo}</Link>
                            ) : (
                              item.titulo
                            )}
                          </span>
                          <span className="upcoming-due">{formatDate(item.data)}</span>
                        </div>
                        <div className="upcoming-right">
                          {item.valor != null && (
                            <span className="upcoming-value">{formatCurrency(item.valor)}</span>
                          )}
                          <StatusBadge status="vencido" />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            {upcoming.length > 0 && (
              <>
                <h3 className="bloco__subtitulo">Vencem nos próximos 7 dias</h3>
                <ul className="upcoming-list">
                  {upcoming.map(inst => (
                    <li key={inst._id} className="upcoming-item">
                      <div className="upcoming-info">
                        {/* O nome leva à cobrança, "Parcela N" leva à parcela. */}
                        <span className="upcoming-desc">
                          {inst.feeId?._id ? (
                            <Link to={`/dashboard/honorarios/${inst.feeId._id}`} className="link-interno">
                              {inst.feeId.descricao || 'Honorário'}
                            </Link>
                          ) : (
                            inst.feeId?.descricao || 'Honorário'
                          )}
                          {' — '}
                          <Link to={`/dashboard/parcelas/editar/${inst._id}`} className="upcoming-link">
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
              </>
            )}
          </>
        )}
      </BlocoDoPainel>

      {/* ══ 2. NO MÊS ═══════════════════════════════════════════════════════ */}
      {resumoFinanceiro && (
        <BlocoDoPainel
          chave="mes"
          titulo={mesRotulo === '—' ? 'No mês' : `No mês — ${mesRotulo}`}
          Icone={CalendarClock}
          aberto={estaAberto('mes')}
          aoAlternar={alternarBloco}
          acao={
            <Link to="/dashboard/parcelas/novo" className="ui-btn ui-btn--secondary ui-btn--sm">
              Nova parcela
            </Link>
          }
        >
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
                  {/* Zero REAL diz por extenso que é zero. */}
                  {valor === 0 && <p className="card-note">{vazio}</p>}
                </div>
              );
            })}

            {/* Valor e contagem no MESMO cartão. O valor vem do resumo
                financeiro (o sino não expõe dinheiro); a CONTAGEM vem do sino,
                que é a fonte única deste número. */}
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
        </BlocoDoPainel>
      )}

      {/* ══ 3. PRÓXIMOS VENCIMENTOS ═════════════════════════════════════════ */}
      {resumoFinanceiro && (
        <BlocoDoPainel
          chave="proximos"
          titulo="Próximos vencimentos"
          Icone={CalendarCheck}
          aberto={estaAberto('proximos')}
          aoAlternar={alternarBloco}
          acao={
            <Link to="/dashboard/honorarios" className="ui-btn ui-btn--secondary ui-btn--sm">
              Ver honorários
            </Link>
          }
        >
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
                    <span className="upcoming-desc">
                      {parcela.honorarioId ? (
                        <Link to={`/dashboard/honorarios/${parcela.honorarioId}`} className="link-interno">
                          {parcela.descricaoHonorario || 'Honorário'}
                        </Link>
                      ) : (
                        parcela.descricaoHonorario || 'Honorário'
                      )}
                      {' — '}
                      <Link to={`/dashboard/parcelas/editar/${parcela._id}`} className="upcoming-link">
                        {rotuloDaParcela({ numeroParcela: parcela.numeroParcela, totalParcelas: parcela.totalParcelas ?? null })}
                      </Link>
                    </span>
                    <span className="upcoming-due">
                      {formatDate(parcela.dataVencimento)}
                      {parcela.numeroProcesso ? ` · ${parcela.numeroProcesso}` : ''}
                    </span>
                  </div>
                  <div className="upcoming-right">
                    {/* O EM ABERTO, e não o valor da parcela. */}
                    <span className="upcoming-value">{formatCurrency(parcela.emAberto)}</span>
                    <StatusBadge status={parcela.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </BlocoDoPainel>
      )}

      {/* ══ 4. ACUMULADO — estatística, nasce FECHADO ═══════════════════════ */}
      {resumoFinanceiro && (
        <BlocoDoPainel
          chave="acumulado"
          titulo="Acumulado do escritório"
          Icone={Wallet}
          aberto={estaAberto('acumulado', true)}
          aoAlternar={alternarBloco}
        >
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

          {/* O terceiro termo, dito em uma linha (F-1a): `pendente` é
              `contratado − recebido − saldoAdiantado`. Sem esta nota a
              subtração dos dois cartões de cima não chega ao terceiro. */}
          {(resumoFinanceiro.saldoAdiantado ?? 0) > 0 && (
            <p className="summary-nota">
              Inclui {formatCurrency(resumoFinanceiro.saldoAdiantado)} recebidos
              como adiantamento, ainda sem parcela correspondente. Esse valor já
              está abatido do total em aberto.
            </p>
          )}
        </BlocoDoPainel>
      )}

      {/* ══ 5. RESUMO GERAL — estatística, nasce FECHADO ════════════════════ */}
      <BlocoDoPainel
        chave="resumo"
        titulo="Resumo Geral"
        Icone={Scale}
        aberto={estaAberto('resumo', true)}
        aoAlternar={alternarBloco}
        acao={
          <Link to="/dashboard/processos" className="ui-btn ui-btn--secondary ui-btn--sm">
            Ver processos
          </Link>
        }
      >
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
      </BlocoDoPainel>

      {/* ══ 6. GRÁFICOS — estatística, nasce FECHADO ════════════════════════
          Fechado por padrão também poupa o chunk: `DashboardCharts` é `lazy` e
          o bloco desmonta o conteúdo, então quem não abre não baixa os 386 KB
          do recharts. */}
      <BlocoDoPainel
        chave="graficos"
        titulo="Distribuição por Status"
        Icone={FileText}
        aberto={estaAberto('graficos', true)}
        aoAlternar={alternarBloco}
      >
        <Suspense fallback={<Loading />}>
          <DashboardCharts statusData={statusData} feesByMonth={feesByMonth} />
        </Suspense>
      </BlocoDoPainel>
    </div>
  );
}

export default DashboardHomePage;
