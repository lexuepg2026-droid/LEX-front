import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import paymentService from '../../api/paymentService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { FORMA_PAGAMENTO_OPTIONS, labelDe } from '../../utils/enums';
import '../../styles/modules.css';

function PaymentListPage({ embedded = false }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId') || undefined;
  const [formaPagamento, setFormaPagamento] = useState('');
  // Um recibo por vez, por id: sem isso o botão de TODAS as linhas ficaria em
  // "Baixando…" enquanto um só está sendo gerado.
  const [reciboEmCurso, setReciboEmCurso] = useState(null);
  // ── Modo "desativados" (Fase 4.5) ────────────────────────────────────────
  // A listagem padrão só traz pagamento ativo, então o desativado era invisível
  // e a rota de reativação não tinha porta de entrada na interface. O modo é
  // exclusivo, e não um "incluir": misturar os dois conjuntos faria a coluna de
  // valor somar o que foi estornado sem nada dizendo isso na linha.
  const [verInativos, setVerInativos] = useState(false);
  const [reativando, setReativando] = useState(null);
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

  useEffect(() => {
    setLoading(true);
    paymentService.listPayments({
      page: 1,
      limit: LIMITE,
      processoId,
      formaPagamento: formaPagamento || undefined,
      inativos: verInativos || undefined
    })
      .then(res => {
        const corpo = res.data;
        setPayments(corpo.data ?? corpo);
        setTotal(typeof corpo.total === 'number' ? corpo.total : null);
      })
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao buscar pagamentos.')))
      .finally(() => setLoading(false));
  }, [processoId, formaPagamento, verInativos]);

  // Reativar devolve o pagamento ao conjunto e dispara o recálculo da parcela e
  // do honorário no backend. A linha sai da lista de desativados na hora — é
  // esta lista que ela deixa de pertencer.
  const handleReativar = async (id) => {
    setReativando(id);
    try {
      await paymentService.reativarPayment(id);
      setPayments(payments.filter(p => p._id !== id));
      toast.success('Pagamento reativado. O status da parcela e do honorário foi recalculado.');
    } catch (err) {
      // 409 com `dependencia: "parcela"` quando a parcela está desativada. A
      // mensagem do backend já diz o que fazer ("Reative a parcela antes").
      toast.error(getFinancialErrorMessage(err, 'Não foi possível reativar o pagamento.'));
    } finally {
      setReativando(null);
    }
  };

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleRemove = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await paymentService.removePayment(id);
      setPayments(payments.filter(p => p._id !== id));
      toast.success('Pagamento removido com sucesso.');
    } catch (err) {
      toast.error(getFinancialErrorMessage(err, 'Erro ao remover pagamento.'));
    }
  };

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

  if (loading) return <Loading />;

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

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={verInativos}
            onChange={(e) => setVerInativos(e.target.checked)}
          />
          Mostrar desativados
        </label>
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title={verInativos ? 'Nenhum pagamento desativado' : 'Nenhum recebimento encontrado'}
          description={
            verInativos
              ? 'Pagamentos removidos aparecem aqui e podem ser reativados.'
              : 'Tente ajustar os filtros ou registre um novo pagamento.'
          }
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
            <colgroup>
              <col className="col-xs" />
              <col />
              <col />
              <col className="col-sm" />
              <col className="col-xs" />
              <col className="col-sm" />
              <col />
              <col className="col-acoes-3-lg" />
            </colgroup>
            <thead>
              <tr>
                <th>Parcela</th>
                <th>Honorário</th>
                <th>Processo</th>
                <th>Valor Pago</th>
                <th>Data</th>
                <th>Forma</th>
                <th>Observações</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p._id}>
                  <td>Parcela {p.installmentId?.numeroParcela ?? '—'}</td>
                  <td className="cell-truncate" title={p.installmentId?.feeId?.descricao ?? undefined}>{p.installmentId?.feeId?.descricao ?? '—'}</td>
                  <td className="cell-truncate" title={p.installmentId?.feeId?.processoId?.titulo ?? undefined}>{p.installmentId?.feeId?.processoId?.titulo ?? '—'}</td>
                  <td className="cell-num">{formatCurrency(p.valorPago)}</td>
                  <td>{formatDate(p.dataPagamento)}</td>
                  <td className="cell-truncate">{labelDe(FORMA_PAGAMENTO_OPTIONS, p.formaPagamento)}</td>
                  <td className="cell-truncate" title={p.observacoes || undefined}>{p.observacoes || '—'}</td>
                  <td className="actions-cell">
                    {/* Desativado só oferece "Reativar": editar ou baixar
                        recibo de um pagamento estornado são as duas coisas que
                        o backend recusa, e oferecer o botão seria prometer o
                        que a rota nega. */}
                    {p.ativo === false ? (
                      <button
                        type="button"
                        onClick={() => handleReativar(p._id)}
                        disabled={reativando === p._id}
                        className="btn-action btn-edit"
                      >
                        {reativando === p._id ? 'Reativando…' : 'Reativar'}
                      </button>
                    ) : (
                      <>
                    {/* Só pagamento ATIVO tem recibo. A rota responde 404 para
                        o desativado, e oferecer o botão seria prometer um papel
                        que o backend recusa emitir — de propósito. */}
                    {p.ativo !== false && (
                      <button
                        type="button"
                        onClick={() => baixarRecibo(p._id)}
                        disabled={reciboEmCurso === p._id}
                        className="btn-action btn-edit"
                      >
                        {reciboEmCurso === p._id ? 'Baixando…' : 'Baixar recibo'}
                      </button>
                    )}
                    <Link to={`/dashboard/pagamentos/editar/${p._id}`} className="btn-action btn-edit">Editar</Link>
                    <button onClick={() => confirmDelete(p._id)} className="btn-action btn-delete">Remover</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={deleteModal.open}
        title="Remover pagamento"
        message="Tem certeza que deseja remover este pagamento? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </>
  );

  if (embedded) return body;

  return (
    <div className="module-container">
      <PageHeader title="Pagamentos" actionLabel="+ Novo Pagamento" actionTo="/dashboard/pagamentos/novo" />
      {body}
    </div>
  );
}

export default PaymentListPage;
