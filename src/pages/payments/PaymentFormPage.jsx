import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import paymentService from '../../api/paymentService';
import feeService from '../../api/feeService';
import MoneyInput from '../../components/ui/MoneyInput';
import { formatCurrency } from '../../utils/formatters';
import { FORMA_PAGAMENTO_OPTIONS, TIPO_PAGAMENTO_OPTIONS } from '../../utils/enums';
import Loading from '../../components/common/Loading';
import { toast } from '../../utils/toast';
import { getApiErrorField } from '../../utils/apiError';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { resumoDaAlocacao } from './allocationSummary.js';
import '../clients/ClientPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// FORMULÁRIO DE PAGAMENTO — reescrito na Fase F-1a
//
// ── O pagamento nasce contra o HONORÁRIO, não contra a parcela ────────────
// O seletor de parcela virou seletor de honorário (DEC-032/DEC-035). Quem
// decide em quais parcelas o dinheiro encosta é o motor de alocação do
// backend, do vencimento mais antigo em diante — e é ele que devolve, no 201,
// o que fez.
//
// A tela não reproduz essa regra. Reproduzi-la seria escrevê-la duas vezes, e
// a cópia divergiria na primeira mudança; foi por isso que o preview e a
// criação compartilham a mesma função no backend.
//
// ── O 409 de excedente NÃO EXISTE MAIS ────────────────────────────────────
// A guarda que recusava pagamento maior que a parcela caiu com a DEC-035: ela
// recusava um fato. O bloco que exibia "valor da parcela / já recebido / saldo
// restante" saiu junto — a conta que ele mostrava deixou de ser a pergunta.
// O que sobra vira `saldoAdiantado` e o resultado é mostrado DEPOIS de gravar,
// a partir do que o backend respondeu.
//
// ── Sem preview de alocação nesta fase ────────────────────────────────────
// `POST /payments/preview` existe e está testada, mas a tela que a consome é a
// F-1b. Aqui o resumo aparece no toast, em texto simples, com o que o 201
// devolveu — informação verdadeira, sem inventar interface que a fase seguinte
// vai desenhar melhor.
//
// ── Edição: um campo só ───────────────────────────────────────────────────
// A allowlist do backend tem `observacoes` e mais nada. O formulário de edição
// exibe o resto como somente-leitura, coerente com ela — um campo editável que
// o servidor recusa é a tela sendo mais permissiva que a API, e o erro só
// apareceria no Salvar.
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_FORM = {
  honorarioId: '',
  valor: '',
  data: new Date().toISOString().substring(0, 10),
  tipo: 'comum',
  formaPagamento: 'pix',
  observacoes: '',
};

function PaymentFormPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [fees, setFees] = useState([]);
  // Em modo edição, o pagamento gravado — é dele que saem os campos
  // somente-leitura.
  const [pagamento, setPagamento] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campoComErro, setCampoComErro] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  // ── Carregamento da leitura em modo edição (Fase F-0) ────────────────────
  //
  // `loading`, logo acima, é o do botão Salvar. Não havia estado nenhum para a
  // LEITURA: abrir a edição pintava o formulário vazio e os campos apareciam de
  // repente quando o GET voltava. Numa conexão lenta a advogada começa a digitar
  // por cima de um formulário que ainda vai ser sobrescrito.
  //
  // Inicia em `true` já no primeiro render quando há `id` — inicia em `false`
  // faria o formulário vazio piscar antes do spinner, que é o defeito com um
  // quadro a mais.
  const [carregandoRegistro, setCarregandoRegistro] = useState(Boolean(id));

  useEffect(() => {
    // Só honorários que podem receber dinheiro. Um honorário `cancelado`
    // responde 409 no POST, e oferecê-lo no seletor seria a tela convidando
    // para um erro que ela já sabe evitar.
    feeService.listFees({ limit: 100 })
      .then(res => {
        const lista = res.data.data ?? res.data;
        setFees(lista.filter(f => f.status !== 'cancelado'));
      })
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar honorários.')));

    if (isEditing) {
      paymentService.getPaymentById(id)
        .then(res => {
          const p = res.data;
          setPagamento(p);
          setFormData({
            honorarioId: p.honorarioId?._id || p.honorarioId || '',
            valor: p.valor ?? '',
            data: p.data ? p.data.substring(0, 10) : '',
            tipo: p.tipo || 'comum',
            formaPagamento: p.formaPagamento || 'pix',
            observacoes: p.observacoes || '',
          });
        })
        .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar pagamento.')))
        .finally(() => setCarregandoRegistro(false));
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
      if (isEditing) {
        // Payload de UM campo, explícito. Mandar o resto levaria 400 com
        // `campo`, e a advogada leria "campo não permitido" sobre um input que
        // a tela nem oferece para edição.
        await paymentService.updatePayment(id, { observacoes: formData.observacoes });
        toast.success('Observações do pagamento atualizadas.');
      } else {
        const res = await paymentService.createPayment({
          honorarioId: formData.honorarioId,
          valor: Number(formData.valor),
          data: formData.data,
          tipo: formData.tipo,
          formaPagamento: formData.formaPagamento,
          observacoes: formData.observacoes,
        });
        // O 201 devolve `{ pagamento, alocacoes, sobra, saldoAdiantado }` — o
        // que o motor fez com o dinheiro. Sem isto a advogada registraria um
        // pagamento e não saberia em quais parcelas ele encostou.
        toast.success(resumoDaAlocacao(res.data));
      }
      navigate('/dashboard/pagamentos');
    } catch (err) {
      setError(getFinancialErrorMessage(err, 'Erro ao salvar pagamento.'));
      setCampoComErro(getApiErrorField(err));
    } finally {
      setLoading(false);
    }
  };

  const formatFeeLabel = (fee) => {
    const valor = formatCurrency(fee.valor);
    const processo = fee.processoId?.titulo || fee.processoId?.numeroProcesso || '';
    return `${fee.descricao} — ${valor}${processo ? ` (${processo})` : ''}`;
  };

  if (carregandoRegistro) return <Loading />;

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Pagamento' : 'Novo Pagamento'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-grid section">
          <h3>Dados do Pagamento</h3>

          {isEditing ? (
            // ── Somente leitura, coerente com a allowlist ────────────────────
            //
            // Valor, data, tipo e forma de pagamento não se editam: corrigir
            // dinheiro gravado é ESTORNAR (DEC-033), não reescrever. Exibi-los
            // como campo desabilitado, e não escondê-los, é o que faz a
            // advogada entender o que está editando.
            <>
              <div className="form-info-box span-3">
                <div className="form-info-item">
                  <span className="form-info-label">Honorário</span>
                  <span className="form-info-value">
                    {pagamento?.honorarioId?.descricao ?? '—'}
                  </span>
                </div>
                <div className="form-info-item">
                  <span className="form-info-label">Valor</span>
                  <span className="form-info-value">{formatCurrency(pagamento?.valor)}</span>
                </div>
                <div className="form-info-item">
                  <span className="form-info-label">Valor líquido</span>
                  <span className="form-info-value">
                    {formatCurrency(pagamento?.valorLiquido ?? pagamento?.valor)}
                  </span>
                </div>
              </div>

              <p className="form-hint span-3">
                Valor, data e forma de pagamento não são editáveis: um registro de
                dinheiro que muda de valor não é registro. Para corrigir, registre
                um estorno.
              </p>
            </>
          ) : (
            <>
              <div className="form-group span-3">
                <label htmlFor="pagamento-honorario">Honorário *</label>
                <select
                  id="pagamento-honorario"
                  name="honorarioId"
                  value={formData.honorarioId}
                  onChange={handleChange}
                  required
                  className={campoComErro === 'honorarioId' ? 'input-erro' : undefined}
                >
                  <option value="">Selecione um honorário</option>
                  {fees.map(fee => (
                    <option key={fee._id} value={fee._id}>
                      {formatFeeLabel(fee)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group span-1">
                <label htmlFor="pagamento-valor">Valor *</label>
                {/* `MoneyInput` devolve Number em reais (ou `null`). */}
                <MoneyInput
                  id="pagamento-valor"
                  name="valor"
                  value={formData.valor}
                  onChange={handleValorChange}
                  required
                  className={campoComErro === 'valor' ? 'input-erro' : undefined}
                />
              </div>

              <div className="form-group span-1">
                <label htmlFor="pagamento-data">Data do Pagamento *</label>
                <input
                  id="pagamento-data"
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  required
                  className={campoComErro === 'data' ? 'input-erro' : undefined}
                />
              </div>

              <div className="form-group span-1">
                <label htmlFor="pagamento-forma">Forma de Pagamento *</label>
                <select
                  id="pagamento-forma"
                  name="formaPagamento"
                  value={formData.formaPagamento}
                  onChange={handleChange}
                  required
                  className={campoComErro === 'formaPagamento' ? 'input-erro' : undefined}
                >
                  {FORMA_PAGAMENTO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group span-1">
                <label htmlFor="pagamento-tipo">Tipo *</label>
                <select
                  id="pagamento-tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  required
                  className={campoComErro === 'tipo' ? 'input-erro' : undefined}
                >
                  {TIPO_PAGAMENTO_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <p className="form-hint span-3">
                O valor é distribuído automaticamente entre as parcelas em aberto
                deste honorário, do vencimento mais antigo para o mais novo. O que
                sobrar fica como saldo adiantado e é usado quando novas parcelas
                forem criadas.
              </p>
            </>
          )}

          <div className="form-group span-3">
            <label htmlFor="pagamento-observacoes">Observações</label>
            <input
              id="pagamento-observacoes"
              type="text"
              name="observacoes"
              maxLength={1000}
              value={formData.observacoes}
              onChange={handleChange}
              className={campoComErro === 'observacoes' ? 'input-erro' : undefined}
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
