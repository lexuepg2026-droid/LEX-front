import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import '../../styles/modules.css';

function InstallmentListPage() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  useEffect(() => {
    installmentService.listInstallments()
      .then(res => setInstallments(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar parcelas.'))
      .finally(() => setLoading(false));
  }, []);

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await installmentService.deleteInstallment(id);
      setInstallments(installments.filter(i => i._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover parcela.');
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="module-container">
      <PageHeader title="Parcelas" actionLabel="+ Nova Parcela" actionTo="/dashboard/parcelas/novo" />
      {error && <p className="error-message">{error}</p>}

      {installments.length === 0 ? (
        <EmptyState title="Nenhuma parcela cadastrada." description="Clique em Nova Parcela para começar." />
      ) : (
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
              {installments.map(inst => (
                <tr key={inst._id}>
                  <td>{inst.feeId?.descricao || '—'}</td>
                  <td>{inst.numeroParcela}</td>
                  <td>{formatCurrency(inst.valor)}</td>
                  <td>{formatDate(inst.dataVencimento)}</td>
                  <td><StatusBadge status={inst.status} /></td>
                  <td>{formatDate(inst.dataPagamento)}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/parcelas/editar/${inst._id}`} className="btn-action btn-edit">Editar</Link>
                    <button onClick={() => confirmDelete(inst._id)} className="btn-action btn-delete">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.open}
        title="Remover parcela"
        message="Tem certeza que deseja remover esta parcela? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </div>
  );
}

export default InstallmentListPage;
