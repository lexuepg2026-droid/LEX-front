import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import feeService from '../../api/feeService';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyInput from '../../components/ui/MoneyInput';
import { toast } from '../../utils/toast';
import { getApiErrorField } from '../../utils/apiError';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { formatCurrency } from '../../utils/formatters';
import '../clients/ClientPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// FORMULÁRIO DE PARCELA
//
// `valorPago` NUNCA entra no payload (Fase 4.1). É a soma dos pagamentos ativos
// da parcela, com um único ponto de escrita no backend
// (`recalcularStatusInstallment`), e `installmentService` RECUSA com 400 quem o
// mandar no corpo — recusa explícita, não descarte silencioso.
//
// A tela o EXIBE, junto com o que falta, porque é a informação que a advogada
// abre a parcela para ver. Exibir sem oferecer edição é o ponto: o caminho para
// mudar esse número é registrar um pagamento.
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_FORM = {
  feeId: '',
  numeroParcela: '',
  valor: '',
  dataVencimento: '',
};

function InstallmentFormPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campoComErro, setCampoComErro] = useState(null);
  // Somente leitura, e por isso FORA de `formData`: o que está em `formData` é
  // o que o formulário edita, e misturar os dois é como `valorPago` acabaria
  // num payload por descuido.
  const [situacao, setSituacao] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    feeService.listFees()
      .then(res => setFees(res.data.data ?? res.data))
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar honorários.')));

    if (isEditing) {
      installmentService.getInstallmentById(id)
        .then(res => {
          const inst = res.data;
          setFormData({
            feeId: inst.feeId?._id || inst.feeId || '',
            numeroParcela: inst.numeroParcela || '',
            valor: inst.valor || '',
            dataVencimento: inst.dataVencimento ? inst.dataVencimento.substring(0, 10) : '',
          });
          setSituacao({
            status: inst.status || 'pendente',
            valor: Number(inst.valor || 0),
            valorPago: Number(inst.valorPago || 0),
            dataPagamento: inst.dataPagamento || null,
          });
        })
        .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar parcela.')));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (campoComErro === name) setCampoComErro(null);
  };

  // O campo de dinheiro não passa pelo `handleChange` genérico: `MoneyInput`
  // devolve o número já convertido (ou `null`), e não o evento.
  const handleValorChange = (numero) => {
    setFormData(prev => ({ ...prev, valor: numero }));
    if (campoComErro === 'valor') setCampoComErro(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCampoComErro(null);
    try {
      // Payload explícito, campo a campo — nunca spread de `formData`. É o que
      // garante que `valorPago` não entre aqui pela porta dos fundos no dia em
      // que alguém acrescentar o campo ao estado do formulário.
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
      // Dois erros chegam aqui com forma diferente: o 409 de número de parcela
      // duplicado traz `campo: "numeroParcela"` e destaca o input; o 400 de
      // `valorPago` no corpo traz `campo: "valorPago"` e é bug de payload — não
      // há input desse nome nesta tela, e o destaque simplesmente não pega.
      setError(getFinancialErrorMessage(err, 'Erro ao salvar parcela.'));
      setCampoComErro(getApiErrorField(err));
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
              className={campoComErro === 'numeroParcela' ? 'input-erro' : undefined}
            />
          </div>

          <div className="form-group span-1">
            <label htmlFor="parcela-valor">Valor *</label>
            {/* `MoneyInput` devolve Number em reais (ou `null`); o payload
                continua fazendo `Number(formData.valor)`. */}
            <MoneyInput
              id="parcela-valor"
              name="valor"
              value={formData.valor}
              onChange={handleValorChange}
              required
              className={campoComErro === 'valor' ? 'input-erro' : undefined}
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

        </div>

        {/* ── Situação da parcela — somente leitura ────────────────────────────
            `valorPago` é a soma dos pagamentos ativos e `emAberto` é o que
            falta. Nenhum dos dois é editável, e nenhum vai no payload: o
            caminho para alterá-los é registrar (ou remover) um pagamento. */}
        {isEditing && situacao && (
          <div className="form-grid section">
            <h3>Situação da parcela</h3>
            <div className="form-info-box span-3">
              <div className="form-info-item">
                <span className="form-info-label">Status</span>
                <span className="form-info-value">
                  <StatusBadge status={situacao.status} />
                </span>
              </div>
              <div className="form-info-item">
                <span className="form-info-label">Valor da parcela</span>
                <span className="form-info-value">{formatCurrency(situacao.valor)}</span>
              </div>
              <div className="form-info-item">
                <span className="form-info-label">Já recebido</span>
                <span className="form-info-value form-info-value--success">
                  {formatCurrency(situacao.valorPago)}
                </span>
              </div>
              <div className="form-info-item">
                <span className="form-info-label">Em aberto</span>
                <span
                  className={`form-info-value${
                    situacao.valor - situacao.valorPago > 0 ? ' form-info-value--danger' : ''
                  }`}
                >
                  {formatCurrency(Math.max(0, situacao.valor - situacao.valorPago))}
                </span>
              </div>
            </div>
            <p className="form-hint span-3">
              O status e o valor já recebido são calculados a partir dos
              pagamentos registrados nesta parcela. Para alterá-los, registre um
              recebimento em Pagamentos.
            </p>
          </div>
        )}

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
