import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import feeService from '../../api/feeService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import '../../styles/modules.css';

function FeeListPage({ embedded = false }) {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId');
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    setLoading(true);
    setError('');
    feeService.listFees({
      processoId,
      busca: buscaDebounced || undefined,
      tipo: tipo || undefined,
      status: status || undefined,
    })
      .then(res => setFees(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar honorários.'))
      .finally(() => setLoading(false));
  }, [processoId, buscaDebounced, tipo, status]);

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await feeService.deleteFee(id);
      setFees(fees.filter(f => f._id !== id));
      toast.success('Honorário removido com sucesso.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao remover honorário.');
    }
  };

  if (loading) return <Loading />;

  const body = (
    <>
      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Buscar por descrição..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          maxLength={80}
        />
        <select value={tipo} onChange={e => setTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option value="fixo">Fixo</option>
          <option value="percentual">Percentual</option>
          <option value="custas">Custas</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="pago">Pago</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>

      {fees.length === 0 ? (
        <EmptyState
          title="Nenhum honorário encontrado"
          description="Tente ajustar os filtros ou registre um novo honorário."
        />
      ) : (
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
              {fees.map(fee => (
                <tr key={fee._id}>
                  <td>{fee.processoId?.titulo ?? '—'}</td>
                  <td>{fee.descricao}</td>
                  <td>{formatCurrency(fee.valor)}</td>
                  <td>{fee.tipo}</td>
                  <td><StatusBadge status={fee.status} /></td>
                  <td>{formatDate(fee.dataVencimento)}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/honorarios/editar/${fee._id}`} className="btn-action btn-edit">Editar</Link>
                    <button onClick={() => confirmDelete(fee._id)} className="btn-action btn-delete">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.open}
        title="Remover honorário"
        message="Tem certeza que deseja remover este honorário? Esta ação não pode ser desfeita."
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
      <PageHeader title="Honorários" actionLabel="+ Novo Honorário" actionTo="/dashboard/honorarios/novo" />
      {body}
    </div>
  );
}

export default FeeListPage;
