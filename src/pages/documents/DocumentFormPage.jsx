import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import documentService from '../../api/documentService';
import processService from '../../api/processService';
import '../clients/ClientPage.css';

const EMPTY_FORM = {
  processoId: '',
  nome: '',
  tipo: '',
  descricao: '',
  urlArquivo: '',
  tamanho: '',
  dataUpload: new Date().toISOString().substring(0, 10),
};

function DocumentFormPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    processService.listProcesses()
      .then(res => setProcesses(res.data.data ?? res.data))
      .catch(() => setError('Falha ao carregar processos.'));

    if (isEditing) {
      documentService.getDocumentById(id)
        .then(res => {
          const d = res.data;
          setFormData({
            processoId: d.processoId?._id || d.processoId || '',
            nome: d.nome || '',
            tipo: d.tipo || '',
            descricao: d.descricao || '',
            urlArquivo: d.urlArquivo || '',
            tamanho: d.tamanho || '',
            dataUpload: d.dataUpload ? d.dataUpload.substring(0, 10) : '',
          });
        })
        .catch(() => setError('Falha ao carregar documento.'));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = {
        processoId: formData.processoId,
        nome: formData.nome,
        tipo: formData.tipo,
        descricao: formData.descricao,
        urlArquivo: formData.urlArquivo,
        tamanho: formData.tamanho ? Number(formData.tamanho) : undefined,
        dataUpload: formData.dataUpload || undefined,
      };
      if (isEditing) {
        await documentService.updateDocument(id, payload);
      } else {
        await documentService.createDocument(payload);
      }
      navigate('/dashboard/documentos');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar documento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Documento' : 'Novo Documento'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-grid section">
          <h3>Dados do Documento</h3>

          <div className="form-group span-3">
            <label>Processo *</label>
            <select name="processoId" value={formData.processoId} onChange={handleChange} required>
              <option value="">Selecione um processo</option>
              {processes.map(p => (
                <option key={p._id} value={p._id}>
                  {p.titulo}{p.numeroProcesso ? ` — ${p.numeroProcesso}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group span-2">
            <label>Nome *</label>
            <input type="text" name="nome" value={formData.nome} onChange={handleChange} required />
          </div>

          <div className="form-group span-1">
            <label>Tipo *</label>
            <select name="tipo" value={formData.tipo} onChange={handleChange} required>
              <option value="">Selecione</option>
              <option value="petição">Petição</option>
              <option value="contrato">Contrato</option>
              <option value="sentença">Sentença</option>
              <option value="comprovante">Comprovante</option>
            </select>
          </div>

          <div className="form-group span-3">
            <label>URL do Arquivo *</label>
            <input
              type="text"
              name="urlArquivo"
              placeholder="https://..."
              value={formData.urlArquivo}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group span-2">
            <label>Descrição</label>
            <input type="text" name="descricao" value={formData.descricao} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label>Tamanho (bytes)</label>
            <input
              type="number"
              name="tamanho"
              min="0"
              value={formData.tamanho}
              onChange={handleChange}
            />
          </div>

          <div className="form-group span-1">
            <label>Data de Upload</label>
            <input type="date" name="dataUpload" value={formData.dataUpload} onChange={handleChange} />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/documentos')} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DocumentFormPage;
