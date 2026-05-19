import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
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
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    financeiroService.getResumo()
      .then(res => {
        const d = res.data;
        setSummary({
          valorContratado: d.valorContratado ?? 0,
          recebido: d.recebido ?? 0,
          pendente: d.pendente ?? 0,
          qtdVencidas: d.vencidas ?? 0,
        });
      })
      .catch(() => setSummaryError(true))
      .finally(() => setLoadingSummary(false));
  }, []);

  return (
    <div className="module-container">
      <PageHeader title="Financeiro" />

      {!loadingSummary && summaryError && (
        <div className="financeiro-summary financeiro-summary--unavailable">
          <p className="financeiro-summary__error">Resumo financeiro indisponível no momento.</p>
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
            <Link to={actionTo} className="ui-btn ui-btn--primary ui-btn--md">
              {actionLabel}
            </Link>
          </div>
          <Component embedded />
        </section>
      ))}
    </div>
  );
}

export default FinanceiroPage;
