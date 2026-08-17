import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import clientService from '../../api/clientService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import { getApiErrorMessage } from '../../utils/apiError';
import '../../styles/modules.css';

function ClienteListPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    setLoading(true);
    setError('');
    clientService.getAllClients({ busca: buscaDebounced || undefined })
      .then(res => setClientes(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar clientes.'))
      .finally(() => setLoading(false));
  }, [buscaDebounced]);

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await clientService.deleteClient(id);
      setClientes(clientes.filter(c => c._id !== id));
      toast.success('Cliente excluído com sucesso.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erro ao excluir cliente.'));
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

  // ── O `return <Loading/>` ANTECIPADO saiu daqui (F-1a.1) ─────────────────
  //
  // Era `if (loading) return <Loading />;`, e era a causa da perda de foco na
  // busca. Cada tecla digitada refazia a consulta (com debounce), o efeito
  // punha `loading` em `true`, e o return antecipado trocava a ÁRVORE INTEIRA
  // por `<Loading/>` — o React desmontava o `<input>` e montava outro quando a
  // resposta chegava. Foco perdido, cursor no começo, e a advogada clicando de
  // novo no campo a cada palavra.
  //
  // A correção é estrutural: o indicador de carregamento passa a viver ABAIXO
  // dos controles, dentro do JSX, e o input nunca desmonta. É o padrão que
  // `SecaoListPage` já usava — esta tela é que estava fora dele.
  //
  // **Não se corrige com `autoFocus` nem `.focus()` em efeito**: os dois
  // tratam o sintoma e roubam o foco de quem está navegando por teclado, que é
  // um defeito pior que o original.
  return (
    <div className="module-container">
      <PageHeader title="Clientes Registrados" actionLabel="Novo Cliente" actionTo="/dashboard/clientes/novo" />
      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Buscar por nome, razão social ou email..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          maxLength={80}
        />
      </div>

      {loading ? (
        <Loading />
      ) : clientes.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado." description="Tente ajustar os filtros ou cadastre um novo cliente." />
      ) : (
        <div className="table-wrapper">
          {/* Larguras estáveis (Fase 4.3). Nome, e-mail e endereço são texto
              livre sem teto: sem `<colgroup>` eles decidem a largura da tabela
              e empurram a coluna de ações para fora da tela. */}
          <table className="data-table data-table--fixed">
            <colgroup>
              <col />
              <col className="col-md" />
              <col className="col-xs" />
              <col />
              <col className="col-sm" />
              <col />
              <col className="col-acoes-3" />
            </colgroup>
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
              {clientes.map(cliente => {
                const nome = cliente.tipoPessoa === 'fisica' ? cliente.nomeCompleto : cliente.razaoSocial;
                const endereco = formatEndereco(cliente.endereco);
                return (
                <tr key={cliente._id}>
                  <td className="cell-truncate" title={nome}>{nome}</td>
                  <td>{cliente.tipoPessoa === 'fisica' ? cliente.cpf : cliente.cnpj}</td>
                  <td>{cliente.tipoPessoa === 'fisica' ? 'Física' : 'Jurídica'}</td>
                  <td className="cell-truncate" title={cliente.email || undefined}>{cliente.email || '—'}</td>
                  <td>{cliente.telefone || '—'}</td>
                  <td className="cell-truncate" title={endereco}>{endereco}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/clientes/detalhe/${cliente._id}`} className="btn-action btn-view">Ver</Link>
                    <Link to={`/dashboard/clientes/editar/${cliente._id}`} className="btn-action btn-edit">Editar</Link>
                    <button onClick={() => confirmDelete(cliente._id)} className="btn-action btn-delete">Excluir</button>
                  </td>
                </tr>
                );
              })}
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
