import React, { useState, useEffect } from 'react';
import financeiroService from '../../api/financeiroService';
import paymentService from '../../api/paymentService';
import StatusBadge from '../ui/StatusBadge';
import EmptyState from '../ui/EmptyState';
import Loading from '../common/Loading';
import { formatCurrency, formatDate, formatPercent } from '../../utils/formatters';
import {
  TIPO_HONORARIO_OPTIONS,
  FORMA_PAGAMENTO_OPTIONS,
  STATUS_CANCELADO,
  labelDe,
} from '../../utils/enums';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { toast } from '../../utils/toast';
import './ProcessFinancialSheet.css';

// ═══════════════════════════════════════════════════════════════════════════
// FICHA FINANCEIRA DO PROCESSO — GET /api/financeiro/processos/:processoId
//
// ── A tela EXIBE, não recalcula ────────────────────────────────────────────
// Os totais vêm calculados do backend, nos três níveis (processo, honorário,
// parcela). Somar aqui seria somar O QUE FOI BAIXADO: no dia em que a ficha
// ganhar recorte ou paginação, o total viraria o do recorte, continuaria
// batendo com as linhas da tela e estaria errado — sem ninguém notar.
//
// A única conta desta tela é a de nada: `emAberto` já vem pronto, inclusive por
// parcela.
//
// ── Sem envelope ───────────────────────────────────────────────────────────
// A resposta é `{ processo, totais, honorarios, geradoEm }` e NÃO
// `{ data, total, page, … }`. Não há listagem aqui: há um processo, uma árvore
// embaixo e três totais em cima. Por isso não se escreve
// `res.data.data ?? res.data`.
//
// ── Honorário cancelado ────────────────────────────────────────────────────
// Fica FORA de `totais.contratado` e DENTRO da lista, atenuado, com contagem
// própria em `totais.honorariosCancelados`. Somá-lo faria a advogada ler como
// devido um valor que ela mesma cancelou; escondê-lo apagaria o histórico.
// ═══════════════════════════════════════════════════════════════════════════

function ProcessFinancialSheet({ processoId }) {
  const [ficha, setFicha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reciboEmCurso, setReciboEmCurso] = useState(null);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError('');

    financeiroService.getFichaDoProcesso(processoId)
      .then(res => {
        if (ativo) setFicha(res.data);
      })
      .catch(err => {
        if (ativo) setError(getFinancialErrorMessage(err, 'Falha ao carregar a ficha financeira.'));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => { ativo = false; };
  }, [processoId]);

  const baixarRecibo = async (pagamentoId) => {
    setReciboEmCurso(pagamentoId);
    try {
      const { nome } = await paymentService.baixarEsalvarRecibo(pagamentoId);
      toast.success(`Recibo baixado: ${nome}`);
    } catch (err) {
      toast.error(getFinancialErrorMessage(err, 'Não foi possível gerar o recibo.'));
    } finally {
      setReciboEmCurso(null);
    }
  };

  if (loading) return <Loading />;
  if (error) return <p className="error-message">{error}</p>;
  if (!ficha) return null;

  const { totais, honorarios } = ficha;

  return (
    <div className="ficha-financeira">
      {/* ── Totais do processo ──────────────────────────────────────────────
          Os três números que a advogada abre esta aba para ver. Vale a
          invariante do backend: contratado − pago = em aberto. */}
      <div className="ficha-totais">
        <div className="ficha-total">
          <span className="ficha-total__label">Contratado</span>
          <span className="ficha-total__valor">{formatCurrency(totais.contratado)}</span>
        </div>
        <div className="ficha-total">
          <span className="ficha-total__label">Recebido</span>
          <span className="ficha-total__valor ficha-total__valor--success">
            {formatCurrency(totais.pago)}
          </span>
        </div>
        <div className="ficha-total">
          <span className="ficha-total__label">Em aberto</span>
          <span
            className={`ficha-total__valor${totais.emAberto > 0 ? ' ficha-total__valor--warning' : ''}`}
          >
            {formatCurrency(totais.emAberto)}
          </span>
        </div>
        <div className="ficha-total">
          <span className="ficha-total__label">Honorários</span>
          <span className="ficha-total__valor">
            {totais.honorarios}
            {totais.honorariosCancelados > 0 && (
              <span className="ficha-total__nota">
                {totais.honorariosCancelados === 1
                  ? ' (1 cancelado)'
                  : ` (${totais.honorariosCancelados} cancelados)`}
              </span>
            )}
          </span>
        </div>
      </div>

      <p className="ficha-nota">
        O valor contratado não inclui honorários cancelados. Os totais são
        calculados pelo sistema a partir dos pagamentos registrados.
      </p>

      {honorarios.length === 0 ? (
        <EmptyState
          title="Nenhum honorário neste processo"
          description="Cadastre um honorário para começar a controlar cobranças e recebimentos."
        />
      ) : (
        <ul className="ficha-honorarios">
          {honorarios.map(h => {
            const cancelado = h.status === STATUS_CANCELADO;
            return (
              <li
                key={h._id}
                className={`ficha-honorario${cancelado ? ' ficha-honorario--cancelado' : ''}`}
              >
                <div className="ficha-honorario__cabecalho">
                  <div>
                    <strong className="ficha-honorario__descricao">{h.descricao}</strong>
                    <span className="ficha-honorario__meta">
                      {labelDe(TIPO_HONORARIO_OPTIONS, h.tipo)}
                      {/* Percentual e valor base só existem no tipo percentual;
                          nos demais chegam `null` e não se inventa linha. */}
                      {h.percentual != null && (
                        <> — {formatPercent(h.percentual)} sobre {formatCurrency(h.valorBase)}</>
                      )}
                      {' · vence em '}{formatDate(h.dataVencimento)}
                    </span>
                  </div>
                  <StatusBadge status={h.status} />
                </div>

                <div className="ficha-honorario__totais">
                  <span>Contratado: <strong>{formatCurrency(h.totais.contratado)}</strong></span>
                  <span>Recebido: <strong>{formatCurrency(h.totais.pago)}</strong></span>
                  {/* Rótulo discreto e condicional: `saldoAdiantado` é zero na
                      maioria dos honorários, e uma linha "R$ 0,00" em todos
                      eles só acrescentaria ruído. Quando existe, precisa
                      aparecer — é ele que explica por que o em aberto é menor
                      do que "contratado menos recebido". */}
                  {h.totais.saldoAdiantado > 0 && (
                    <span className="ficha-saldo">
                      Saldo adiantado: <strong>{formatCurrency(h.totais.saldoAdiantado)}</strong>
                    </span>
                  )}
                  <span>Em aberto: <strong>{formatCurrency(h.totais.emAberto)}</strong></span>
                </div>

                {cancelado && (
                  <p className="ficha-aviso">
                    Honorário cancelado — fora do total contratado do processo.
                  </p>
                )}

                {/* ── Parcelas ────────────────────────────────────────────── */}
                {h.parcelas.length === 0 ? (
                  <p className="ficha-vazio">
                    Sem parcelas cadastradas. Enquanto não houver, este honorário
                    conta como não recebido.
                  </p>
                ) : (
                  <ul className="ficha-parcelas">
                    {h.parcelas.map(p => {
                      // ── Parcela SUBSTITUÍDA por reparcelamento (F-1a.1) ──
                      //
                      // Ela não entra em soma nenhuma — isso já valia. O que
                      // mudou é a leitura: a ficha imprimia "em aberto
                      // R$ 2.250,00" numa cobrança que foi substituída, e quem
                      // lê vê dívida que não existe.
                      //
                      // Ela CONTINUA na lista, com valor e recebido à vista:
                      // é histórico e precisa ser auditável. O que sai é só o
                      // "em aberto", que é a única coluna que afirma uma
                      // dívida viva.
                      const reparcelada = Boolean(p.reparcelamentoId);
                      return (
                      <li
                        key={p._id}
                        className={`ficha-parcela${reparcelada ? ' ficha-parcela--reparcelada' : ''}`}
                      >
                        <div className="ficha-parcela__linha">
                          <span className="ficha-parcela__numero">Parcela {p.numeroParcela}</span>
                          <span className="ficha-parcela__valores">
                            {formatCurrency(p.valor)}
                            {' · recebido '}{formatCurrency(p.valorPago)}
                            {/* O "em aberto" some na reparcelada, e só nela:
                                cancelamento avulso continua mostrando o que
                                ficou por cobrar. */}
                            {!reparcelada && (
                              <>
                                {' · em aberto '}
                                <strong>{formatCurrency(p.emAberto)}</strong>
                              </>
                            )}
                          </span>
                          <span className="ficha-parcela__data">
                            vence {formatDate(p.dataVencimento)}
                          </span>
                          {/* "Reparcelada" e não "Cancelado": as duas coisas
                              são cancelamento no banco e leituras diferentes
                              para a advogada — uma foi substituída, a outra
                              foi desfeita. */}
                          <StatusBadge status={reparcelada ? 'reparcelada' : p.status} />
                        </div>

                        {reparcelada && (
                          <p className="ficha-parcela__reparcelada">
                            Substituída pelo reparcelamento
                            {p.reparceladaEm ? ` de ${formatDate(p.reparceladaEm)}` : ''}.
                          </p>
                        )}

                        {/* ── ALOCAÇÕES da parcela (F-1a) ───────────────────
                            Era `p.pagamentos` até a F-0, quando o pagamento
                            pertencia a UMA parcela. Agora são as ALOCAÇÕES: os
                            pedaços de pagamento que encostaram nela. Um mesmo
                            pagamento pode aparecer em duas parcelas, e o valor
                            exibido é o pedaço, não o depósito inteiro — por
                            isso a data do pagamento sai ao lado.
                            A ficha só traz alocação ATIVA, então todo item aqui
                            veio de um pagamento que ainda vale. */}
                        {p.alocacoes.length > 0 && (
                          <ul className="ficha-pagamentos">
                            {p.alocacoes.map(a => (
                              <li key={a._id} className="ficha-pagamento">
                                <span>
                                  {formatDate(a.dataPagamento ?? a.data)} —{' '}
                                  <strong>{formatCurrency(a.valor)}</strong>{' '}
                                  {a.origem === 'saldoAdiantado'
                                    ? '(saldo adiantado)'
                                    : `(${labelDe(FORMA_PAGAMENTO_OPTIONS, a.formaPagamento)})`}
                                  {a.observacoes ? ` · ${a.observacoes}` : ''}
                                </span>
                                <button
                                  type="button"
                                  className="btn-action btn-edit"
                                  onClick={() => baixarRecibo(a.pagamentoId)}
                                  disabled={reciboEmCurso === a.pagamentoId}
                                >
                                  {reciboEmCurso === a.pagamentoId ? 'Baixando…' : 'Baixar recibo'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                      );
                    })}
                  </ul>
                )}

                {/* ── Documentos gerados a partir deste honorário ─────────── */}
                {h.documentos.length > 0 && (
                  <div className="ficha-documentos">
                    <span className="ficha-documentos__titulo">Documentos deste honorário</span>
                    <ul>
                      {h.documentos.map(d => (
                        <li key={d._id}>
                          {d.nome} <span className="ficha-documentos__meta">
                            ({d.tipo} · {formatDate(d.dataGeracao)})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ProcessFinancialSheet;
