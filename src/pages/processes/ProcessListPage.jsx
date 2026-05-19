import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import processService from '../../api/processService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import '../../styles/modules.css';

function ProcessoListPage() {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  useEffect(() => {
    const fetchProcessos = async () => {
      try {
        setLoading(true);
        const response = await processService.listProcesses();
        setProcessos(response.data.data ?? response.data);
      } catch (err) {
        setError('Falha ao buscar processos.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProcessos();
  }, []);

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await processService.deleteProcess(id);
      setProcessos(processos.filter(p => p._id !== id));
      toast.success('Processo excluído com sucesso.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao excluir processo.');
    }
  };

  const nomeCliente = (p) => {
    if (!p.clienteId) return '—';
    if (typeof p.clienteId === 'object') {
      return p.clienteId.tipoPessoa === 'fisica'
        ? p.clienteId.nomeCompleto
        : p.clienteId.razaoSocial;
    }
    return String(p.clienteId);
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="module-container">
      <PageHeader title="Processos Registrados" actionLabel="Novo Processo" actionTo="/dashboard/processos/novo" />
      {error && <p className="error-message">{error}</p>}

      {processos.length === 0 ? (
        <EmptyState title="Nenhum processo cadastrado." description="Clique em Novo Processo para começar." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Nº Processo</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Distribuição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {processos.map(p => (
                <tr key={p._id}>
                  <td>{p.titulo}</td>
                  <td>{p.numeroProcesso || '—'}</td>
                  <td>{nomeCliente(p)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{formatDate(p.dataDistribuicao)}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/processos/detalhe/${p._id}`} className="btn-action btn-edit">Gerenciar</Link>
                    <button onClick={() => confirmDelete(p._id)} className="btn-action btn-delete">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.open}
        title="Excluir processo"
        message="Tem certeza que deseja excluir este processo? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </div>
  );
}

export default ProcessoListPage;
