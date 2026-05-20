import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import documentService from '../../api/documentService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { formatDate } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import '../../styles/modules.css';

const TIPO_LABEL = {
  'petição':    'Petição',
  'contrato':   'Contrato',
  'sentença':   'Sentença',
  'comprovante': 'Comprovante',
};

function DocumentListPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId');

  useEffect(() => {
    setLoading(true);
    setError('');
    documentService.listDocuments({ page: 1, limit: 20, processoId })
      .then(res => setDocuments(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar documentos.'))
      .finally(() => setLoading(false));
  }, [processoId]);

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await documentService.deleteDocument(id);
      setDocuments(documents.filter(d => d._id !== id));
      toast.success('Documento removido com sucesso.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao remover documento.');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="module-container">
      <PageHeader title="Documentos" actionLabel="+ Novo Documento" actionTo="/dashboard/documentos/novo" />
      {error && <p className="error-message">{error}</p>}

      {documents.length === 0 ? (
        <EmptyState title="Nenhum documento cadastrado." description="Clique em Novo Documento para começar." />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Processo</th>
                <th>Descrição</th>
                <th>Upload</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc._id}>
                  <td>
                    <a href={doc.urlArquivo} target="_blank" rel="noreferrer">{doc.nome}</a>
                  </td>
                  <td>{TIPO_LABEL[doc.tipo] || doc.tipo}</td>
                  <td>{doc.processoId?.titulo || '—'}</td>
                  <td>{doc.descricao || '—'}</td>
                  <td>{formatDate(doc.dataUpload)}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/documentos/editar/${doc._id}`} className="btn-action btn-edit">Editar</Link>
                    <button onClick={() => confirmDelete(doc._id)} className="btn-action btn-delete">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.open}
        title="Remover documento"
        message="Tem certeza que deseja remover este documento? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </div>
  );
}

export default DocumentListPage;
