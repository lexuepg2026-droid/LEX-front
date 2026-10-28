import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import installmentService from '../../api/installmentService';
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
import { rotuloCurtoDoHonorario } from '../../utils/feeLabel';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE, blockReason } from '../../offline/offlineMessages';
import { getFinancialErrorMessage } from '../../utils/financialErrors';
import { STATUS_PARCELA_OPTIONS, labelDe } from '../../utils/enums';
import '../../styles/modules.css';
import { rotuloDaParcela } from '../../components/financeiro/installmentLabel';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';

import { REGISTRO_PARCELA_OPTIONS, registroDaUrl, inativosDaConsulta, trechoDoRegistro } from './listaParcelas.js';

const POR_PAGINA = 20;

function InstallmentListPage() {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  // `?processoId=` vem das abas do processo. A lista filtrava por ele sem
  // dizer; agora ele aparece num chip e na frase do recorte (DEC-070).
  const filtroProcesso = useProcessoFiltrado({ avisoProprio: true });
  const processoId = filtroProcesso.processoId || undefined;
  // Modo "desativadas" (Fase 4.5) — ver a nota em PaymentListPage. Vive junto
  // dos demais filtros para que ligá-lo também volte à página 1.
  const online = useOnlineStatus();

  // ── O teto 100 + "Mostrando N de M" SAIU (F-1b.3) ───────────────────────
  //
  // A tela pedia 100 e avisava quando o conjunto era maior, mandando "usar os
  // filtros". Agora são 20 por página, um paginador de verdade, e os filtros
  // que o aviso mandava usar existem: honorário, busca e período.
  const {
    filtros, buscaDebounced, page, setPage,
    definirFiltro, aplicarPreset, limpar, temFiltro
  } = useListFilters({ status: '', registro: '' }, FILTROS_DAS_FINANCEIRAS);

  // Fase 3.10 (DEC-151): o honorário do filtro vem do `SeletorComBusca` da
  // barra, por busca — o `listFees({ limit: 100 })` saiu. O escolhido (por
  // clique ou buscado pelo id da URL) fica aqui só para a frase do recorte.
  const [honorarioEscolhido, setHonorarioEscolhido] = useState(null);

  // DEC-058 (F-5a): espelho local da listagem, escopado por usuário. Guarda-se
  // o ENVELOPE inteiro — o `total` é ele que diz, e sem o total o paginador
  // sumiria sem que nada dissesse que há mais parcelas.
  const consulta = {
    page,
    limit: POR_PAGINA,
    processoId,
    honorarioId: filtros.honorarioId || undefined,
    status: filtros.status || undefined,
    inativos: inativosDaConsulta(filtros.registro),
    busca: buscaDebounced || undefined,
    de: filtros.de || undefined,
    ate: filtros.ate || undefined
  };
  const { data, loading: carregando, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'installments',
    params: consulta,
    fetcher: () => installmentService.listInstallments(consulta).then((res) => res.data),
    fallbackError: 'Falha ao buscar parcelas.',
    mapError: getFinancialErrorMessage
  });
  const installments = data?.data ?? (Array.isArray(data) ? data : []);
  const total = typeof data?.total === 'number' ? data.total : 0;
  // O "(37)" do título só com resposta na mão (DEC-102).
  const totalConhecido = typeof data?.total === 'number' ? data.total : null;
  const clicarNaLinha = useLinhaClicavel();
  // `loading` é a PRIMEIRA carga: só ela troca a tabela pelo indicador. A
  // recarga por troca de filtro (`carregando`) mantém a tabela (ver o JSX).
  const loading = carregando && !data;
  // A linha leva à EDIÇÃO da parcela — o "Editar" do menu. A reparcelada não
  // se edita: a linha leva ao honorário, como o link do nome. Sem sinal a
  // edição é recusada (o menu diz o porquê), e a linha não abre nada.
  const destinoDaLinha = (inst) => {
    if (inst.status === 'cancelado') return inst.feeId?._id ? `/dashboard/honorarios/${inst.feeId._id}` : null;
    return online ? `/dashboard/parcelas/editar/${inst._id}` : null;
  };

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
      // Refaz a consulta em vez de recortar a lista na memória: recortar só na
      // tela deixaria o espelho local com a parcela que acabou de sair.
      reload();
      toast.success('Parcela removida com sucesso.');
    } catch (err) {
      // 409 de integridade: a parcela tem pagamentos ativos. A mensagem diz
      // QUANTOS, de `dependencia` + `quantidade`, e não destaca campo nenhum —
      // o conflito é entre registros gravados, não num input.
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getFinancialErrorMessage(err, 'Erro ao remover parcela.'));
    }
  };

  // O `return <Loading/>` antecipado saiu daqui na F-1a.1: ele trocava a árvore
  // inteira — inclusive os controles de filtro — a cada refetch, e o React
  // desmontava e remontava o input, perdendo o foco. O indicador passou para
  // baixo dos controles. Ver a nota longa em `ClientListPage`.

  // DEC-132: a situação do registro, lida da URL (`?registro=`).
  const registro = registroDaUrl(filtros.registro);
  const verInativos = registro === 'inativos';

  const recorte = descricaoDoRecorteFinanceiro({
    filtros,
    busca: buscaDebounced,
    honorarios: honorarioEscolhido && filtros.honorarioId ? [honorarioEscolhido] : [],
    extras: [
      filtros.status ? `com status "${labelDe(STATUS_PARCELA_OPTIONS, filtros.status)}"` : null,
      trechoDoRegistro(registro)
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

      <FinancialFilters
        filtros={filtros}
        definirFiltro={definirFiltro}
        aplicarPreset={aplicarPreset}
        limpar={limparTudo}
        temFiltro={filtrado}
        filtroDeHonorario={{ onEscolhido: setHonorarioEscolhido }}
        placeholderBusca="Buscar por honorário, processo ou cliente…"
        descricaoDoRecorte={recorte}
        semBusca
        pilulas
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

        {/* DEC-132 — se o REGISTRO existe para o sistema, como em Clientes e
            Processos. Era o checkbox "Mostrar desativadas". `?registro=` e não
            `?situacao=`, que aqui já é o status da parcela. */}
        <select
          value={registro}
          onChange={e => definirFiltro('registro', e.target.value)}
          aria-label="Situação do registro"
        >
          {REGISTRO_PARCELA_OPTIONS.map(o => (
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
      ) : installments.length === 0 ? (
        <EmptyState
          title={verInativos ? 'Nenhuma parcela desativada' : 'Nenhuma parcela encontrada'}
          description={
            verInativos
              // O modo continua existindo — a parcela ainda é excluível — mas
              // deixou de oferecer reativação na F-1a (DEC-034). É leitura:
              // "quais eu excluí". Uma parcela excluída por engano se recria
              // por "+ Nova Parcela", com o mesmo número, que continua
              // reservado enquanto a antiga existir.
              ? 'Parcelas excluídas aparecem aqui. Para voltar a cobrar, crie uma parcela nova.'
              : filtrado
                // O estado vazio diz o RECORTE (F-1b.3): "nenhuma cobrança
                // encontrada" com três controles preenchidos faz procurar a
                // parcela em vez de olhar os filtros.
                ? `Nenhuma parcela ${recorte}. Limpe os filtros para ver a lista inteira.`
                : 'Crie uma nova parcela para vê-la aqui.'
          }
        />
      ) : (
        <div className="table-wrapper" aria-busy={carregando || undefined}>
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`. */}
          <table className="data-table data-table--fixed data-table--acoes-fixas data-table--primeira-fixa">
            {/* Dinheiro em `col-money`, data em `col-data`, status em
                `col-status` (F-1b.2). "Valor", "Recebido" e "Em aberto"
                estavam em `col-sm`, que só aguenta até a casa dos milhares;
                as duas datas em `col-xs` saíam "18/08/20…". */}
            <colgroup>
              {/* Fase 3.2 (DEC-102): processo e cliente principal, da chave
                  nova `processo` da listagem. As colunas de texto ganharam
                  largura pelo mesmo motivo da lista de honorários: a 1280 px
                  as três `auto` ficavam com 14 px (medido). A tabela rola
                  dentro do `.table-wrapper`. */}
              {/* Fase 3.7 (DEC-133): o honorário é a coluna fixa à esquerda;
                  processo e cliente são `prio-2`. Todo o resto é `prio-1`
                  (parcela, três valores, duas datas e o status). */}
              <col className="col-md" />
              <col className="col-md prio-2" />
              <col className="col-md prio-2" />
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
                <th className="prio-2">Processo</th>
                <th className="prio-2">Cliente</th>
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
                <tr
                  key={inst._id}
                  className={destinoDaLinha(inst) ? 'linha-clicavel' : undefined}
                  onClick={clicarNaLinha(destinoDaLinha(inst))}
                >
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
                  <td className="cell-truncate prio-2" title={rotuloDoProcesso(inst.processo) ?? undefined}>
                    {rotuloDoProcesso(inst.processo) ?? '—'}
                  </td>
                  <td className="cell-truncate prio-2" title={inst.processo?.clientePrincipalNome ?? undefined}>
                    {inst.processo?.clientePrincipalNome ?? '—'}
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
                  {/* Fase 3.8 (DEC-135): "Reparcelada" mora ao lado do status
                      "Cancelado" que ela explica, e não mais na célula do ⋮ —
                      no celular a coluna de ações tem só a largura do botão.
                      A regra é a de antes: parcela cancelada. */}
                  <td>
                    <StatusBadge status={inst.status} />
                    {inst.status === 'cancelado' && (
                      <span className="nota-da-celula">Reparcelada</span>
                    )}
                  </td>
                  <td>{formatDate(inst.dataPagamento)}</td>
                  <td className="actions-cell actions-cell--menu">
                    {/* Parcela CANCELADA por reparcelamento não se edita nem se
                        exclui: ela é histórico, e o vínculo com o plano novo é
                        o que torna a renegociação legível meses depois. A tela
                        de reparcelamento é da F-1c; aqui a linha apenas não
                        oferece o que o backend não deve aceitar.

                        "Reparcelada" é EXPLICAÇÃO, não ação: fica fora do menu,
                        na coluna do status (DEC-135). Aqui, só o traço de
                        "nenhuma ação". */}
                    {inst.status === 'cancelado' ? (
                      <span className="acao-indisponivel" title="Parcela reparcelada: sem ações">—</span>
                    ) : (
                      <ActionMenu
                        rotulo={`Ações da ${rotuloDaParcela({ numeroParcela: inst.numeroParcela, totalParcelas: inst.totalParcelas ?? null, totalNoPlanoVigente: inst.totalNoPlano ?? null }).toLowerCase()}`}
                        itens={[
                          {
                            rotulo: 'Editar',
                            to: `/dashboard/parcelas/editar/${inst._id}`,
                            motivo: blockReason(null, { online })
                          },
                          {
                            rotulo: 'Excluir',
                            destrutivo: true,
                            motivo: blockReason(null, { online }),
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


  return (
    <div className="module-container">
      <section className="lista-balao" aria-labelledby="titulo-lista-parcelas">
        <CabecalhoDeLista
          id="titulo-lista-parcelas"
          titulo="Parcelas"
          total={totalConhecido}
          busca={filtros.busca}
          onBusca={(v) => definirFiltro('busca', v)}
          placeholderBusca="Buscar por honorário, número do processo ou cliente…"
          rotuloBusca="Buscar parcelas"
          novoRotulo="Nova parcela"
          novoDestino="/dashboard/parcelas/novo"
          novoMotivo={online ? null : MENSAGEM_ESCRITA_OFFLINE}
        />
        {body}
      </section>
    </div>
  );
}

// O processo da linha, pela chave `processo` de `GET /installments` (Fase
// 3.2): o título, como nas listas de honorários e pagamentos; o número quando
// não há título.
const rotuloDoProcesso = (processo) =>
  (processo?.titulo || processo?.numeroProcesso || '').trim() || null;

export default InstallmentListPage;
