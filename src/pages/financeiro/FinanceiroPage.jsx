import React from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE } from '../../offline/offlineMessages';
import FeeListPage from '../fees/FeeListPage';
import InstallmentListPage from '../installments/InstallmentListPage';
import PaymentListPage from '../payments/PaymentListPage';
import financeiroService from '../../api/financeiroService';
import { formatCurrency } from '../../utils/formatters';
import './FinanceiroPage.css';

const SECTIONS = [
  { title: 'Honorários (Contratos)', actionLabel: '+ Novo Honorário',      actionTo: '/dashboard/honorarios/novo', Component: FeeListPage         },
  { title: 'Cobranças previstas',    actionLabel: '+ Nova Cobrança',        actionTo: '/dashboard/parcelas/novo',   Component: InstallmentListPage  },
  { title: 'Recebimentos',           actionLabel: '+ Registrar Recebimento', actionTo: '/dashboard/pagamentos/novo', Component: PaymentListPage      },
];

function FinanceiroPage() {
  const online = useOnlineStatus();

  // DEC-058 (F-5a): o resumo é o número que ela olha primeiro, e é o que mais
  // não pode aparecer sem idade — "número financeiro velho servido sem aviso
  // faria a advogada planejar o mês com o dado do mês passado" é a frase que o
  // `sw.js` já carregava desde a Fase 4.5, sobre a mesma tela.
  //
  // A mensagem de erro continua vindo do helper (dentro do hook): era sempre
  // "indisponível no momento", inclusive em 500 e em queda de rede, e a causa
  // real não chegava à tela.
  const {
    data: resumo, loading: loadingSummary, error: summaryError, updatedAt, fromCache
  } = useCachedResource({
    resource: 'financeSummary',
    fetcher: () => financeiroService.getResumo().then((res) => res.data),
    fallbackError: 'Resumo financeiro indisponível no momento.'
  });

  const summary = resumo
    ? {
        valorContratado: resumo.valorContratado ?? 0,
        recebido: resumo.recebido ?? 0,
        pendente: resumo.pendente ?? 0,
        qtdVencidas: resumo.vencidas ?? 0,
      }
    : null;

  return (
    <div className="module-container">
      <PageHeader title="Financeiro" />

      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}

      {/* A faixa de totais tinha três estados no código e só dois na tela: o
          `loadingSummary` existia e não desenhava nada, então os quatro
          cartões apareciam de repente. Padrão do projeto é `<Loading />`
          (varredura B.5 da Fase 4.3). */}
      {loadingSummary && <Loading />}

      {!loadingSummary && summaryError && (
        <div className="financeiro-summary financeiro-summary--unavailable">
          <p className="financeiro-summary__error">{summaryError}</p>
        </div>
      )}

      {!loadingSummary && !summaryError && summary && (
        <div className="financeiro-summary">
          <div className="financeiro-summary-card">
            <p className="financeiro-summary-card__label">Valor contratado</p>
            <p className="financeiro-summary-card__value">{formatCurrency(summary.valorContratado)}</p>
          </div>
          <div className="financeiro-summary-card">
            <p className="financeiro-summary-card__label">Recebido</p>
            <p className="financeiro-summary-card__value financeiro-summary-card__value--success">
              {formatCurrency(summary.recebido)}
            </p>
          </div>
          <div className="financeiro-summary-card">
            <p className="financeiro-summary-card__label">Pendente</p>
            <p className="financeiro-summary-card__value financeiro-summary-card__value--warning">
              {formatCurrency(summary.pendente)}
            </p>
          </div>
          <div className="financeiro-summary-card">
            <p className="financeiro-summary-card__label">Cobranças vencidas</p>
            <p className={`financeiro-summary-card__value${summary.qtdVencidas > 0 ? ' financeiro-summary-card__value--danger' : ''}`}>
              {summary.qtdVencidas}
            </p>
          </div>
        </div>
      )}

      {SECTIONS.map(({ title, actionLabel, actionTo, Component }) => (
        <section key={title} className="financeiro-section">
          <div className="financeiro-section-header">
            <h2 className="financeiro-section-title">{title}</h2>
            {/* As três seções têm o botão de criar no próprio cabeçalho. Sem
                sinal eles seguem o mesmo padrão do `PageHeader`: continuam na
                tela, anunciados como desabilitados, com o motivo ao lado. */}
            {online ? (
              <Link to={actionTo} className="ui-btn ui-btn--primary ui-btn--md">
                {actionLabel}
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className="ui-btn ui-btn--primary ui-btn--md"
                  aria-disabled="true"
                  onClick={(e) => e.preventDefault()}
                >
                  {actionLabel}
                </button>
                <span className="financeiro-section-motivo">{MENSAGEM_ESCRITA_OFFLINE}</span>
              </>
            )}
          </div>
          <Component embedded />
        </section>
      ))}
    </div>
  );
}

export default FinanceiroPage;
