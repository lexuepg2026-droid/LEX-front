import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
import { formatDate, formatCurrency, formatPercent } from '../../utils/formatters';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE, blockReason } from '../../offline/offlineMessages';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import {
  TIPO_HONORARIO_OPTIONS,
  STATUS_HONORARIO_OPTIONS,
  STATUS_CANCELADO,
  labelDe,
} from '../../utils/enums';
import '../../styles/modules.css';

const POR_PAGINA = 20;

function FeeListPage({ embedded = false }) {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId');
  const online = useOnlineStatus();

  const {
    filtros, buscaDebounced, page, setPage,
    definirFiltro, aplicarPreset, limpar, temFiltro
  } = useListFilters({ tipo: '', status: '' });

  // ── DEC-058 (F-5a): espelho local da listagem, escopado por usuário ─────
  //
  // Guarda-se o ENVELOPE inteiro (`res.data`), e não só a lista: o `total` é
  // ele que diz — e uma tela que voltasse do banco local sem o total mostraria
  // 20 honorários sem dizer que há 25, que é exatamente o defeito que a F-1b.3
  // corrigiu aqui.
  //
  // A tela nunca soube quantos honorários existiam (F-1b.3): ela não passava
  // `page` nem `limit`, recebia os 20 do default do backend e renderizava o
  // array, sem paginador e sem o aviso de lista parcial.
  const consulta = {
    page,
    limit: POR_PAGINA,
    processoId,
    busca: buscaDebounced || undefined,
    tipo: filtros.tipo || undefined,
    status: filtros.status || undefined,
    de: filtros.de || undefined,
    ate: filtros.ate || undefined,
  };
  const { data, loading, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'fees',
    params: consulta,
    fetcher: () => feeService.listFees(consulta).then((res) => res.data),
    fallbackError: 'Falha ao buscar honorários.',
    mapError: getFinancialErrorMessage
  });
  const fees = data?.data ?? (Array.isArray(data) ? data : []);
  const total = typeof data?.total === 'number' ? data.total : 0;

  const confirmDelete = (id) => setDeleteModal({ open: true, id });

  const handleDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal({ open: false, id: null });
    try {
      await feeService.deleteFee(id);
      // Refaz a consulta em vez de recortar a lista na memória: com o espelho
      // local, uma lista recortada só na tela deixaria o dado guardado com o
      // honorário que acabou de sair.
      reload();
      toast.success('Honorário removido com sucesso.');
    } catch (err) {
      // 409 de integridade: o honorário tem parcelas ativas. A mensagem diz
      // quantas, de `dependencia` + `quantidade`, e não destaca campo nenhum.
      toast.error(getFinancialErrorMessage(err, 'Erro ao remover honorário.'));
    }
  };

  // O `return <Loading/>` antecipado saiu daqui na F-1a.1: ele trocava a árvore
  // inteira — inclusive os controles de filtro — a cada refetch, e o React
  // desmontava e remontava o input, perdendo o foco. O indicador passou para
  // baixo dos controles. Ver a nota longa em `ClientListPage`.

  const recorte = descricaoDoRecorteFinanceiro({
    filtros,
    busca: buscaDebounced,
    extras: [
      filtros.tipo ? `do tipo "${labelDe(TIPO_HONORARIO_OPTIONS, filtros.tipo)}"` : null,
      filtros.status ? `com status "${labelDe(STATUS_HONORARIO_OPTIONS, filtros.status)}"` : null
    ]
  });

  const body = (
    <>
      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
      {error && <p className="error-message">{error}</p>}

      {/* `honorarios={null}` — a listagem DE honorários não se filtra por
          honorário. `null` é a ausência do controle; uma lista vazia seria
          "nenhum honorário cadastrado", que é outro estado. */}
      <FinancialFilters
        filtros={filtros}
        definirFiltro={definirFiltro}
        aplicarPreset={aplicarPreset}
        limpar={limpar}
        temFiltro={temFiltro}
        honorarios={null}
        placeholderBusca="Buscar por descrição ou número do processo…"
        descricaoDoRecorte={recorte}
      >
        <select
          value={filtros.tipo}
          onChange={e => definirFiltro('tipo', e.target.value)}
          aria-label="Tipo de honorário"
        >
          <option value="">Todos os tipos</option>
          {TIPO_HONORARIO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {/* Os quatro status da DEC-028. `parcialmente_pago` faltava aqui, e sem
            ele o filtro escondia a maioria dos honorários em andamento. */}
        <select
          value={filtros.status}
          onChange={e => definirFiltro('status', e.target.value)}
          aria-label="Status do honorário"
        >
          <option value="">Todos os status</option>
          {STATUS_HONORARIO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </FinancialFilters>

      {loading ? (
        <Loading />
      ) : fees.length === 0 ? (
        <EmptyState
          title="Nenhum honorário encontrado"
          description={
            temFiltro
              ? `Nenhum honorário ${recorte}. Limpe os filtros para ver a lista inteira.`
              : 'Registre um novo honorário para vê-lo aqui.'
          }
        />
      ) : (
        <div className="table-wrapper">
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`. */}
          <table className="data-table data-table--fixed">
            {/* Dinheiro em `col-money`, data em `col-data`, status em
                `col-status` (F-1b.2). "Valor base" e "Valor" carregam o
                honorário sobre monte-mor, que é o maior número do sistema —
                era a coluna com mais chance de cortar em silêncio. */}
            <colgroup>
              <col />
              <col />
              <col className="col-xs" />
              <col className="col-xxs" />
              <col className="col-money" />
              <col className="col-money" />
              <col className="col-status" />
              <col className="col-data" />
              {/* F-1b.3: largura de UM botão, qualquer que seja o número de
                  ações. Ver `ActionMenu.css`. */}
              <col className="col-acoes-menu" />
            </colgroup>
            <thead>
              <tr>
                <th>Processo</th>
                <th>Descrição</th>
                <th>Tipo</th>
                <th>Percentual</th>
                <th>Valor base</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Vencimento</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fees.map(fee => (
                // Honorário cancelado continua na lista, atenuado: sumir levaria
                // junto o histórico da cobrança que ela desfez.
                <tr
                  key={fee._id}
                  className={fee.status === STATUS_CANCELADO ? 'row-inativa' : undefined}
                >
                  <td className="cell-truncate" title={fee.processoId?.titulo ?? undefined}>{fee.processoId?.titulo ?? '—'}</td>
                  {/* O nome do honorário leva à página dele (F-1b). É o
                      caminho principal para a tela nova, e o que responde
                      "quanto já entrou nesta cobrança" sem passar pela
                      parcela. */}
                  <td className="cell-truncate" title={fee.descricao}>
                    <Link to={`/dashboard/honorarios/${fee._id}`} className="link-interno">
                      {fee.descricao}
                    </Link>
                  </td>
                  <td>{labelDe(TIPO_HONORARIO_OPTIONS, fee.tipo)}</td>
                  <td className="cell-num">{formatPercent(fee.percentual)}</td>
                  <td className="cell-num">{fee.valorBase == null ? '—' : formatCurrency(fee.valorBase)}</td>
                  <td className="cell-num">{formatCurrency(fee.valor)}</td>
                  <td><StatusBadge status={fee.status} /></td>
                  <td>{formatDate(fee.dataVencimento)}</td>
                  <td className="actions-cell actions-cell--menu">
                    <ActionMenu
                      rotulo={`Ações do honorário ${fee.descricao}`}
                      itens={[
                        {
                          rotulo: 'Editar',
                          to: `/dashboard/honorarios/editar/${fee._id}`,
                          motivo: blockReason(null, { online })
                        },
                        {
                          rotulo: 'Excluir',
                          destrutivo: true,
                          motivo: blockReason(null, { online }),
                          onSelecionar: () => confirmDelete(fee._id)
                        }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* O paginador fica FORA do `loading` — ver a nota em `PaymentListPage`. */}
      {!loading && total > 0 && (
        <Paginador
          page={page}
          limit={POR_PAGINA}
          total={total}
          rotulo="honorário"
          onMudarPagina={setPage}
        />
      )}

      <Modal
        open={deleteModal.open}
        title="Remover honorário"
        message="Tem certeza que deseja remover este honorário? Esta ação não pode ser desfeita."
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
      <PageHeader
        title="Honorários"
        actionLabel="+ Novo Honorário"
        actionTo="/dashboard/honorarios/novo"
        actionMotivo={online ? undefined : MENSAGEM_ESCRITA_OFFLINE}
      />
      {body}
    </div>
  );
}

export default FeeListPage;
