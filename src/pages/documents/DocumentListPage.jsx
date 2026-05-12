import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import documentService from '../../api/documentService';
import '../clients/ClientPage.css';

const TIPO_LABEL = {
  'petição': 'Petição',
  'contrato': 'Contrato',
  'sentença': 'Sentença',
  'comprovante': 'Comprovante',
};

function DocumentListPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    documentService.listDocuments({ page: 1, limit: 20 })
      .then(res => setDocuments(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar documentos.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remover este documento?')) return;
    try {
      await documentService.deleteDocument(id);
      setDocuments(documents.filter(d => d._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao remover documento.');
    }
  };

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="cliente-page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title" style={{ border: 'none', marginBottom: 0 }}>Documentos</h1>
        <Link to="/dashboard/documentos/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Novo Documento
        </Link>
      </div>

      {error && <p className="error-message">{error}</p>}

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
            {documents.length === 0 ? (
              <tr><td colSpan="6">Nenhum documento cadastrado.</td></tr>
            ) : (
              documents.map(doc => (
                <tr key={doc._id}>
                  <td>
                    <a href={doc.urlArquivo} target="_blank" rel="noreferrer">{doc.nome}</a>
                  </td>
                  <td>{TIPO_LABEL[doc.tipo] || doc.tipo}</td>
                  <td>{doc.processoId?.titulo || '—'}</td>
                  <td>{doc.descricao || '—'}</td>
                  <td>{formatDate(doc.dataUpload)}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/documentos/editar/${doc._id}`} className="btn-action btn-edit">
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(doc._id)} className="btn-action btn-delete">
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

export default DocumentListPage;
