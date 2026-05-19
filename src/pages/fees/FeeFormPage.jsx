import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import feeService from '../../api/feeService';
import processService from '../../api/processService';
import { toast } from '../../utils/toast';
import '../clients/ClientPage.css';

const EMPTY_FORM = {
  processoId: '',
  descricao: '',
  valor: '',
  tipo: '',
  status: 'pendente',
  dataVencimento: '',
};

function FeeFormPage() {
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
      feeService.getFeeById(id)
        .then(res => {
          const f = res.data;
          setFormData({
            processoId: f.processoId?._id || f.processoId || '',
            descricao: f.descricao || '',
            valor: f.valor || '',
            tipo: f.tipo || '',
            status: f.status || 'pendente',
            dataVencimento: f.dataVencimento ? f.dataVencimento.substring(0, 10) : '',
          });
        })
        .catch(() => setError('Falha ao carregar honorário.'));
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
        descricao: formData.descricao,
        valor: Number(formData.valor),
        tipo: formData.tipo,
        status: formData.status,
        dataVencimento: formData.dataVencimento,
      };
      if (isEditing) {
        await feeService.updateFee(id, payload);
      } else {
        await feeService.createFee(payload);
      }
      toast.success(isEditing ? 'Honorário atualizado com sucesso.' : 'Honorário cadastrado com sucesso.');
      navigate('/dashboard/honorarios');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar honorário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Honorário' : 'Novo Honorário'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-grid section">
          <h3>Dados do Honorário</h3>

          <div className="form-group span-3">
            <label>Processo *</label>
            <select name="processoId" value={formData.processoId} onChange={handleChange} required>
              <option value="">Selecione um processo</option>
              {processes.map(p => (
                <option key={p._id} value={p._id}>
                  {p.titulo} {p.numeroProcesso ? `— ${p.numeroProcesso}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group span-3">
            <label>Descrição *</label>
            <input
              type="text"
              name="descricao"
              value={formData.descricao}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group span-1">
            <label>Valor (R$) *</label>
            <input
              type="number"
              name="valor"
              step="0.01"
              min="0"
              value={formData.valor}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group span-1">
            <label>Tipo *</label>
            <select name="tipo" value={formData.tipo} onChange={handleChange} required>
              <option value="">Selecione</option>
              <option value="fixo">Fixo</option>
              <option value="percentual">Percentual</option>
              <option value="custas">Custas</option>
            </select>
          </div>

          <div className="form-group span-1">
            <label>Status</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>

          <div className="form-group span-1">
            <label>Data de Vencimento *</label>
            <input
              type="date"
              name="dataVencimento"
              value={formData.dataVencimento}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/honorarios')} className="btn-cancel">
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

export default FeeFormPage;
