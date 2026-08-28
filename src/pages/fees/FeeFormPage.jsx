import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import feeService from '../../api/feeService';
import processService from '../../api/processService';
import StatusBadge from '../../components/ui/StatusBadge';
import MoneyInput from '../../components/ui/MoneyInput';
import Loading from '../../components/common/Loading';
import { toast } from '../../utils/toast';
import { getApiErrorField } from '../../utils/apiError';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { TIPO_HONORARIO_OPTIONS, STATUS_CANCELADO } from '../../utils/enums';
import {
  camposDoTipo,
  derivarValorHonorario,
  validarHonorario,
  montarPayloadHonorario,
} from '../../utils/feeCalc';
import '../clients/ClientPage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useOnlineStatus from '../../hooks/useOnlineStatus';

// ═══════════════════════════════════════════════════════════════════════════
// FORMULÁRIO DE HONORÁRIO — o campo `tipo` comanda a tela (DEC-027)
//
// Três formas, um formulário:
//   fixo / custas  → `valor` é ENTRADA; percentual e valor base nem aparecem.
//   percentual     → `percentual` e `valorBase` são entrada e obrigatórios;
//                    `valor` vira EXIBIÇÃO, calculada ao vivo, e não vai no
//                    payload (o backend descarta o que vier).
//
// A regra em si mora em `utils/feeCalc.js`, em função pura. Aqui só há tela.
//
// ── `status` não é um <select> ─────────────────────────────────────────────
// Ele era, e estava errado desde a Fase 1. Depois da DEC-028 três dos quatro
// estados são DERIVADOS das parcelas, e oferecê-los num select prometia à
// advogada um controle que ela não tem: marcar "pago" à mão seria desfeito
// pelo próximo recálculo, em silêncio. `cancelado` é o único que o recálculo
// nunca sobrescreve, e por isso é o único que a tela escreve — como ação
// deliberada, não como opção numa lista.
// ═══════════════════════════════════════════════════════════════════════════

const EMPTY_FORM = {
  processoId: '',
  descricao: '',
  valor: '',
  percentual: '',
  valorBase: '',
  tipo: '',
  dataVencimento: '',
  // Estado do honorário como o backend o devolveu. Só existe na edição e nunca
  // é editável: serve para o badge e para saber se o cancelamento está sendo
  // desfeito.
  statusOriginal: 'pendente',
  cancelado: false,
};

function FeeFormPage() {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [processes, setProcesses] = useState([]);
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
    processService.listProcesses()
      .then(res => setProcesses(res.data.data ?? res.data))
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar processos.')));

    if (isEditing) {
      feeService.getFeeById(id)
        .then(res => {
          const f = res.data;
          setFormData({
            processoId: f.processoId?._id || f.processoId || '',
            descricao: f.descricao || '',
            valor: f.valor ?? '',
            // `null` fora do tipo percentual — o backend o devolve explícito, e
            // '' é o que o input controlado entende como vazio.
            percentual: f.percentual ?? '',
            valorBase: f.valorBase ?? '',
            tipo: f.tipo || '',
            dataVencimento: f.dataVencimento ? f.dataVencimento.substring(0, 10) : '',
            statusOriginal: f.status || 'pendente',
            cancelado: f.status === STATUS_CANCELADO,
          });
        })
        .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao carregar honorário.')))
        .finally(() => setCarregandoRegistro(false));
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Trocar o campo que o servidor acusou apaga o destaque: manter a borda
    // vermelha depois da correção faz a advogada reenviar achando que não
    // resolveu.
    if (campoComErro === name) setCampoComErro(null);
  };

  // Os campos de dinheiro não passam pelo `handleChange` genérico: `MoneyInput`
  // devolve o NÚMERO já convertido (ou `null`), e não o evento. É de propósito
  // — ver o cabeçalho de `components/ui/MoneyInput.jsx`.
  const handleValorChange = (name, numero) => {
    setFormData(prev => ({ ...prev, [name]: numero }));
    if (campoComErro === name) setCampoComErro(null);
  };

  const campos = camposDoTipo(formData.tipo);
  const valorDerivado = derivarValorHonorario(formData.percentual, formData.valorBase);

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

    // Espelho do hook, para poupar uma viagem. O backend continua sendo a
    // última palavra: se esta validação e a de lá discordarem, quem vale é a
    // de lá — por isso o `catch` abaixo trata o 400 com `campo` do mesmo jeito,
    // e não como "erro que não deveria acontecer".
    const problema = validarHonorario(formData);
    if (problema) {
      setError(problema.mensagem);
      setCampoComErro(problema.campo);
      return;
    }

    setLoading(true);
    setError('');
    setCampoComErro(null);
    try {
      const payload = montarPayloadHonorario(formData, { isEditing });
      if (isEditing) {
        await feeService.updateFee(id, payload);
      } else {
        await feeService.createFee(payload);
      }
      toast.success(isEditing ? 'Honorário atualizado com sucesso.' : 'Honorário cadastrado com sucesso.');
      navigate('/dashboard/honorarios');
    } catch (err) {
      setError(getFinancialErrorMessage(err, 'Erro ao salvar honorário.'));
      // O backend informa qual campo causou o erro; destacamos o input em vez
      // de deixar a advogada caçar o conflito numa mensagem no rodapé. Desde a
      // DEC-027 isso vale também para os 400 do hook condicional — antes o
      // helper estava ligado e inerte.
      setCampoComErro(getApiErrorField(err));
    } finally {
      setLoading(false);
    }
  };

  if (carregandoRegistro) return <Loading />;

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Honorário' : 'Novo Honorário'}</h1>

      <form onSubmit={handleSubmit} className="data-form">
        {!online && <OfflineWriteReason />}
        <div className="form-grid section">
          <h3>Dados do Honorário</h3>

          <div className="form-group span-3">
            <label>Processo *</label>
            <select
              name="processoId"
              value={formData.processoId}
              onChange={handleChange}
              className={campoComErro === 'processoId' ? 'input-erro' : undefined}
              required
            >
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
              className={campoComErro === 'descricao' ? 'input-erro' : undefined}
              required
            />
          </div>

          <div className="form-group span-1">
            <label>Tipo *</label>
            <select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              className={campoComErro === 'tipo' ? 'input-erro' : undefined}
              required
            >
              <option value="">Selecione</option>
              {TIPO_HONORARIO_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* ── Tipo fixo e custas: `valor` é entrada ──────────────────────── */}
          {campos.valor === 'entrada' && (
            <div className="form-group span-1">
              <label htmlFor="fee-valor">Valor *</label>
              {/* `MoneyInput` devolve Number em reais ou `null` — o mesmo que
                  `formData.valor` já guardava. `montarPayloadHonorario`
                  continua fazendo `Number(form.valor)` e o payload não muda. */}
              <MoneyInput
                id="fee-valor"
                name="valor"
                value={formData.valor}
                onChange={(numero) => handleValorChange('valor', numero)}
                className={campoComErro === 'valor' ? 'input-erro' : undefined}
                required
              />
            </div>
          )}

          {/* ── Tipo percentual: as duas parcelas da conta ─────────────────── */}
          {campos.percentual && (
            <div className="form-group span-1">
              <label>Percentual (%) *</label>
              <input
                type="number"
                name="percentual"
                step="0.01"
                min="0.01"
                max="100"
                value={formData.percentual}
                onChange={handleChange}
                className={campoComErro === 'percentual' ? 'input-erro' : undefined}
                required
              />
            </div>
          )}

          {campos.valorBase && (
            <div className="form-group span-1">
              <label htmlFor="fee-valor-base">Valor base *</label>
              <MoneyInput
                id="fee-valor-base"
                name="valorBase"
                value={formData.valorBase}
                onChange={(numero) => handleValorChange('valorBase', numero)}
                className={campoComErro === 'valorBase' ? 'input-erro' : undefined}
                required
              />
              <span className="form-hint">
                Sobre o que o percentual incide: valor da causa, monte-mor,
                proveito econômico.
              </span>
            </div>
          )}

          <div className="form-group span-1">
            <label>Data de Vencimento *</label>
            <input
              type="date"
              name="dataVencimento"
              value={formData.dataVencimento}
              onChange={handleChange}
              className={campoComErro === 'dataVencimento' ? 'input-erro' : undefined}
              required
            />
          </div>
        </div>

        {/* ── `valor` derivado — exibição, não entrada ─────────────────────────
            Aparece só no tipo percentual, e não é um input desabilitado: um
            campo cinza no meio do formulário parece algo que se pode habilitar.
            Isto é o resultado da conta, e diz de onde saiu. */}
        {campos.valor === 'derivado' && (
          <div className="form-grid section">
            <h3>Valor do honorário</h3>
            <div className="form-info-box span-3">
              <div className="form-info-item">
                <span className="form-info-label">Percentual contratado</span>
                <span className="form-info-value">{formatPercent(formData.percentual)}</span>
              </div>
              <div className="form-info-item">
                <span className="form-info-label">Valor base</span>
                <span className="form-info-value">
                  {/* `null` além de `''`: desde a Fase 4.3 o campo é um
                      `MoneyInput`, e apagar tudo devolve `null` — que
                      `Number()` transformaria em "R$ 0,00", um valor que
                      ninguém combinou. */}
                  {formData.valorBase == null || formData.valorBase === ''
                    ? '—'
                    : formatCurrency(Number(formData.valorBase))}
                </span>
              </div>
              <div className="form-info-item">
                <span className="form-info-label">Valor do honorário</span>
                <span className="form-info-value form-info-value--success">
                  {valorDerivado === null ? '—' : formatCurrency(valorDerivado)}
                </span>
              </div>
            </div>
            <p className="form-hint span-3">
              Calculado pelo sistema a partir do percentual e do valor base. Não
              é digitado: num honorário percentual o valor não é opinião, é
              conta — e é este número que sai no contrato.
            </p>
          </div>
        )}

        {/* ── Status ───────────────────────────────────────────────────────────
            Badge somente leitura para os três derivados, e uma ação deliberada
            para o único que a tela escreve. Só na edição: honorário que ainda
            não existe não se cancela. */}
        {isEditing && (
          <div className="form-grid section">
            <h3>Situação</h3>
            <div className="form-group span-3">
              <label>Status atual</label>
              <p className="form-static-value">
                <StatusBadge status={formData.cancelado ? STATUS_CANCELADO : formData.statusOriginal} />
                <span className="form-hint">
                  Pendente, parcialmente pago e pago são calculados a partir das
                  parcelas e dos pagamentos — não se alteram à mão.
                </span>
              </p>
            </div>

            <div className="form-group span-3">
              <label className="form-check">
                <input
                  type="checkbox"
                  name="cancelado"
                  checked={formData.cancelado}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, cancelado: e.target.checked }))
                  }
                />
                Cancelar este honorário
              </label>
              <span className="form-hint">
                A cobrança fica registrada e sai do total contratado do processo.
                Pagamentos já recebidos não são apagados, e o cancelamento não é
                desfeito por um recebimento posterior.
              </span>
            </div>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/honorarios')} className="btn-cancel">
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

export default FeeFormPage;
