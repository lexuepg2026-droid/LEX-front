import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import paymentService from '../../api/paymentService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import '../../styles/modules.css';

const FORMA_LABEL = {
  dinheiro:       'Dinheiro',
  pix:            'Pix',
  boleto:         'Boleto',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito:  'Cartão de Débito',
  transferencia:  'Transferência',
};

function PaymentListPage({ embedded = false }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  useEffect(() => {
    paymentService.listPayments({ page: 1, limit: 20 })
      .then(res => setPayments(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar pagamentos.'))
      .finally(() => setLoading(false));
  }, []);

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleRemove = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await paymentService.removePayment(id);
      setPayments(payments.filter(p => p._id !== id));
      toast.success('Pagamento removido com sucesso.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao remover pagamento.');
    }
  };

  if (loading) return <p>Carregando...</p>;

  const body = (
    <>
      {error && <p className="error-message">{error}</p>}

      {payments.length === 0 ? (
        <EmptyState
          title="Nenhum recebimento registrado"
          description="Registre os recebimentos para acompanhar os pagamentos das cobranças previstas."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parcela</th>
                <th>Honorário</th>
                <th>Processo</th>
                <th>Valor Pago</th>
                <th>Data</th>
                <th>Forma</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id}>
                  <td>Parcela {p.installmentId?.numeroParcela ?? '—'}</td>
                  <td>{p.installmentId?.feeId?.descricao ?? '—'}</td>
                  <td>{p.installmentId?.feeId?.processoId?.titulo ?? '—'}</td>
                  <td>{formatCurrency(p.valorPago)}</td>
                  <td>{formatDate(p.dataPagamento)}</td>
                  <td>{FORMA_LABEL[p.formaPagamento] || p.formaPagamento}</td>
                  <td>{p.observacoes || '—'}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/pagamentos/editar/${p._id}`} className="btn-action btn-edit">Editar</Link>
                    <button onClick={() => confirmDelete(p._id)} className="btn-action btn-delete">Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.open}
        title="Remover pagamento"
        message="Tem certeza que deseja remover este pagamento? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </>
  );

  if (embedded) return body;

  return (
    <div className="module-container">
      <PageHeader title="Pagamentos" actionLabel="+ Novo Pagamento" actionTo="/dashboard/pagamentos/novo" />
      {body}
    </div>
  );
}

export default PaymentListPage;
