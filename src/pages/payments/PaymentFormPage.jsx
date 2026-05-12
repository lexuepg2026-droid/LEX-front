import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import paymentService from '../../api/paymentService';
import installmentService from '../../api/installmentService';
import '../clients/ClientPage.css';

const EMPTY_FORM = {
  installmentId: '',
  valorPago: '',
  dataPagamento: new Date().toISOString().substring(0, 10),
  formaPagamento: 'pix',
  observacoes: '',
};

function PaymentFormPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    installmentService.listInstallments()
      .then(res => setInstallments(res.data.data ?? res.data))
      .catch(() => setError('Falha ao carregar parcelas.'));

    if (isEditing) {
      paymentService.getPaymentById(id)
        .then(res => {
          const p = res.data;
          setFormData({
            installmentId: p.installmentId?._id || p.installmentId || '',
            valorPago: p.valorPago || '',
            dataPagamento: p.dataPagamento ? p.dataPagamento.substring(0, 10) : '',
            formaPagamento: p.formaPagamento || 'pix',
            observacoes: p.observacoes || '',
          });
        })
        .catch(() => setError('Falha ao carregar pagamento.'));
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
        installmentId: formData.installmentId,
        valorPago: Number(formData.valorPago),
        dataPagamento: formData.dataPagamento,
        formaPagamento: formData.formaPagamento,
        observacoes: formData.observacoes,
      };
      if (isEditing) {
        await paymentService.updatePayment(id, payload);
      } else {
        await paymentService.createPayment(payload);
      }
      navigate('/dashboard/pagamentos');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const formatInstallmentLabel = (inst) => {
    const valor = inst.valor?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return `Parcela ${inst.numeroParcela} — ${valor} (${inst.status})`;
  };

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Pagamento' : 'Novo Pagamento'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-grid section">
          <h3>Dados do Pagamento</h3>

          <div className="form-group span-3">
            <label>Parcela *</label>
            <select name="installmentId" value={formData.installmentId} onChange={handleChange} required>
              <option value="">Selecione uma parcela</option>
              {installments.map(inst => (
                <option key={inst._id} value={inst._id}>
                  {formatInstallmentLabel(inst)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group span-1">
            <label>Valor Pago (R$) *</label>
            <input
              type="number"
              name="valorPago"
              step="0.01"
              min="0.01"
              value={formData.valorPago}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group span-1">
            <label>Data do Pagamento *</label>
            <input
              type="date"
              name="dataPagamento"
              value={formData.dataPagamento}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group span-1">
            <label>Forma de Pagamento *</label>
            <select name="formaPagamento" value={formData.formaPagamento} onChange={handleChange} required>
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="boleto">Boleto</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="transferencia">Transferência</option>
            </select>
          </div>

          <div className="form-group span-3">
            <label>Observações</label>
            <input
              type="text"
              name="observacoes"
              maxLength={1000}
              value={formData.observacoes}
              onChange={handleChange}
            />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/pagamentos')} className="btn-cancel">
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

export default PaymentFormPage;
