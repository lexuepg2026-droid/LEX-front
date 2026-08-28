import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
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
import {
  podeConsultarPreview,
  linhasDoPlano,
  frasePlanoDaLinha,
  fraseDaSobra,
  resumoDoPlano,
} from './allocationPreview.js';
import '../../styles/modules.css';
import './PaymentFormPage.css';
import '../clients/ClientPage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useOnlineStatus from '../../hooks/useOnlineStatus';

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
// ── O PREVIEW DE ALOCAÇÃO (F-1b) ──────────────────────────────────────────
// Escolhido o honorário e digitado o valor, a tela mostra — ANTES de confirmar
// — em quais parcelas o dinheiro vai encostar, qual será abatida pela metade e
// quanto sobra como crédito.
//
// O plano vem de `POST /payments/preview` e NÃO é recalculado aqui. A rota usa
// a mesma `planejarAlocacao` que a criação executa, e é isso que impede o
// preview de mentir: se a tela simulasse a distribuição, haveria duas regras
// para a mesma pergunta sobre dinheiro, e a advogada decidiria pela cópia.
//
// Depois de gravar, o mesmo bloco mostra o REALIZADO, lido do 201. Previsto e
// realizado passam pelos mesmos formatadores (`allocationPreview.js`) — dois
// formatadores poderiam discordar sobre números que precisam bater.
//
// ── A digitação não pode perder o foco ────────────────────────────────────
// A causa foi corrigida na F-1a.1 e não se reintroduz aqui: o `<Loading />` do
// preview NUNCA substitui o formulário, e nenhum input é montado
// condicionalmente por causa do estado do preview. O bloco aparece ao lado; a
// árvore dos campos não muda.
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
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);

  // ── Preview e realizado ─────────────────────────────────────────────────
  // `preview` é o que ACONTECERIA; `realizado` é o que aconteceu, lido do 201.
  // Estados separados porque são fatos diferentes: depois de gravar, o
  // previsto vira histórico e o que vale é a resposta do servidor.
  const [preview, setPreview] = useState(null);
  const [previewCarregando, setPreviewCarregando] = useState(false);
  const [previewErro, setPreviewErro] = useState('');
  const [realizado, setRealizado] = useState(null);

  // Ignora resposta de preview que chegou fora de ordem. Sem isto, uma
  // consulta lenta de "1.50" poderia sobrescrever a resposta de "1.500" e a
  // tela mostraria o plano de um valor que a advogada já não tem na frente.
  const previewSeq = useRef(0);
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

  // O honorário pode chegar PRÉ-SELECIONADO por `?honorarioId=`, que é como a
  // página do honorário (F-1b) manda registrar um pagamento: a advogada
  // clicou "Registrar pagamento" olhando para uma cobrança específica, e
  // obrigá-la a procurá-la de novo no seletor seria devolver o clique que a
  // fase existe para eliminar.
  useEffect(() => {
    if (isEditing) return;
    const doQuery = searchParams.get('honorarioId');
    if (doQuery) setFormData(prev => ({ ...prev, honorarioId: doQuery }));
  }, [isEditing, searchParams]);

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

  // ── A consulta do preview, com debounce curto ───────────────────────────
  //
  // 350 ms: curto o bastante para o plano parecer imediato, longo o bastante
  // para "1.500" não gerar quatro requisições (uma por dígito). O timer é
  // recriado a cada tecla e limpo no cleanup — é isso que faz valer só a
  // última pausa.
  //
  // O que este efeito NÃO faz: mexer no foco, remontar campo ou trocar o
  // formulário por um spinner. A perda de foco durante a digitação foi um
  // defeito real da F-1a.1, e a causa era exatamente isso.
  useEffect(() => {
    if (isEditing) return undefined;

    // Depois de gravado, o que vale é o realizado: parar de consultar o
    // preview evita a tela mostrar previsão de um pagamento que já existe.
    if (realizado) return undefined;

    if (!podeConsultarPreview(formData.honorarioId, formData.valor)) {
      // Valor incompleto: o bloco inteiro some, e não vira "R$ 0,00".
      setPreview(null);
      setPreviewErro('');
      setPreviewCarregando(false);
      return undefined;
    }

    const meuSeq = ++previewSeq.current;
    setPreviewCarregando(true);

    const timer = setTimeout(() => {
      paymentService.preverAlocacao({
        honorarioId: formData.honorarioId,
        valor: Number(formData.valor),
        tipo: formData.tipo,
      })
        .then(res => {
          if (meuSeq !== previewSeq.current) return;
          setPreview(res.data);
          setPreviewErro('');
        })
        .catch(err => {
          if (meuSeq !== previewSeq.current) return;
          setPreview(null);
          // A recusa do preview é a MESMA da criação (honorário cancelado →
          // 409, valor ≤ 0 → 400). Exibi-la aqui evita a advogada descobrir no
          // Salvar — e o texto é o do backend, pelos helpers de sempre.
          setPreviewErro(getFinancialErrorMessage(err, 'Não foi possível simular a alocação.'));
        })
        .finally(() => {
          if (meuSeq === previewSeq.current) setPreviewCarregando(false);
        });
    }, 350);

    return () => clearTimeout(timer);
  }, [isEditing, realizado, formData.honorarioId, formData.valor, formData.tipo]);

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

        // ── NÃO navega mais na hora ────────────────────────────────────────
        // Até a F-1a a tela ia embora para a listagem e o resultado vivia num
        // toast, que some sozinho em segundos. O ponto desta fase é a advogada
        // poder COMPARAR o previsto com o realizado — e não dá para comparar
        // com algo que já saiu da tela. O bloco fica, com a saída explícita
        // logo abaixo dele.
        setRealizado(res.data);
        return;
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
        {!online && <OfflineWriteReason />}
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
                    {/* Também aqui o nome leva à cobrança (F-1b): quem está
                        editando a observação de um pagamento é exatamente quem
                        pode querer ver o extrato do honorário. */}
                    {pagamento?.honorarioId?._id ? (
                      <Link
                        to={`/dashboard/honorarios/${pagamento.honorarioId._id}`}
                        className="link-interno"
                      >
                        {pagamento.honorarioId.descricao ?? 'Honorário'}
                      </Link>
                    ) : '—'}
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

              {/* ── O PLANO: previsto antes, realizado depois ───────────────
                  O mesmo bloco, alimentado por duas fontes que têm a mesma
                  forma. Enquanto o valor está incompleto ele NÃO aparece — nem
                  como "R$ 0,00" —, no espírito do `"—"` da 4.3. */}
              {(realizado || preview || previewCarregando || previewErro) && (
                <div className={`plano span-3${realizado ? ' plano--realizado' : ''}`}>
                  <div className="plano__cabecalho">
                    <strong className="plano__titulo">
                      {realizado ? 'O que foi feito com o dinheiro' : 'O que vai acontecer'}
                    </strong>
                    {/* Nunca substitui o formulário: o aviso de carregamento é
                        uma palavra ao lado do título. Trocar a tela por um
                        spinner a cada tecla é o que tirava o foco do campo. */}
                    {previewCarregando && !realizado && (
                      <span className="plano__carregando" role="status">calculando…</span>
                    )}
                  </div>

                  {previewErro && !realizado ? (
                    <p className="plano__erro">{previewErro}</p>
                  ) : (
                    (realizado || preview) && (
                      <>
                        <p className="plano__resumo">{resumoDoPlano(realizado ?? preview)}</p>

                        {linhasDoPlano(realizado ?? preview).length > 0 && (
                          <ul className="plano__linhas">
                            {linhasDoPlano(realizado ?? preview).map(linha => (
                              <li key={linha.chave} className="plano__linha">
                                {frasePlanoDaLinha(linha)}
                              </li>
                            ))}
                          </ul>
                        )}

                        {fraseDaSobra(realizado ?? preview) && (
                          <p className="plano__sobra">{fraseDaSobra(realizado ?? preview)}</p>
                        )}

                        {/* O preview é uma PROMESSA, e dizer isso evita a
                            leitura de que o pagamento já foi registrado. */}
                        {!realizado && (
                          <p className="plano__aviso">
                            Simulação — nada foi gravado ainda.
                          </p>
                        )}
                      </>
                    )
                  )}
                </div>
              )}
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

        {/* ── Depois de gravado, salvar de novo não é uma opção ────────────
            O pagamento já existe; o botão Salvar ali criaria um segundo
            lançamento com o mesmo valor, que é o erro mais caro que esta tela
            pode induzir. No lugar dele, as duas saídas reais — e o link para a
            página do honorário, que é onde o efeito acabou de acontecer. */}
        {realizado ? (
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard/pagamentos')}
              className="btn-cancel"
            >
              Ver pagamentos
            </button>
            {realizado.pagamento?.honorarioId && (
              <Link
                to={`/dashboard/honorarios/${realizado.pagamento.honorarioId._id ?? realizado.pagamento.honorarioId}`}
                className="btn-primary"
              >
                Abrir o honorário
              </Link>
            )}
          </div>
        ) : (
          <div className="form-actions">
            <button type="button" onClick={() => navigate('/dashboard/pagamentos')} className="btn-cancel">
              Cancelar
            </button>
            <button type="submit"
            aria-disabled={online ? undefined : 'true'} disabled={loading} className="btn-primary">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

export default PaymentFormPage;
