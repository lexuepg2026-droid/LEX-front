import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import SeletorComBusca from '../../components/ui/SeletorComBusca';
import { rotuloDoProcessoNoSeletor } from '../../utils/feeLabel';
import { MENSAGENS_DO_SELETOR } from '../../utils/seletorComBusca.js';
import {
  camposDoTipo,
  derivarValorHonorario,
  validarHonorario,
  montarPayloadHonorario,
  mensagemDoCampoPercentual,
} from '../../utils/feeCalc';
import '../clients/ClientPage.css';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { usePublicarContexto } from '../../contexts/ContextoContext';
import { destinoDepoisDeSalvar } from '../../components/layout/contexto.js';

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
  // O processo do honorário em edição, populado pelo `GET /fees/:id`, para o
  // seletor nascer com o rótulo sem outra ida ao servidor (DEC-086).
  const [processoInicial, setProcessoInicial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [campoComErro, setCampoComErro] = useState(null);
  // Fase 4a (DEC-157): a frase do percentual mora NO CAMPO, e não no rodapé.
  const [erroDoPercentual, setErroDoPercentual] = useState('');

  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  // Fase 2b (DEC-087): aberto pelo "+ Honorário" da ficha do processo, o
  // formulário volta para o processo — no Salvar e no Cancelar.
  const saida = destinoDepoisDeSalvar(searchParams.get('voltar'), '/dashboard/honorarios');
  // Fase 2b (DEC-085): publica para a faixa de contexto o processo — assim que escolhido no seletor.
  usePublicarContexto({ processoId: formData.processoId });
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


  // Fase 2b (DEC-086): o processo pode chegar PRÉ-SELECIONADO por
  // `?processoId=`, que é como o "+ Honorário" da ficha financeira do processo
  // abre esta tela — o mesmo padrão do `?honorarioId=` do pagamento.
  useEffect(() => {
    if (isEditing) return;
    const doQuery = searchParams.get('processoId');
    if (doQuery) setFormData(prev => ({ ...prev, processoId: doQuery }));
  }, [isEditing, searchParams]);

  // Fase 3.2 (DEC-101): o seletor busca no servidor — número, título e
  // cliente principal —, e o teto de 100 e o aviso "Mostrando os N mais
  // recentes" da DEC-067 saíram. O processo da URL ou da edição é buscado
  // pelo id dentro do `SeletorComBusca` (DEC-086).
  const buscarProcessos = (termo) => processService.buscarProcessos(termo);
  const buscarProcessoPorId = (pid) => processService.getProcessById(pid).then(res => res.data);

  useEffect(() => {
    if (isEditing) {
      feeService.getFeeById(id)
        .then(res => {
          const f = res.data;
          // O processo vem populado sem o cliente; o cliente vem ao lado, em
          // `cliente` — junta-se aqui para o rótulo do seletor sair completo.
          if (f.processoId && typeof f.processoId === 'object') {
            setProcessoInicial({ ...f.processoId, clientePrincipalId: f.cliente ?? null });
          }
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
    if (name === 'percentual') setErroDoPercentual('');
  };

  // ── O `invalid` do percentual (Fase 4a, DEC-157) ─────────────────────────
  // `min`, `max` e `step` continuam no campo (o teclado e o leitor de tela os
  // usam), e por isso o navegador barra o envio antes do `handleSubmit`. O
  // `preventDefault` tira o balão genérico dele; no lugar entra a frase
  // própria, no campo, com o destaque de erro de sempre. Nada é enviado: o
  // navegador já cancelou o `submit`.
  const handlePercentualInvalido = (e) => {
    e.preventDefault();
    setError('');
    setErroDoPercentual(mensagemDoCampoPercentual(e.target.validity));
    setCampoComErro('percentual');
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
    // O seletor guarda o id da ESCOLHA; texto digitado sem escolher não é
    // processo nenhum.
    if (!formData.processoId) {
      setError(`Processo: ${MENSAGENS_DO_SELETOR.escolhaDaLista}`);
      setCampoComErro('processoId');
      return;
    }
    const problema = validarHonorario(formData);
    if (problema) {
      // O percentual fala no próprio campo (DEC-157); o resto, no rodapé.
      if (problema.campo === 'percentual') {
        setError('');
        setErroDoPercentual(problema.mensagem);
      } else {
        setError(problema.mensagem);
      }
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
      navigate(saida);
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
            <label htmlFor="honorario-processo">Processo *</label>
            <SeletorComBusca
              id="honorario-processo"
              name="processoId"
              valor={formData.processoId}
              onMudar={(pid) => {
                setFormData(prev => ({ ...prev, processoId: pid }));
                if (campoComErro === 'processoId') setCampoComErro(null);
              }}
              buscar={buscarProcessos}
              buscarPorId={buscarProcessoPorId}
              rotulo={rotuloDoProcessoNoSeletor}
              itemInicial={processoInicial}
              placeholder="Busque pelo número, título ou cliente"
              className={campoComErro === 'processoId' ? 'input-erro' : undefined}
            />
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
              <label htmlFor="fee-percentual">Percentual (%) *</label>
              <input
                id="fee-percentual"
                type="number"
                name="percentual"
                step="0.01"
                min="0.01"
                max="100"
                value={formData.percentual}
                onChange={handleChange}
                onInvalid={handlePercentualInvalido}
                className={campoComErro === 'percentual' ? 'input-erro' : undefined}
                aria-invalid={erroDoPercentual ? 'true' : undefined}
                aria-describedby={erroDoPercentual ? 'fee-percentual-erro' : undefined}
                required
              />
              {erroDoPercentual && (
                <span id="fee-percentual-erro" className="form-erro-campo" role="alert">
                  {erroDoPercentual}
                </span>
              )}
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
                O honorário fica registrado e sai do total contratado do processo.
                Pagamentos já recebidos não são apagados, e o cancelamento não é
                desfeito por um pagamento posterior.
              </span>
            </div>
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

export default FeeFormPage;
