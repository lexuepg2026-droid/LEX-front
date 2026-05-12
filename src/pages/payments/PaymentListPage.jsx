import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import paymentService from '../../api/paymentService';
import '../clients/ClientPage.css';

const FORMA_LABEL = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  boleto: 'Boleto',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  transferencia: 'Transferência',
};

function PaymentListPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentService.listPayments({ page: 1, limit: 20 })
      .then(res => setPayments(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar pagamentos.'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (id) => {
    if (!window.confirm('Remover este pagamento?')) return;
    try {
      await paymentService.removePayment(id);
      setPayments(payments.filter(p => p._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover pagamento.');
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
        <h1 className="page-title" style={{ border: 'none', marginBottom: 0 }}>Pagamentos</h1>
        <Link to="/dashboard/pagamentos/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Novo Pagamento
        </Link>
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Parcela</th>
              <th>Valor Pago</th>
              <th>Data</th>
              <th>Forma</th>
              <th>Observações</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan="6">Nenhum pagamento cadastrado.</td></tr>
            ) : (
              payments.map(p => (
                <tr key={p._id}>
                  <td>Parcela {p.installmentId?.numeroParcela ?? '—'}</td>
                  <td>{formatValue(p.valorPago)}</td>
                  <td>{formatDate(p.dataPagamento)}</td>
                  <td>{FORMA_LABEL[p.formaPagamento] || p.formaPagamento}</td>
                  <td>{p.observacoes || '—'}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/pagamentos/editar/${p._id}`} className="btn-action btn-edit">
                      Editar
                    </Link>
                    <button onClick={() => handleRemove(p._id)} className="btn-action btn-delete">
                      Remover
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

export default PaymentListPage;
