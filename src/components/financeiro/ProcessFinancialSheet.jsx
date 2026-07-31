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
                    {h.parcelas.map(p => (
                      <li key={p._id} className="ficha-parcela">
                        <div className="ficha-parcela__linha">
                          <span className="ficha-parcela__numero">Parcela {p.numeroParcela}</span>
                          <span className="ficha-parcela__valores">
                            {formatCurrency(p.valor)}
                            {' · recebido '}{formatCurrency(p.valorPago)}
                            {' · em aberto '}
                            <strong>{formatCurrency(p.emAberto)}</strong>
                          </span>
                          <span className="ficha-parcela__data">
                            vence {formatDate(p.dataVencimento)}
                          </span>
                          <StatusBadge status={p.status} />
                        </div>

                        {/* ── Pagamentos da parcela ─────────────────────────
                            A ficha só traz pagamento ATIVO, então todo item
                            aqui tem recibo. */}
                        {p.pagamentos.length > 0 && (
                          <ul className="ficha-pagamentos">
                            {p.pagamentos.map(pg => (
                              <li key={pg._id} className="ficha-pagamento">
                                <span>
                                  {formatDate(pg.dataPagamento)} —{' '}
                                  <strong>{formatCurrency(pg.valorPago)}</strong>{' '}
                                  ({labelDe(FORMA_PAGAMENTO_OPTIONS, pg.formaPagamento)})
                                  {pg.observacoes ? ` · ${pg.observacoes}` : ''}
                                </span>
                                <button
                                  type="button"
                                  className="btn-action btn-edit"
                                  onClick={() => baixarRecibo(pg._id)}
                                  disabled={reciboEmCurso === pg._id}
                                >
                                  {reciboEmCurso === pg._id ? 'Baixando…' : 'Baixar recibo'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
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
