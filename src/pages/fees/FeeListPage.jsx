import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import feeService from '../../api/feeService';
import '../clients/ClientPage.css';

function FeeListPage() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    feeService.listFees()
      .then(res => setFees(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar honorários.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este honorário?')) return;
    try {
      await feeService.deleteFee(id);
      setFees(fees.filter(f => f._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover honorário.');
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
        <h1 className="page-title" style={{ border: 'none', marginBottom: 0 }}>Honorários</h1>
        <Link to="/dashboard/honorarios/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Novo Honorário
        </Link>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Processo</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Tipo</th>
              <th>Status</th>
              <th>Vencimento</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr><td colSpan="7">Nenhum honorário cadastrado.</td></tr>
            ) : (
              fees.map(fee => (
                <tr key={fee._id}>
                  <td>{fee.processoId?.titulo ?? '—'}</td>
                  <td>{fee.descricao}</td>
                  <td>{formatValue(fee.valor)}</td>
                  <td>{fee.tipo}</td>
                  <td>{fee.status}</td>
                  <td>{formatDate(fee.dataVencimento)}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/honorarios/editar/${fee._id}`} className="btn-action btn-edit">
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(fee._id)} className="btn-action btn-delete">
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

export default FeeListPage;
