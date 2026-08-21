import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import feeService from '../../api/feeService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import Paginador from '../../components/ui/Paginador';
import ActionMenu from '../../components/ui/ActionMenu';
import FinancialFilters from '../../components/financeiro/FinancialFilters';
import { descricaoDoRecorteFinanceiro } from '../../components/financeiro/filterSummary.js';
import useListFilters from '../../hooks/useListFilters';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { rotuloCurtoDoHonorario } from '../../utils/feeLabel';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { STATUS_PARCELA_OPTIONS, labelDe } from '../../utils/enums';
import '../../styles/modules.css';
import { rotuloDaParcela } from '../../components/financeiro/installmentLabel';

const POR_PAGINA = 20;

function InstallmentListPage({ embedded = false }) {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId') || undefined;
  // Modo "desativadas" (Fase 4.5) — ver a nota em PaymentListPage. Vive junto
  // dos demais filtros para que ligá-lo também volte à página 1.
  const [total, setTotal] = useState(0);
  const [honorarios, setHonorarios] = useState([]);

  // ── O teto 100 + "Mostrando N de M" SAIU (F-1b.3) ───────────────────────
  //
  // A tela pedia 100 e avisava quando o conjunto era maior, mandando "usar os
  // filtros". Agora são 20 por página, um paginador de verdade, e os filtros
  // que o aviso mandava usar existem: honorário, busca e período.
  const {
    filtros, buscaDebounced, page, setPage,
    definirFiltro, aplicarPreset, limpar, temFiltro
  } = useListFilters({ status: '', inativos: '' });

  useEffect(() => {
    let ativo = true;
    feeService.listFees({ page: 1, limit: 100 })
      .then((res) => { if (ativo) setHonorarios(res.data.data ?? res.data ?? []); })
      // Falhar ao carregar o seletor não derruba a listagem — ver a nota em
      // `PaymentListPage`.
      .catch(() => { if (ativo) setHonorarios([]); });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError('');
    installmentService.listInstallments({
      page,
      limit: POR_PAGINA,
      processoId,
      honorarioId: filtros.honorarioId || undefined,
      status: filtros.status || undefined,
      inativos: filtros.inativos || undefined,
      busca: buscaDebounced || undefined,
      de: filtros.de || undefined,
      ate: filtros.ate || undefined
    })
      .then(res => {
        if (!ativo) return;
        const corpo = res.data;
        setInstallments(corpo.data ?? corpo);
        setTotal(typeof corpo.total === 'number' ? corpo.total : 0);
      })
      .catch(err => {
        if (ativo) setError(getFinancialErrorMessage(err, 'Falha ao buscar parcelas.'));
      })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [
    processoId, page, buscaDebounced,
    filtros.honorarioId, filtros.status, filtros.inativos, filtros.de, filtros.ate
  ]);

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

  const verInativos = filtros.inativos === 'true';

  const recorte = descricaoDoRecorteFinanceiro({
    filtros,
    busca: buscaDebounced,
    honorarios,
    extras: [
      filtros.status ? `com status "${labelDe(STATUS_PARCELA_OPTIONS, filtros.status)}"` : null,
      verInativos ? 'entre as desativadas' : null
    ]
  });

  const body = (
    <>
      {error && <p className="error-message">{error}</p>}

      <FinancialFilters
        filtros={filtros}
        definirFiltro={definirFiltro}
        aplicarPreset={aplicarPreset}
        limpar={limpar}
        temFiltro={temFiltro}
        honorarios={honorarios}
        placeholderBusca="Buscar por honorário ou processo…"
        descricaoDoRecorte={recorte}
      >
        <select
          value={filtros.status}
          onChange={e => definirFiltro('status', e.target.value)}
          aria-label="Status da parcela"
        >
          <option value="">Todos os status</option>
          {STATUS_PARCELA_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={verInativos}
            onChange={(e) => definirFiltro('inativos', e.target.checked ? 'true' : '')}
          />
          Mostrar desativadas
        </label>
      </FinancialFilters>

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
              : temFiltro
                // O estado vazio diz o RECORTE (F-1b.3): "nenhuma cobrança
                // encontrada" com três controles preenchidos faz procurar a
                // parcela em vez de olhar os filtros.
                ? `Nenhuma parcela ${recorte}. Limpe os filtros para ver a lista inteira.`
                : 'Crie uma nova parcela para vê-la aqui.'
          }
        />
      ) : (
        <div className="table-wrapper">
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`. */}
          <table className="data-table data-table--fixed">
            {/* Dinheiro em `col-money`, data em `col-data`, status em
                `col-status` (F-1b.2). "Valor", "Recebido" e "Em aberto"
                estavam em `col-sm`, que só aguenta até a casa dos milhares;
                as duas datas em `col-xs` saíam "18/08/20…". */}
            <colgroup>
              <col />
              {/* `col-parcela`, e não `col-xxs`: a coluna mostrava "Parce…"
                  desde que a DEC-048 trocou o ordinal nu por "Parcela 1 de 3"
                  e a largura de 80 px continuou sendo a de um número. Ver a
                  conta em `styles/modules.css`. */}
              <col className="col-parcela" />
              <col className="col-money" />
              <col className="col-money" />
              <col className="col-money" />
              <col className="col-data" />
              <col className="col-status" />
              <col className="col-data" />
              {/* F-1b.3: a coluna de ações tem largura de UM botão, qualquer
                  que seja o número de ações. Ver `ActionMenu.css`. */}
              <col className="col-acoes-menu" />
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
                  {/* Trecho distintivo, pelo mesmo motivo da listagem de
                      pagamentos (F-1b.2). */}
                  <td className="cell-truncate" title={inst.feeId?.descricao || undefined}>
                    {inst.feeId?._id ? (
                      <Link to={`/dashboard/honorarios/${inst.feeId._id}`} className="link-interno">
                        {rotuloCurtoDoHonorario(inst.feeId.descricao)}
                      </Link>
                    ) : '—'}
                  </td>
                  {/* DEC-048: a coluna deixou de ser o ordinal nu. "Parcela 3"
                      de um plano de três é a primeira, e era o que esta coluna
                      dizia depois de um reparcelamento. O `totalNoPlano` vem
                      do backend porque esta listagem atravessa honorários —
                      contar o plano aqui daria o tamanho da PÁGINA. */}
                  <td className="cell-num">
                    {rotuloDaParcela({
                      numeroParcela: inst.numeroParcela,
                      totalParcelas: inst.totalParcelas ?? null,
                      totalNoPlanoVigente: inst.totalNoPlano ?? null
                    })}
                  </td>
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
                  <td className="actions-cell actions-cell--menu">
                    {/* Parcela CANCELADA por reparcelamento não se edita nem se
                        exclui: ela é histórico, e o vínculo com o plano novo é
                        o que torna a renegociação legível meses depois. A tela
                        de reparcelamento é da F-1c; aqui a linha apenas não
                        oferece o que o backend não deve aceitar.

                        "Reparcelada" é EXPLICAÇÃO, não ação: fica na célula, e
                        não dentro do menu — pelo mesmo motivo que a nota "sem
                        recibo" da listagem de pagamentos. */}
                    {inst.status === 'cancelado' ? (
                      <span className="acao-indisponivel">Reparcelada</span>
                    ) : (
                      <ActionMenu
                        rotulo={`Ações da ${rotuloDaParcela({ numeroParcela: inst.numeroParcela, totalParcelas: inst.totalParcelas ?? null, totalNoPlanoVigente: inst.totalNoPlano ?? null }).toLowerCase()}`}
                        itens={[
                          { rotulo: 'Editar', to: `/dashboard/parcelas/editar/${inst._id}` },
                          {
                            rotulo: 'Excluir',
                            destrutivo: true,
                            onSelecionar: () => confirmDelete(inst._id)
                          }
                        ]}
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* O paginador fica FORA do `loading`: some-lo durante a consulta faria a
          página pular a cada clique em "Próxima". */}
      {!loading && total > 0 && (
        <Paginador
          page={page}
          limit={POR_PAGINA}
          total={total}
          rotulo="parcela"
          onMudarPagina={setPage}
        />
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
