import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import '../../styles/modules.css';

function InstallmentListPage({ embedded = false }) {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId') || undefined;
  const [statusFiltro, setStatusFiltro] = useState('');

  useEffect(() => {
    setLoading(true);
    installmentService.listInstallments({ processoId, status: statusFiltro || undefined })
      .then(res => setInstallments(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar parcelas.'))
      .finally(() => setLoading(false));
  }, [processoId, statusFiltro]);

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await installmentService.deleteInstallment(id);
      setInstallments(installments.filter(i => i._id !== id));
      toast.success('Parcela removida com sucesso.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao remover parcela.');
    }
  };

  if (loading) return <Loading />;

  const body = (
    <>
      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="vencido">Vencido</option>
          <option value="parcial">Parcial</option>
        </select>
      </div>

      {installments.length === 0 ? (
        <EmptyState
          title="Nenhuma cobrança encontrada"
          description="Tente ajustar os filtros ou crie uma nova parcela."
        />
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
    </>
  );

  if (embedded) return body;

  return (
    <div className="module-container">
      <PageHeader title="Parcelas" actionLabel="+ Nova Parcela" actionTo="/dashboard/parcelas/novo" />
      {body}
    </div>
  );
}

export default InstallmentListPage;
