import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import '../clients/ClientPage.css';

const STATUS_LABEL = {
  pendente: 'Pendente',
  pago: 'Pago',
  vencido: 'Vencido',
};

function InstallmentListPage() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    installmentService.listInstallments()
      .then(res => setInstallments(res.data))
      .catch(() => setError('Falha ao buscar parcelas.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remover esta parcela?')) return;
    try {
      await installmentService.deleteInstallment(id);
      setInstallments(installments.filter(i => i._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover parcela.');
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';

  const formatValue = (value) =>
    value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="cliente-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ border: 'none', marginBottom: 0 }}>Parcelas</h1>
        <Link to="/dashboard/parcelas/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Nova Parcela
        </Link>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Honorário</th>
              <th>Nº Parcela</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Status</th>
              <th>Pagamento</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {installments.length === 0 ? (
              <tr><td colSpan="7">Nenhuma parcela cadastrada.</td></tr>
            ) : (
              installments.map(inst => (
                <tr key={inst._id}>
                  <td>{inst.feeId?.descricao || '—'}</td>
                  <td>{inst.numeroParcela}</td>
                  <td>{formatValue(inst.valor)}</td>
                  <td>{formatDate(inst.dataVencimento)}</td>
                  <td>{STATUS_LABEL[inst.status] || inst.status}</td>
                  <td>{formatDate(inst.dataPagamento)}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/parcelas/editar/${inst._id}`} className="btn-action btn-edit">
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(inst._id)} className="btn-action btn-delete">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default InstallmentListPage;
