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

  useEffect(() => {
    setLoading(true);
    paymentService.listPayments({ page: 1, limit: 20, processoId, formaPagamento: formaPagamento || undefined })
      .then(res => setPayments(res.data.data ?? res.data))
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao buscar pagamentos.')))
      .finally(() => setLoading(false));
  }, [processoId, formaPagamento]);

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
      </div>

      {payments.length === 0 ? (
        <EmptyState
          title="Nenhum recebimento encontrado"
          description="Tente ajustar os filtros ou registre um novo pagamento."
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
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
                  <td>{p.installmentId?.feeId?.descricao ?? '—'}</td>
                  <td>{p.installmentId?.feeId?.processoId?.titulo ?? '—'}</td>
                  <td>{formatCurrency(p.valorPago)}</td>
                  <td>{formatDate(p.dataPagamento)}</td>
                  <td>{labelDe(FORMA_PAGAMENTO_OPTIONS, p.formaPagamento)}</td>
                  <td>{p.observacoes || '—'}</td>
                  <td className="actions-cell">
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
