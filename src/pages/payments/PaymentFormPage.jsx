import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import paymentService from '../../api/paymentService';
import installmentService from '../../api/installmentService';
import { formatCurrency } from '../../utils/formatters';
import { FORMA_PAGAMENTO_OPTIONS } from '../../utils/enums';
import { toast } from '../../utils/toast';
import { getApiErrorField } from '../../utils/apiError';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import '../clients/ClientPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// FORMULÁRIO DE PAGAMENTO
//
// O erro que mais importa nesta tela é o 409 de excedente. A prosa do servidor
// diz que o valor passa da parcela; a pergunta seguinte da advogada é sempre
// "então quanto ainda cabe?", e a resposta está em `saldoDisponivel`, no mesmo
// corpo. `utils/financialErrors.js` a compõe — nunca por regex sobre a
// mensagem, que é como a Fase 1.3 quebrou.
//
// O saldo do 409 é mais confiável que o calculado aqui embaixo: na EDIÇÃO o
// backend exclui o próprio pagamento em edição do total, e é por isso que ele
// não lê o `valorPago` desnormalizado da parcela para esta conta.
// ═══════════════════════════════════════════════════════════════════════════

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
  const [selectedInstallment, setSelectedInstallment] = useState(null);
  const [valorJaPago, setValorJaPago] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campoComErro, setCampoComErro] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    installmentService.listInstallments({ limit: 200 })
      .then(res => setInstallments(res.data.data ?? res.data))
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar parcelas.')));

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
        .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar pagamento.')));
    }
  }, [id, isEditing]);

  useEffect(() => {
    if (!formData.installmentId || installments.length === 0) {
      setSelectedInstallment(null);
      setValorJaPago(0);
      return;
    }
    const inst = installments.find(i => i._id === formData.installmentId);
    setSelectedInstallment(inst || null);
    paymentService.listPayments({ installmentId: formData.installmentId, limit: 200 })
      .then(res => {
        const list = res.data.data ?? res.data;
        const filtrado = isEditing ? list.filter(p => p._id !== id) : list;
        setValorJaPago(filtrado.reduce((acc, p) => acc + Number(p.valorPago || 0), 0));
      })
      .catch(() => setValorJaPago(0));
  }, [formData.installmentId, installments, id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (campoComErro === name) setCampoComErro(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCampoComErro(null);
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
      toast.success(isEditing ? 'Pagamento atualizado com sucesso.' : 'Pagamento registrado com sucesso.');
      navigate('/dashboard/pagamentos');
    } catch (err) {
      // No 409 de excedente a mensagem já sai com o saldo que ainda cabe, e
      // `campo: "valorPago"` marca o input — os dois juntos dizem o que fazer,
      // e não só que deu errado.
      setError(getFinancialErrorMessage(err, 'Erro ao salvar pagamento.'));
      setCampoComErro(getApiErrorField(err));
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

          {selectedInstallment && (
            <div className="form-info-box span-3">
              <div className="form-info-item">
                <span className="form-info-label">Valor da parcela</span>
                <span className="form-info-value">{formatCurrency(selectedInstallment.valor)}</span>
              </div>
              <div className="form-info-item">
                <span className="form-info-label">Já recebido</span>
                <span className="form-info-value">{formatCurrency(valorJaPago)}</span>
              </div>
              <div className="form-info-item">
                <span className="form-info-label">Saldo restante</span>
                <span className={`form-info-value${selectedInstallment.valor - valorJaPago <= 0 ? ' form-info-value--danger' : ''}`}>
                  {formatCurrency(Math.max(0, selectedInstallment.valor - valorJaPago))}
                </span>
              </div>
            </div>
          )}

          <div className="form-group span-1">
            <label>Valor a registrar (R$) *</label>
            <input
              type="number"
              name="valorPago"
              step="0.01"
              min="0.01"
              value={formData.valorPago}
              onChange={handleChange}
              required
              className={campoComErro === 'valorPago' ? 'input-erro' : undefined}
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
              {FORMA_PAGAMENTO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
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
