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
  // Total do conjunto, para saber se a lista exibida está completa (Fase F-0).
  const [total, setTotal] = useState(null);

  // Teto da API. Ver a nota em `PaymentListPage`: esta tela não passava `limit`
  // nenhum e recebia o processo inteiro, porque o caminho de `?processoId=` no
  // backend ignorava a paginação. Corrigido isso, o default de 20 truncaria em
  // silêncio — a tela pede o teto e avisa quando ele não bastou.
  const LIMITE = 100;

  useEffect(() => {
    setLoading(true);
    installmentService.listInstallments({
      page: 1,
      limit: LIMITE,
      processoId,
      status: statusFiltro || undefined,
      inativos: verInativos || undefined
    })
      .then(res => {
        const corpo = res.data;
        setInstallments(corpo.data ?? corpo);
        setTotal(typeof corpo.total === 'number' ? corpo.total : null);
      })
      .catch(err => setError(getFinancialErrorMessage(err, 'Falha ao buscar parcelas.')))
      .finally(() => setLoading(false));
  }, [processoId, statusFiltro, verInativos]);

  // ── `handleReativar` SAIU na F-1a ────────────────────────────────────────
  //
  // `PATCH /installments/:id/reativar` morreu (DEC-034) e responde 404. Parcela
  // que sai de circulação por decisão da advogada sai por REPARCELAMENTO,
  // cancelada COM vínculo: ressuscitá-la colocaria a cobrança substituída ao
  // lado da que a substituiu, e as duas somariam.
  //
  // A exclusão continua existindo para a parcela SEM dinheiro em cima — o 409
  // de alocação ativa barra o resto — e uma parcela excluída por engano se
  // recria por `POST /installments`.

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

  // O `return <Loading/>` antecipado saiu daqui na F-1a.1: ele trocava a árvore
  // inteira — inclusive os controles de filtro — a cada refetch, e o React
  // desmontava e remontava o input, perdendo o foco. O indicador passou para
  // baixo dos controles. Ver a nota longa em `ClientListPage`.

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

      {loading ? (
        <Loading />
      ) : installments.length === 0 ? (
        <EmptyState
          title={verInativos ? 'Nenhuma parcela desativada' : 'Nenhuma cobrança encontrada'}
          description={
            verInativos
              // O modo continua existindo — a parcela ainda é excluível — mas
              // deixou de oferecer reativação na F-1a (DEC-034). É leitura:
              // "quais eu excluí". Uma parcela excluída por engano se recria
              // por "+ Nova Parcela", com o mesmo número, que continua
              // reservado enquanto a antiga existir.
              ? 'Parcelas excluídas aparecem aqui. Para voltar a cobrar, crie uma parcela nova.'
              : 'Tente ajustar os filtros ou crie uma nova parcela.'
          }
        />
      ) : (
        <div className="table-wrapper">
          {/* Aviso de lista incompleta (Fase F-0) — ver a nota em PaymentListPage. */}
          {total !== null && total > installments.length && (
            <p className="aviso-lista-parcial" role="status">
              Mostrando {installments.length} de {total} parcelas. Use os filtros
              para reduzir o conjunto.
            </p>
          )}
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
                <th>Quitação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {installments.map(inst => (
                <tr key={inst._id}>
                  {/* Da parcela ao honorário (F-1b): quem está olhando uma
                      parcela quase sempre quer ver a cobrança inteira, e até
                      aqui não havia caminho — só voltar ao menu. */}
                  <td className="cell-truncate" title={inst.feeId?.descricao || undefined}>
                    {inst.feeId?._id ? (
                      <Link to={`/dashboard/honorarios/${inst.feeId._id}`} className="link-interno">
                        {inst.feeId.descricao || 'Honorário'}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="cell-num">{inst.numeroParcela}</td>
                  <td className="cell-num">{formatCurrency(inst.valor)}</td>
                  {/* `valorPago` continua sendo o campo, e continua somente
                      leitura — o que mudou na F-1a é a FONTE: soma das
                      ALOCAÇÕES ativas, e não mais dos pagamentos da parcela.
                      Um estorno desaloca, e o número desce sozinho. */}
                  <td className="cell-num">{formatCurrency(inst.valorPago ?? 0)}</td>
                  <td className="cell-num">{formatCurrency(Math.max(0, Number(inst.valor || 0) - Number(inst.valorPago || 0)))}</td>
                  <td>{formatDate(inst.dataVencimento)}</td>
                  <td><StatusBadge status={inst.status} /></td>
                  <td>{formatDate(inst.dataPagamento)}</td>
                  <td className="actions-cell">
                    {/* Parcela CANCELADA por reparcelamento não se edita nem se
                        exclui: ela é histórico, e o vínculo com o plano novo é
                        o que torna a renegociação legível meses depois. A tela
                        de reparcelamento é da F-1c; aqui a linha apenas não
                        oferece o que o backend não deve aceitar. */}
                    {inst.status === 'cancelado' ? (
                      <span className="acao-indisponivel">Reparcelada</span>
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
