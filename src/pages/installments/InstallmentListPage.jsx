import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { STATUS_PARCELA_OPTIONS } from '../../utils/enums';
import '../../styles/modules.css';

function InstallmentListPage({ embedded = false }) {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId') || undefined;
  const [statusFiltro, setStatusFiltro] = useState('');
  // Modo "desativadas" (Fase 4.5) — ver a nota em PaymentListPage.
  const [verInativos, setVerInativos] = useState(false);
  const [reativando, setReativando] = useState(null);

  useEffect(() => {
    setLoading(true);
    installmentService.listInstallments({
      processoId,
      status: statusFiltro || undefined,
      inativos: verInativos || undefined
    })
      .then(res => setInstallments(res.data.data ?? res.data))
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao buscar parcelas.')))
      .finally(() => setLoading(false));
  }, [processoId, statusFiltro, verInativos]);

  // Reativar devolve a parcela ao conjunto do honorário e dispara o recálculo
  // dos dois níveis no backend.
  const handleReativar = async (id) => {
    setReativando(id);
    try {
      await installmentService.reativarInstallment(id);
      setInstallments(installments.filter(i => i._id !== id));
      toast.success('Parcela reativada. O status do honorário foi recalculado.');
    } catch (err) {
      // 409 com `dependencia: "honorario"` quando o honorário está desativado.
      toast.error(getFinancialErrorMessage(err, 'Não foi possível reativar a parcela.'));
    } finally {
      setReativando(null);
    }
  };

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await installmentService.deleteInstallment(id);
      setInstallments(installments.filter(i => i._id !== id));
      toast.success('Parcela removida com sucesso.');
    } catch (err) {
      // 409 de integridade: a parcela tem pagamentos ativos. A mensagem diz
      // QUANTOS, de `dependencia` + `quantidade`, e não destaca campo nenhum —
      // o conflito é entre registros gravados, não num input.
      toast.error(getFinancialErrorMessage(err, 'Erro ao remover parcela.'));
    }
  };

  if (loading) return <Loading />;

  const body = (
    <>
      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_PARCELA_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={verInativos}
            onChange={(e) => setVerInativos(e.target.checked)}
          />
          Mostrar desativadas
        </label>
      </div>

      {installments.length === 0 ? (
        <EmptyState
          title={verInativos ? 'Nenhuma parcela desativada' : 'Nenhuma cobrança encontrada'}
          description={
            verInativos
              ? 'Parcelas excluídas aparecem aqui e podem ser reativadas.'
              : 'Tente ajustar os filtros ou crie uma nova parcela.'
          }
        />
      ) : (
        <div className="table-wrapper">
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`. */}
          <table className="data-table data-table--fixed">
            <colgroup>
              <col />
              <col className="col-xxs" />
              <col className="col-sm" />
              <col className="col-sm" />
              <col className="col-sm" />
              <col className="col-xs" />
              <col className="col-xs" />
              <col className="col-xs" />
              <col className="col-acoes-2" />
            </colgroup>
            <thead>
              <tr>
                <th>Honorário</th>
                <th>Nº Parcela</th>
                <th>Valor</th>
                {/* `valorPago` e o que falta: as duas colunas que a advogada
                    abre esta lista para ver. Somente leitura — a soma é
                    mantida pelo backend a partir dos pagamentos ativos. */}
                <th>Recebido</th>
                <th>Em aberto</th>
                <th>Vencimento</th>
                <th>Status</th>
                <th>Pagamento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {installments.map(inst => (
                <tr key={inst._id}>
                  <td className="cell-truncate" title={inst.feeId?.descricao || undefined}>{inst.feeId?.descricao || '—'}</td>
                  <td className="cell-num">{inst.numeroParcela}</td>
                  <td className="cell-num">{formatCurrency(inst.valor)}</td>
                  <td className="cell-num">{formatCurrency(inst.valorPago ?? 0)}</td>
                  <td className="cell-num">{formatCurrency(Math.max(0, Number(inst.valor || 0) - Number(inst.valorPago || 0)))}</td>
                  <td>{formatDate(inst.dataVencimento)}</td>
                  <td><StatusBadge status={inst.status} /></td>
                  <td>{formatDate(inst.dataPagamento)}</td>
                  <td className="actions-cell">
                    {inst.ativo === false ? (
                      <button
                        type="button"
                        onClick={() => handleReativar(inst._id)}
                        disabled={reativando === inst._id}
                        className="btn-action btn-edit"
                      >
                        {reativando === inst._id ? 'Reativando…' : 'Reativar'}
                      </button>
                    ) : (
                      <>
                        <Link to={`/dashboard/parcelas/editar/${inst._id}`} className="btn-action btn-edit">Editar</Link>
                        <button onClick={() => confirmDelete(inst._id)} className="btn-action btn-delete">Excluir</button>
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
        title="Remover parcela"
        message="Tem certeza que deseja remover esta parcela? Esta ação não pode ser desfeita."
        variant="danger"
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, id: null })}
      />
    </>
  );

  if (embedded) return body;

  return (
    <div className="module-container">
      <PageHeader title="Parcelas" actionLabel="+ Nova Parcela" actionTo="/dashboard/parcelas/novo" />
      {body}
    </div>
  );
}

export default InstallmentListPage;
