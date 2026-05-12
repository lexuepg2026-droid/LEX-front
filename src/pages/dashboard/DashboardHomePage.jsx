import React, { useState, useEffect } from 'react';
import dashboardService from '../../api/dashboardService';
import './DashboardPage.css';

const CARDS = [
  { key: 'processosAtivos',       label: 'Processos Ativos',       format: 'number'   },
  { key: 'clientesCadastrados',   label: 'Clientes Cadastrados',   format: 'number'   },
  { key: 'honorariosAReceber',    label: 'Honorários a Receber',   format: 'number'   },
  { key: 'parcelasVencidas',      label: 'Parcelas Vencidas',      format: 'number'   },
  { key: 'documentosCadastrados', label: 'Documentos Cadastrados', format: 'number'   },
  { key: 'pagamentosRecebidosMes',label: 'Pagamentos do Mês',      format: 'currency' },
];

const formatValue = (value, format) => {
  if (value === undefined || value === null) return '—';
  if (format === 'currency') {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return value.toLocaleString('pt-BR');
};

function DashboardHomePage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardService.getDashboardSummary()
      .then(res => setSummary(res.data))
      .catch(() => setError('Falha ao carregar o resumo.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="page-title">Bem-vindo ao Sistema LEX</h1>

      <section className="summary-section">
        <h2 className="summary-title">Resumo Geral</h2>

        {loading && <p>Carregando...</p>}
        {error && <p className="error-message">{error}</p>}

        {summary && (
          <div className="summary-grid">
            {CARDS.map(({ key, label, format }) => (
              <div key={key} className="summary-card">
                <p className="card-label">{label}</p>
                <p className="card-value">{formatValue(summary[key], format)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default DashboardHomePage;
