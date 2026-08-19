import React, { useState, useEffect } from 'react';
import paymentService from '../../api/paymentService';
import MoneyInput from '../ui/MoneyInput';
import Loading from '../common/Loading';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getApiErrorField } from '../../utils/apiError';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { descricaoDoEfeito, descricaoDaAnulacao, acimaDoEstornavel } from './reversalEffect.js';
import '../ui/Modal.css';
import '../ui/Button.css';
import './ReversalModal.css';

// ═══════════════════════════════════════════════════════════════════════════
// ESTORNO E ANULAÇÃO, EM MODAL — Fase F-1b (DEC-033)
//
// Duas operações no mesmo componente porque são a mesma conversa em direções
// opostas, e a advogada chega às duas pelo mesmo lugar: a linha do pagamento,
// no extrato ou na listagem. Uma tela separada para cada uma seria dois
// caminhos para "corrigir aquele lançamento ali".
//
// ── O que a tela NÃO decide ───────────────────────────────────────────────
// Quanto ainda é estornável, se o alvo da anulação existe, se ele já foi
// anulado: tudo isso é regra de banco e mora no `reversalService`. A tela
// oferece o default (o líquido restante), exibe o efeito e MOSTRA A RECUSA do
// backend quando ela vem — sem redação nova, pelos helpers de sempre.
//
// O 422 de "acima do estornável" traz o limite em `errors.estornavel`, e o
// `getFinancialErrorMessage` já o transforma em frase com o número. Reescrever
// a mensagem aqui quebraria o roteamento por `campo` que a Fase 2E.1 criou.
//
// ── `valor` não existe na anulação, e é de propósito ──────────────────────
// Anular restaura o valor INTEGRAL do estorno anulado. Um campo de valor aqui
// criaria uma "anulação parcial" que a DEC-033 não tem — quem quer devolver
// parte registra um estorno novo.
// ═══════════════════════════════════════════════════════════════════════════

function ReversalModal({ open, pagamentoId, estorno, onFechar, onConcluido }) {
  // `estorno` presente = modo ANULAÇÃO. Ausente = modo ESTORNO.
  const ehAnulacao = Boolean(estorno);

  const [pagamento, setPagamento] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [error, setError] = useState('');
  const [campoComErro, setCampoComErro] = useState(null);

  // Esc fecha, como no `Modal` comum do projeto.
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onFechar]);

  // O pagamento é relido ao abrir: o líquido restante é o default do campo de
  // valor, e usá-lo a partir do que a listagem tinha em memória ofereceria um
  // default vencido depois de um estorno feito em outra aba.
  useEffect(() => {
    if (!open || !pagamentoId) return undefined;
    let ativo = true;
    setCarregando(true);
    setError('');
    setCampoComErro(null);
    setMotivo('');

    paymentService.getPaymentById(pagamentoId)
      .then((res) => {
        if (!ativo) return;
        const p = res.data;
        setPagamento(p);
        // Default = líquido restante. É o estorno que a advogada mais faz
        // (o lançamento inteiro voltou), e deixá-lo em branco obrigaria a
        // digitar um número que a tela já sabe.
        setValor(p.valorLiquido ?? p.valor ?? '');
      })
      .catch((err) => {
        if (ativo) setError(getFinancialErrorMessage(err, 'Falha ao carregar o pagamento.'));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => { ativo = false; };
  }, [open, pagamentoId]);

  if (!open) return null;

  const submeter = async (e) => {
    e.preventDefault();
    setSalvando(true);
    setError('');
    setCampoComErro(null);

    try {
      const corpo = ehAnulacao
        ? { estornoAnuladoId: estorno._id, motivo }
        : { valor: Number(valor), motivo };

      await paymentService.createReversal(pagamentoId, corpo);
      onConcluido?.(ehAnulacao ? 'Estorno anulado.' : 'Estorno registrado.');
    } catch (err) {
      // Sem redação nova: a mensagem é a do backend, enriquecida pelas chaves
      // estruturadas, e o campo vem por `getApiErrorField`.
      setError(getFinancialErrorMessage(err, 'Não foi possível concluir a operação.'));
      setCampoComErro(getApiErrorField(err));
    } finally {
      setSalvando(false);
    }
  };

  const titulo = ehAnulacao ? 'Anular estorno' : 'Registrar estorno';

  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div
        className="modal modal--estorno"
        role="dialog"
        aria-modal="true"
        aria-labelledby="estorno-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="estorno-titulo" className="modal__title">{titulo}</h2>

        {carregando ? (
          <Loading />
        ) : (
          <form onSubmit={submeter} className="estorno-form">
            {pagamento && (
              <div className="estorno-resumo">
                <span>
                  Pagamento de <strong>{formatCurrency(pagamento.valor)}</strong>
                  {' em '}{formatDate(pagamento.data)}
                </span>
                {/* O líquido restante é o teto do estorno. Exibi-lo evita a
                    tentativa que o backend recusaria com 422. */}
                <span className="estorno-resumo__liquido">
                  Ainda estornável: <strong>{formatCurrency(pagamento.valorLiquido ?? pagamento.valor)}</strong>
                </span>
              </div>
            )}

            {/* O EFEITO, antes de confirmar. É o que a Parte 5 exige: a
                advogada precisa saber quais parcelas voltam a ficar em aberto
                antes de mexer no dinheiro.

                ── O AVISO PREVENTIVO (F-1b.2) ─────────────────────────────
                Acima do estornável, o quadro muda de TOM junto com a frase: um
                aviso escrito em cima do mesmo fundo de "vai dar certo" se lê
                como mais uma descrição. O envio continua liberado — quem
                recusa é o servidor (padrão do passo 102), e é ele que conhece
                o limite no instante do envio. */}
            <p
              className={
                'estorno-efeito' +
                (!ehAnulacao && acimaDoEstornavel(pagamento, valor)
                  ? ' estorno-efeito--aviso'
                  : '')
              }
              role={!ehAnulacao && acimaDoEstornavel(pagamento, valor) ? 'status' : undefined}
            >
              {ehAnulacao
                ? descricaoDaAnulacao(estorno)
                : descricaoDoEfeito(pagamento, valor)}
            </p>

            {!ehAnulacao && (
              <div className="form-group">
                <label htmlFor="estorno-valor">Valor do estorno *</label>
                <MoneyInput
                  id="estorno-valor"
                  name="valor"
                  value={valor}
                  onChange={setValor}
                  required
                  className={campoComErro === 'valor' ? 'input-erro' : undefined}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="estorno-motivo">Motivo *</label>
              {/* Obrigatório nos DOIS caminhos, como no backend: é o campo que
                  responde, meses depois, por que este dinheiro voltou. */}
              <input
                id="estorno-motivo"
                type="text"
                name="motivo"
                value={motivo}
                onChange={(e) => {
                  setMotivo(e.target.value);
                  if (campoComErro === 'motivo') setCampoComErro(null);
                }}
                required
                minLength={3}
                maxLength={500}
                placeholder="Ex.: boleto devolvido pelo banco"
                className={campoComErro === 'motivo' ? 'input-erro' : undefined}
              />
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="modal__actions">
              <button
                type="button"
                className="ui-btn ui-btn--secondary ui-btn--md"
                onClick={onFechar}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ui-btn ui-btn--danger ui-btn--md"
                disabled={salvando}
              >
                {salvando ? 'Registrando…' : titulo}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ReversalModal;
