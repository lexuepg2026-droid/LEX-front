import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import paymentService from '../../api/paymentService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { rotuloCurtoDoHonorario } from '../../utils/feeLabel';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { FORMA_PAGAMENTO_OPTIONS, labelDe } from '../../utils/enums';
import { rotuloDasParcelas, temEstorno, estornadoIntegralmente } from './paymentRow.js';
import ReversalModal from '../../components/financeiro/ReversalModal';
import '../../styles/modules.css';

function PaymentListPage({ embedded = false }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId') || undefined;
  const [formaPagamento, setFormaPagamento] = useState('');
  // Um recibo por vez, por id: sem isso o botão de TODAS as linhas ficaria em
  // "Baixando…" enquanto um só está sendo gerado.
  const [reciboEmCurso, setReciboEmCurso] = useState(null);
  // O id do pagamento cujo modal de estorno está aberto (F-1b).
  const [estornoAberto, setEstornoAberto] = useState(null);
  // ── O modo "desativados" SAIU na F-1a ────────────────────────────────────
  //
  // Ele existia para a rota de reativação ter porta de entrada na interface. A
  // rota morreu (DEC-034) e o pagamento deixou de ser desativável: desfazer
  // entrada é ESTORNO, e o pagamento estornado continua na listagem — com o
  // valor líquido dizendo quanto dele ainda vale.
  //
  // Um filtro que nunca devolve nada é pior que a ausência dele: sugere que
  // existe um conjunto para olhar, e a advogada procuraria ali o pagamento que
  // ela estornou.
  // Total do conjunto, para saber se a lista exibida está completa (Fase F-0).
  const [total, setTotal] = useState(null);

  // Quantos itens a tela pede. É o TETO da API (`Math.min(100, …)` no
  // controller), e não 20, por causa da Fase F-0: até ela, `?processoId=`
  // tinha um caminho próprio no backend que devolvia TUDO, ignorando `limit`.
  // Esta tela pedia 20, recebia o processo inteiro e renderizava o array sem
  // paginador — funcionava por causa do defeito.
  //
  // Corrigido o backend, pedir 20 passaria a truncar em silêncio. Pedir o teto
  // e DIZER quando ele foi atingido é a troca honesta: quem tem mais de 100
  // pagamentos num processo vê o aviso em vez de uma lista curta que parece
  // completa. O paginador de verdade entra na F-1, que reescreve estas telas.
  const LIMITE = 100;

  // Uma função só para as duas ocasiões de ler a lista: a montagem e a volta
  // do modal de estorno. Duplicar a chamada faria as duas divergirem no dia em
  // que um filtro novo entrasse (e a F-1b.2 vai acrescentar vários).
  const carregarPagamentos = useCallback(({ comSpinner }) => {
    if (comSpinner) setLoading(true);
    return paymentService.listPayments({
      page: 1,
      limit: LIMITE,
      processoId,
      formaPagamento: formaPagamento || undefined
    })
      .then(res => {
        const corpo = res.data;
        setPayments(corpo.data ?? corpo);
        setTotal(typeof corpo.total === 'number' ? corpo.total : null);
      })
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao buscar pagamentos.')))
      .finally(() => { if (comSpinner) setLoading(false); });
  }, [processoId, formaPagamento]);

  useEffect(() => {
    carregarPagamentos({ comSpinner: true });
  }, [carregarPagamentos]);

  // ── `handleReativar`, `confirmDelete` e `handleRemove` SAÍRAM na F-1a ────
  //
  // As três rotas por trás delas morreram: `PATCH /:id/reativar` e
  // `DELETE /:id` respondem 404 desde a DEC-032/DEC-034.
  //
  // Não há "Remover pagamento" porque um registro de dinheiro não se apaga —
  // ele se ESTORNA, e o estorno diz QUANDO e POR QUÊ o valor voltou. O modal de
  // confirmação saiu junto: ele perguntava "esta ação não pode ser desfeita",
  // sobre uma ação que agora nem existe.
  //
  // A tela de estorno é da F-1b. Até ela, a listagem já mostra o líquido de
  // cada linha — que é a informação que o estorno produz.

  // ── Recibo ────────────────────────────────────────────────────────────────
  //
  // Blob + <a download> temporário, com o nome vindo do `Content-Disposition`
  // (`api/paymentService.js`). Não se abre a URL crua em nova aba: o cookie é
  // httpOnly e quem o carrega é o axios, e um pagamento desativado mostraria a
  // tela de erro do navegador em vez da mensagem tratada.
  const baixarRecibo = async (id) => {
    setReciboEmCurso(id);
    try {
      const { nome } = await paymentService.baixarEsalvarRecibo(id);
      toast.success(`Recibo baixado: ${nome}`);
    } catch (err) {
      // 404 quando o pagamento (ou a parcela, o honorário, o processo) está
      // desativado. Recibo de pagamento estornado é justamente o papel que não
      // pode existir.
      toast.error(getFinancialErrorMessage(err, 'Não foi possível gerar o recibo.'));
    } finally {
      setReciboEmCurso(null);
    }
  };

  // O `return <Loading/>` antecipado saiu daqui na F-1a.1: ele trocava a árvore
  // inteira — inclusive os controles de filtro — a cada refetch, e o React
  // desmontava e remontava o input, perdendo o foco. O indicador passou para
  // baixo dos controles. Ver a nota longa em `ClientListPage`.

  const body = (
    <>
      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <select value={formaPagamento} onChange={e => setFormaPagamento(e.target.value)}>
          <option value="">Todas as formas</option>
          {FORMA_PAGAMENTO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : payments.length === 0 ? (
        <EmptyState
          title="Nenhum recebimento encontrado"
          description="Tente ajustar os filtros ou registre um novo pagamento."
        />
      ) : (
        <div className="table-wrapper">
          {/* O aviso de lista incompleta (Fase F-0). Só aparece quando o
              conjunto é maior do que o que coube — o silêncio no lugar dele
              seria uma lista curta com cara de completa, e a advogada somaria
              recebimentos que não estão todos ali. */}
          {total !== null && total > payments.length && (
            <p className="aviso-lista-parcial" role="status">
              Mostrando {payments.length} de {total} recebimentos. Use os filtros
              para reduzir o conjunto.
            </p>
          )}
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`.
              "Observações" é texto livre digitado pela advogada, sem teto: era
              a coluna mais exposta ao defeito que a fase corrigiu. */}
          <table className="data-table data-table--fixed">
            {/* ── As larguras, e o que a F-1b.2 corrigiu ──────────────────
                "Honorário" era `col-xs` (100 px) e cortava em ~8 caracteres:
                como quase toda descrição começa por "Honorários advocatícios",
                a coluna inteira dizia "Honorári…" e não distinguia linha
                nenhuma. "Líquido" era `col-xs` pelo mesmo motivo e saía
                "R$ 3.50…".

                Dinheiro vai em `col-money`, data em `col-data`, e o texto
                livre ("Processo", "Aplicado em", "Forma") fica `auto`: é ele
                que cede espaço quando a tabela não cabe, porque é o único que
                tem `title` devolvendo o texto inteiro. */}
            <colgroup>
              <col className="col-lg" />
              <col />
              <col />
              <col className="col-money" />
              <col className="col-money" />
              <col className="col-data" />
              <col />
              <col className="col-acoes-2-lg" />
            </colgroup>
            <thead>
              <tr>
                {/* "Parcela" virou "Honorário" na primeira coluna: o pagamento
                    deixou de pertencer a UMA parcela (DEC-032). Quais parcelas
                    ele tocou sai na coluna "Aplicado em", que pode dizer duas. */}
                <th>Honorário</th>
                <th>Processo</th>
                <th>Aplicado em</th>
                <th>Valor</th>
                <th>Líquido</th>
                <th>Data</th>
                <th>Forma</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id}>
                  {/* Do pagamento ao honorário (F-1b). */}
                  {/* O TRECHO DISTINTIVO, não a descrição inteira (F-1b.2):
                      "Honorários advocatícios — " é prefixo de quase toda
                      linha, e era só ele que cabia na coluna. O texto integral
                      continua no `title` e na página para onde o link leva. */}
                  <td className="cell-truncate" title={p.honorarioId?.descricao ?? undefined}>
                    {p.honorarioId?._id ? (
                      <Link to={`/dashboard/honorarios/${p.honorarioId._id}`} className="link-interno">
                        {rotuloCurtoDoHonorario(p.honorarioId.descricao)}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="cell-truncate" title={p.honorarioId?.processoId?.titulo ?? undefined}>{p.honorarioId?.processoId?.titulo ?? '—'}</td>
                  <td className="cell-truncate" title={rotuloDasParcelas(p)}>{rotuloDasParcelas(p)}</td>
                  <td className="cell-num">{formatCurrency(p.valor)}</td>
                  {/* O líquido é o que ainda vale depois dos estornos. Exibido
                      ao lado do bruto, e não no lugar dele: os dois números são
                      fatos distintos, e trocar um pelo outro apagaria a
                      informação de que houve estorno. */}
                  <td className={`cell-num${temEstorno(p) ? ' valor-estornado' : ''}`}>
                    {formatCurrency(p.valorLiquido ?? p.valor)}
                    {/* O BADGE (F-1b.2). "R$ 0,00" sozinho no líquido é um
                        número correto e mudo: não diz se o pagamento foi
                        estornado, se foi lançado errado ou se a tela falhou.
                        O rótulo sai do `statusVisual`, como todo rótulo de
                        estado desde a 4.3 — nunca de string escrita aqui. */}
                    {estornadoIntegralmente(p) && (
                      <StatusBadge status="estornado_integralmente" />
                    )}
                  </td>
                  <td>{formatDate(p.data)}</td>
                  <td className="cell-truncate">{labelDe(FORMA_PAGAMENTO_OPTIONS, p.formaPagamento)}</td>
                  <td className="actions-cell">
                    {/* Pagamento integralmente estornado não tem recibo: a rota
                        responde 404 de propósito, e oferecer o botão seria
                        prometer um papel que o backend recusa emitir.

                        ── O BURACO SILENCIOSO (F-1b) ──────────────────────
                        Até aqui, nesse caso, a célula ficava simplesmente
                        VAZIA — e uma ausência não explica nada: a advogada via
                        um espaço em branco onde as outras linhas têm botão e
                        não tinha como saber se era regra ou falha da tela.
                        Agora o motivo está escrito. O badge "estornado
                        integralmente" na coluna do valor é da F-1b.2; o que
                        esta fase resolve é não deixar o vazio mudo. */}
                    {(p.valorLiquido ?? p.valor) > 0 ? (
                      <button
                        type="button"
                        onClick={() => baixarRecibo(p._id)}
                        disabled={reciboEmCurso === p._id}
                        className="btn-action btn-edit"
                      >
                        {reciboEmCurso === p._id ? 'Baixando…' : 'Baixar recibo'}
                      </button>
                    ) : (
                      <span className="sem-recibo" title="A emissão de recibo é recusada pelo servidor para pagamento sem valor líquido.">
                        sem recibo
                      </span>
                    )}
                    {/* Estornar a partir da LINHA do pagamento (F-1b): é onde a
                        advogada está quando percebe que o dinheiro voltou. */}
                    {(p.valorLiquido ?? p.valor) > 0 && (
                      <button
                        type="button"
                        onClick={() => setEstornoAberto(p._id)}
                        className="btn-action btn-edit"
                      >
                        Estornar
                      </button>
                    )}
                    <Link to={`/dashboard/pagamentos/editar/${p._id}`} className="btn-action btn-edit">Editar</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // O modal é montado UMA vez para a tela, e não uma por linha: são dezenas de
  // linhas, e o estado (`aberto`, `pagamentoId`) é da tela, não da linha.
  const modal = (
    <ReversalModal
      open={Boolean(estornoAberto)}
      pagamentoId={estornoAberto}
      onFechar={() => setEstornoAberto(null)}
      onConcluido={async (mensagem) => {
        setEstornoAberto(null);
        toast.success(mensagem);
        // Sem spinner: trocar a lista inteira por um `<Loading />` depois de um
        // estorno faria a advogada perder de vista a linha que ela acabou de
        // mexer. Os números se atualizam no lugar.
        await carregarPagamentos({ comSpinner: false });
      }}
    />
  );

  if (embedded) return <>{body}{modal}</>;

  return (
    <div className="module-container">
      <PageHeader title="Pagamentos" actionLabel="+ Novo Pagamento" actionTo="/dashboard/pagamentos/novo" />
      {body}
      {modal}
    </div>
  );
}

export default PaymentListPage;
