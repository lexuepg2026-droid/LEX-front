import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import clientService from '../../api/clientService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import '../../styles/modules.css';

function ClienteListPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        setLoading(true);
        const response = await clientService.getAllClients();
        setClientes(response.data.data ?? response.data);
      } catch (err) {
        setError('Falha ao buscar clientes.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await clientService.deleteClient(id);
      setClientes(clientes.filter(c => c._id !== id));
      toast.success('Cliente excluído com sucesso.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao excluir cliente.');
    }
  };

  const formatEndereco = (endereco) => {
    if (!endereco?.logradouro) return '—';
    return [
      endereco.logradouro,
      endereco.numero ? `nº ${endereco.numero}` : null,
      endereco.bairro,
      [endereco.cidade, endereco.estado].filter(Boolean).join('/'),
    ].filter(Boolean).join(', ');
  };

  if (loading) return <Loading />;

  return (
    <div className="module-container">
      <PageHeader title="Clientes Registrados" actionLabel="Novo Cliente" actionTo="/dashboard/clientes/novo" />
      {error && <p className="error-message">{error}</p>}

      {clientes.length === 0 ? (
        <EmptyState title="Nenhum cliente cadastrado." description="Clique em Novo Cliente para começar." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>CPF / CNPJ</th>
                <th>Tipo</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Endereço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(cliente => (
                <tr key={cliente._id}>
                  <td>{cliente.tipoPessoa === 'fisica' ? cliente.nomeCompleto : cliente.razaoSocial}</td>
                  <td>{cliente.tipoPessoa === 'fisica' ? cliente.cpf : cliente.cnpj}</td>
                  <td>{cliente.tipoPessoa === 'fisica' ? 'Física' : 'Jurídica'}</td>
                  <td>{cliente.email || '—'}</td>
                  <td>{cliente.telefone || '—'}</td>
                  <td>{formatEndereco(cliente.endereco)}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/clientes/detalhe/${cliente._id}`} className="btn-action btn-view">Ver</Link>
                    <Link to={`/dashboard/clientes/editar/${cliente._id}`} className="btn-action btn-edit">Editar</Link>
                    <button onClick={() => confirmDelete(cliente._id)} className="btn-action btn-delete">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.open}
        title="Excluir cliente"
        message="Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </div>
  );
}

export default ClienteListPage;
