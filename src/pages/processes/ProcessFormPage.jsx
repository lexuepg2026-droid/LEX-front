import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import processService from '../../api/processService';
import clientService from '../../api/clientService';
import { toast } from '../../utils/toast';
import './ProcessPage.css';

const STATUS_OPTIONS = ['ativo', 'encerrado', 'suspenso'];

function ProcessoFormPage() {
  const [formData, setFormData] = useState({
    clienteId: '',
    titulo: '',
    numeroProcesso: '',
    tipoAcao: '',
    area: '',
    orgao: '',
    vara: '',
    comarca: '',
    status: 'ativo',
    descricao: '',
    observacoes: '',
    dataDistribuicao: '',
  });
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await clientService.getAllClients({ limit: 100 });
        setClientes(response.data.data ?? response.data);
      } catch (err) {
        setError('Falha ao carregar a lista de clientes.');
      }
    };
    fetchClientes();
  }, []);

  useEffect(() => {
    if (!isEditing) return;
    const fetchProcesso = async () => {
      try {
        const response = await processService.getProcessById(id);
        const d = response.data;
        setFormData({
          clienteId: d.clienteId?._id?.toString() ?? d.clienteId?.toString() ?? '',
          titulo: d.titulo || '',
          numeroProcesso: d.numeroProcesso || '',
          tipoAcao: d.tipoAcao || '',
          area: d.area || '',
          orgao: d.orgao || '',
          vara: d.vara || '',
          comarca: d.comarca || '',
          status: d.status || 'ativo',
          descricao: d.descricao || '',
          observacoes: d.observacoes || '',
          dataDistribuicao: d.dataDistribuicao
            ? new Date(d.dataDistribuicao).toISOString().split('T')[0]
            : '',
        });
      } catch (err) {
        setError('Falha ao carregar dados do processo.');
      }
    };
    fetchProcesso();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      clienteId: formData.clienteId,
      titulo: formData.titulo,
      status: formData.status,
      numeroProcesso: formData.numeroProcesso || undefined,
      tipoAcao: formData.tipoAcao || undefined,
      area: formData.area || undefined,
      orgao: formData.orgao || undefined,
      vara: formData.vara || undefined,
      comarca: formData.comarca || undefined,
      descricao: formData.descricao || undefined,
      observacoes: formData.observacoes || undefined,
      dataDistribuicao: formData.dataDistribuicao || undefined,
    };

    try {
      if (isEditing) {
        await processService.updateProcess(id, payload);
      } else {
        await processService.createProcess(payload);
      }
      toast.success(isEditing ? 'Processo atualizado com sucesso.' : 'Processo cadastrado com sucesso.');
      navigate('/dashboard/processos');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar processo. Verifique os dados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const clienteLabel = (c) => {
    const nome = c.tipoPessoa === 'fisica' ? c.nomeCompleto : c.razaoSocial;
    const doc = c.tipoPessoa === 'fisica' ? `CPF: ${c.cpf}` : `CNPJ: ${c.cnpj}`;
    return `${nome} — ${doc}`;
  };

  return (
    <div className="page-container">
      <h1 className="page-title">{isEditing ? 'Editar Processo' : 'Registrar Novo Processo'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-grid">

          <div className="form-group span-3">
            <label htmlFor="clienteId">Cliente*</label>
            <select id="clienteId" name="clienteId" value={formData.clienteId} onChange={handleChange} required>
              <option value="">Selecione um cliente...</option>
              {clientes.map(c => (
                <option key={c._id} value={c._id}>{clienteLabel(c)}</option>
              ))}
            </select>
          </div>

          <div className="form-group span-2">
            <label htmlFor="titulo">Título do Processo*</label>
            <input type="text" id="titulo" name="titulo" value={formData.titulo} onChange={handleChange} required />
          </div>

          <div className="form-group span-1">
            <label htmlFor="numeroProcesso">Nº do Processo (CNJ)</label>
            <input type="text" id="numeroProcesso" name="numeroProcesso" value={formData.numeroProcesso} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={formData.status} onChange={handleChange}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="form-group span-1">
            <label htmlFor="tipoAcao">Tipo de Ação</label>
            <input type="text" id="tipoAcao" name="tipoAcao" value={formData.tipoAcao} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="area">Área</label>
            <input type="text" id="area" name="area" value={formData.area} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="dataDistribuicao">Data de Distribuição</label>
            <input type="date" id="dataDistribuicao" name="dataDistribuicao" value={formData.dataDistribuicao} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="orgao">Órgão</label>
            <input type="text" id="orgao" name="orgao" value={formData.orgao} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="vara">Vara</label>
            <input type="text" id="vara" name="vara" value={formData.vara} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="comarca">Comarca</label>
            <input type="text" id="comarca" name="comarca" value={formData.comarca} onChange={handleChange} />
          </div>

          <div className="form-group span-3">
            <label htmlFor="descricao">Descrição / Fatos</label>
            <textarea id="descricao" name="descricao" value={formData.descricao} onChange={handleChange} rows="4" />
          </div>

          <div className="form-group span-3">
            <label htmlFor="observacoes">Observações</label>
            <textarea id="observacoes" name="observacoes" value={formData.observacoes} onChange={handleChange} rows="3" />
          </div>

        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/processos')} className="btn-cancel">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProcessoFormPage;
