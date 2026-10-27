import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import feeService from '../../api/feeService';
import CabecalhoDeLista from '../../components/financeiro/CabecalhoDeLista';
import useLinhaClicavel from '../../components/financeiro/useLinhaClicavel';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import Paginador from '../../components/ui/Paginador';
import ActionMenu from '../../components/ui/ActionMenu';
import FinancialFilters from '../../components/financeiro/FinancialFilters';
import { descricaoDoRecorteFinanceiro } from '../../components/financeiro/filterSummary.js';
import useListFilters, { FILTROS_DAS_FINANCEIRAS } from '../../hooks/useListFilters';
import useProcessoFiltrado from '../../hooks/useProcessoFiltrado';
import ProcessFilterChip from '../../components/ui/ProcessFilterChip';
import { formatDate, formatCurrency } from '../../utils/formatters';
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
  nomeDoCliente,
} from '../../utils/enums';
import '../../styles/modules.css';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';

const POR_PAGINA = 20;

function FeeListPage() {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  // `?processoId=` vem das abas do processo. A lista filtrava por ele sem
  // dizer; agora ele aparece num chip e na frase do recorte (DEC-070).
  const filtroProcesso = useProcessoFiltrado({ avisoProprio: true });
  const processoId = filtroProcesso.processoId || undefined;
  const online = useOnlineStatus();

  const {
    filtros, buscaDebounced, page, setPage,
    definirFiltro, aplicarPreset, limpar, temFiltro
  } = useListFilters({ tipo: '', status: '' }, FILTROS_DAS_FINANCEIRAS);

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
  const { data, loading: carregando, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'fees',
    params: consulta,
    fetcher: () => feeService.listFees(consulta).then((res) => res.data),
    fallbackError: 'Falha ao buscar honorários.',
    mapError: getFinancialErrorMessage
  });
  const fees = data?.data ?? (Array.isArray(data) ? data : []);
  const total = typeof data?.total === 'number' ? data.total : 0;
  // O "(37)" do título só com resposta na mão (DEC-102).
  const totalConhecido = typeof data?.total === 'number' ? data.total : null;
  const clicarNaLinha = useLinhaClicavel();
  // `loading` é a PRIMEIRA carga: só ela troca a tabela pelo indicador. A
  // recarga por troca de filtro (`carregando`) mantém a tabela (ver o JSX).
  const loading = carregando && !data;

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
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getFinancialErrorMessage(err, 'Erro ao remover honorário.'));
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
    ],
    processo: processoId ? { rotulo: filtroProcesso.rotulo } : null
  });

  // O processo da URL é um filtro como os outros: conta como "filtrado" para a
  // barra e para o estado vazio, e o "Limpar filtros" o remove junto — senão a
  // frase diria "do processo X" e o botão deixaria o processo de pé.
  const filtrado = temFiltro || Boolean(processoId);
  // O `processoId` sai no mesmo `limpar` da URL (uma escrita só — duas
  // seguidas se atropelariam). Desde a 3.7 a lista só existe na página
  // própria: o Financeiro deixou de embuti-la (DEC-130).
  const limparTudo = limpar;

  const body = (
    <>
      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
      {/* DEC-109: a faixa não mostra o aviso do processo do filtro — esta tela
          mostra, quando a lista em si veio da rede e só o processo do espelho. */}
      {!fromCache && filtroProcesso.fromCache && <OfflineNotice atualizadoEm={filtroProcesso.updatedAt} />}
      {error && <p className="error-message">{error}</p>}
      {processoId && (
        <ProcessFilterChip
          rotulo={filtroProcesso.rotulo}
          carregando={filtroProcesso.carregando}
          onRemover={filtroProcesso.remover}
        />
      )}

      {/* `honorarios={null}` — a listagem DE honorários não se filtra por
          honorário. `null` é a ausência do controle; uma lista vazia seria
          "nenhum honorário cadastrado", que é outro estado. */}
      <FinancialFilters
        filtros={filtros}
        definirFiltro={definirFiltro}
        aplicarPreset={aplicarPreset}
        limpar={limparTudo}
        temFiltro={filtrado}
        honorarios={null}
        placeholderBusca="Buscar por descrição, processo ou cliente…"
        descricaoDoRecorte={recorte}
        semBusca
        pilulas
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

      {/* Fase 3.2: o `<Loading />` só na PRIMEIRA carga. Trocar um filtro com
          a lista na tela mantém a tabela (esmaecida, `aria-busy`) até a
          resposta nova — trocá-la pelo indicador encolhia a página e a
          rolagem voltava ao topo (medido no navegador: 200 → 0 px). */}
      {loading ? (
        <Loading />
      ) : fees.length === 0 ? (
        <EmptyState
          title="Nenhum honorário encontrado"
          description={
            filtrado
              ? `Nenhum honorário ${recorte}. Limpe os filtros para ver a lista inteira.`
              : 'Registre um novo honorário para vê-lo aqui.'
          }
        />
      ) : (
        <div className="table-wrapper" aria-busy={carregando || undefined}>
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`. */}
          <table className="data-table data-table--fixed data-table--acoes-fixas data-table--primeira-fixa data-table--acoes-sem-nota">
            {/* Dinheiro em `col-money`, data em `col-data`, status em
                `col-status` (F-1b.2). "Valor" carrega o honorário sobre
                monte-mor, que é o maior número do sistema — era a coluna com
                mais chance de cortar em silêncio. */}
            <colgroup>
              {/* Fase 3.2 (DEC-102): o cliente principal ao lado do processo
                  (apontamentos 3 e 4). As colunas de texto ganharam largura:
                  com três `auto`, a soma das fixas (890 px) já passava da área
                  útil, e as de texto colapsavam para 0 px a 768 e ~100 a 1280
                  (medido no navegador). Agora a tabela rola DENTRO do
                  `.table-wrapper` e nenhuma coluna some. */}
              {/* Fase 3.7 (DEC-133): a Descrição passou a ser a PRIMEIRA coluna —
                  é ela que identifica a linha, e é a coluna fixa à esquerda.
                  Processo e cliente são `prio-2`; o tipo, `prio-3`. */}
              <col className="col-lg" />
              <col className="col-md prio-2" />
              <col className="col-md prio-2" />
              <col className="col-xs prio-3" />
              {/* Fase 3.3 (DEC-107): saíram "Percentual" e "Valor base" — os
                  dois estão no detalhe do honorário, e eram 230 px que
                  empurravam o ⋮ para fora da vista. Fica o "Valor". */}
              <col className="col-money" />
              <col className="col-status" />
              <col className="col-data" />
              {/* F-1b.3: largura de UM botão, qualquer que seja o número de
                  ações. Ver `ActionMenu.css`. */}
              <col className="col-acoes-menu" />
            </colgroup>
            <thead>
              <tr>
                <th>Descrição</th>
                <th className="prio-2">Processo</th>
                <th className="prio-2">Cliente</th>
                <th className="prio-3">Tipo</th>
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
                // A linha inteira leva ao detalhe do honorário, como o link do
                // nome (DEC-102); o menu ⋮ não dispara a linha.
                <tr
                  key={fee._id}
                  className={`linha-clicavel${fee.status === STATUS_CANCELADO ? ' row-inativa' : ''}`}
                  onClick={clicarNaLinha(`/dashboard/honorarios/${fee._id}`)}
                >
                  {/* O nome do honorário leva à página dele (F-1b). É o
                      caminho principal para a tela nova, e o que responde
                      "quanto já entrou nesta cobrança" sem passar pela
                      parcela. */}
                  <td className="cell-truncate" title={fee.descricao}>
                    <Link to={`/dashboard/honorarios/${fee._id}`} className="link-interno">
                      {fee.descricao}
                    </Link>
                  </td>
                  <td className="cell-truncate prio-2" title={fee.processoId?.titulo ?? undefined}>{fee.processoId?.titulo ?? '—'}</td>
                  <td className="cell-truncate prio-2" title={clienteDaLinha(fee) ?? undefined}>{clienteDaLinha(fee) ?? '—'}</td>
                  <td className="prio-3">{labelDe(TIPO_HONORARIO_OPTIONS, fee.tipo)}</td>
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


  return (
    <div className="module-container">
      <section className="lista-balao" aria-labelledby="titulo-lista-honorarios">
        <CabecalhoDeLista
          id="titulo-lista-honorarios"
          titulo="Honorários"
          total={totalConhecido}
          busca={filtros.busca}
          onBusca={(v) => definirFiltro('busca', v)}
          placeholderBusca="Buscar por descrição, número do processo ou cliente…"
          rotuloBusca="Buscar honorários"
          novoRotulo="Novo honorário"
          novoDestino="/dashboard/honorarios/novo"
          novoMotivo={online ? null : MENSAGEM_ESCRITA_OFFLINE}
        />
        {body}
      </section>
    </div>
  );
}

// O cliente principal vem dentro do processo populado (`GET /fees`, desde a
// 2.5). Sem ele, `null` — e a célula diz "—".
const clienteDaLinha = (fee) => {
  const cliente = fee.processoId?.clientePrincipalId;
  if (!cliente || typeof cliente !== 'object') return null;
  const nome = nomeDoCliente(cliente);
  return nome === '—' ? null : nome;
};

export default FeeListPage;
