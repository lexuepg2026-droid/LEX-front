import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import feeService from '../../api/feeService';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyInput from '../../components/ui/MoneyInput';
import Loading from '../../components/common/Loading';
import { toast } from '../../utils/toast';
import { getApiErrorField } from '../../utils/apiError';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { formatCurrency } from '../../utils/formatters';
import { rotuloDoHonorarioNoSeletor } from '../../utils/feeLabel';
import SeletorComBusca from '../../components/ui/SeletorComBusca';
import { MENSAGENS_DO_SELETOR, honorarioDoDetalhe } from '../../utils/seletorComBusca.js';
import '../clients/ClientPage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { usePublicarContexto } from '../../contexts/ContextoContext';
import { idDoProcesso } from '../../components/layout/contexto.js';
import { destinoDepoisDeSalvar } from '../../components/layout/contexto.js';

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
  // O honorário escolhido, inteiro — é dele que sai o processo publicado na
  // faixa de contexto (DEC-085).
  const [honorarioEscolhido, setHonorarioEscolhido] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campoComErro, setCampoComErro] = useState(null);
  // Somente leitura, e por isso FORA de `formData`: o que está em `formData` é
  // o que o formulário edita, e misturar os dois é como `valorPago` acabaria
  // num payload por descuido.
  const [situacao, setSituacao] = useState(null);

  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  // Fase 2b (DEC-087): aberto pelo "+ Parcela" da ficha do processo, o
  // formulário volta para o processo — no Salvar e no Cancelar.
  const saida = destinoDepoisDeSalvar(searchParams.get('voltar'), '/dashboard/parcelas');
  const isEditing = Boolean(id);

  // Fase 2b (DEC-086): o honorário pode chegar PRÉ-SELECIONADO por
  // `?honorarioId=` — é como o "+ Parcela" da ficha do processo abre esta
  // tela —, no mesmo padrão do `PaymentFormPage`. Desde a Fase 3.2 (DEC-101)
  // o seletor busca no servidor e acha o escolhido pelo id, sem teto.
  useEffect(() => {
    if (isEditing) return;
    const doQuery = searchParams.get('honorarioId');
    if (doQuery) setFormData(prev => ({ ...prev, feeId: doQuery }));
  }, [isEditing, searchParams]);

  const buscarHonorarios = (termo) => feeService.buscarHonorarios(termo);
  const buscarHonorarioPorId = (hid) => feeService.getFeeById(hid).then(res => honorarioDoDetalhe(res.data));

  // Fase 2b (DEC-085): publica para a faixa de contexto o processo do
  // honorário escolhido — o cliente e o número aparecem em cima assim que ela
  // escolhe, que é o "nas parcelas, o nome do cliente" da banca.
  usePublicarContexto({
    processoId: idDoProcesso(
      honorarioEscolhido && String(honorarioEscolhido._id) === String(formData.feeId)
        ? honorarioEscolhido.processoId
        : null
    ),
  });
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
        .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar parcela.')))
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

  const online = useOnlineStatus();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ── Nenhum formulário aceita envio que vai falhar (F-5a, Parte 4) ────
    //
    // A primeira barreira é o botão anunciado como desabilitado; esta é a
    // segunda, no handler, porque `aria-disabled` só ANUNCIA (DEC-053). A
    // terceira é o interceptor de `api/axiosConfig.js`, que recusa a escrita
    // antes da rede — ela cobre o sinal que cai ENTRE o clique e o envio.
    //
    // Deixar salvar para dar erro depois perde o que foi digitado.
    if (!online) return;
    // O seletor guarda o id da ESCOLHA; texto digitado sem escolher não é
    // honorário nenhum.
    if (!formData.feeId) {
      setError(`Honorário: ${MENSAGENS_DO_SELETOR.escolhaDaLista}`);
      setCampoComErro('feeId');
      return;
    }
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
      navigate(saida);
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

  if (carregandoRegistro) return <Loading />;

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Parcela' : 'Nova Parcela'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        {!online && <OfflineWriteReason />}
        <div className="form-grid section">
          <h3>Dados da Parcela</h3>

          <div className="form-group span-3">
            <label htmlFor="parcela-honorario">Honorário *</label>
            <SeletorComBusca
              id="parcela-honorario"
              name="feeId"
              valor={formData.feeId}
              onMudar={(hid, item) => {
                setFormData(prev => ({ ...prev, feeId: hid }));
                if (item) setHonorarioEscolhido(item);
                if (campoComErro === 'feeId') setCampoComErro(null);
              }}
              onEscolhido={setHonorarioEscolhido}
              buscar={buscarHonorarios}
              buscarPorId={buscarHonorarioPorId}
              rotulo={rotuloDoHonorarioNoSeletor}
              placeholder="Busque pela descrição, número do processo ou cliente"
              className={campoComErro === 'feeId' ? 'input-erro' : undefined}
            />
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
              pagamento em Pagamentos.
            </p>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate(saida)} className="btn-cancel">
            Cancelar
          </button>
          <button type="submit"
            aria-disabled={online ? undefined : 'true'} disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default InstallmentFormPage;
