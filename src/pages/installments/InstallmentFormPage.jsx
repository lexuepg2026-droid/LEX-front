import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import feeService from '../../api/feeService';
import { toast } from '../../utils/toast';
import '../clients/ClientPage.css';

const EMPTY_FORM = {
  feeId: '',
  numeroParcela: '',
  valor: '',
  dataVencimento: '',
  status: 'pendente',
};

function InstallmentFormPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    feeService.listFees()
      .then(res => setFees(res.data.data ?? res.data))
      .catch(() => setError('Falha ao carregar honorários.'));

    if (isEditing) {
      installmentService.getInstallmentById(id)
        .then(res => {
          const inst = res.data;
          setFormData({
            feeId: inst.feeId?._id || inst.feeId || '',
            numeroParcela: inst.numeroParcela || '',
            valor: inst.valor || '',
            dataVencimento: inst.dataVencimento ? inst.dataVencimento.substring(0, 10) : '',
            status: inst.status || 'pendente',
          });
        })
        .catch(() => setError('Falha ao carregar parcela.'));
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
        feeId: formData.feeId,
        numeroParcela: Number(formData.numeroParcela),
        valor: Number(formData.valor),
        dataVencimento: formData.dataVencimento || undefined,
      };
      if (isEditing) {
        await installmentService.updateInstallment(id, payload);
      } else {
        await installmentService.createInstallment(payload);
      }
      toast.success(isEditing ? 'Parcela atualizada com sucesso.' : 'Parcela cadastrada com sucesso.');
      navigate('/dashboard/parcelas');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar parcela.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Parcela' : 'Nova Parcela'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-grid section">
          <h3>Dados da Parcela</h3>

          <div className="form-group span-3">
            <label>Honorário *</label>
            <select name="feeId" value={formData.feeId} onChange={handleChange} required>
              <option value="">Selecione um honorário</option>
              {fees.map(f => (
                <option key={f._id} value={f._id}>
                  {f.descricao} — {f.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group span-1">
            <label>Nº da Parcela *</label>
            <input
              type="number"
              name="numeroParcela"
              min="1"
              value={formData.numeroParcela}
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
            <label>Data de Vencimento *</label>
            <input
              type="date"
              name="dataVencimento"
              value={formData.dataVencimento}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group span-1">
            <label>
              Status{' '}
              <span style={{ fontSize: '11px', opacity: 0.55, fontWeight: 400 }}>
                (calculado automaticamente)
              </span>
            </label>
            <select name="status" value={formData.status} onChange={handleChange} disabled>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="vencido">Vencido</option>
              <option value="parcial">Parcial</option>
            </select>
          </div>

        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/parcelas')} className="btn-cancel">
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

export default InstallmentFormPage;
