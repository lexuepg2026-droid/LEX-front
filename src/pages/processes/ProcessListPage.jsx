import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import processService from '../../api/processService';
import ActionMenu from '../../components/ui/ActionMenu';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Paginador from '../../components/ui/Paginador';
import CabecalhoDeLista from '../../components/financeiro/CabecalhoDeLista';
import FinancialFilters from '../../components/financeiro/FinancialFilters';
import useLinhaClicavel from '../../components/financeiro/useLinhaClicavel';
import useListFilters from '../../hooks/useListFilters';
import { formatDate } from '../../utils/formatters';
import {
  FASE_PROCESSO_OPTIONS,
  FILTRO_LIMINAR_OPTIONS,
  nomeDoCliente,
  rotuloDaFase,
} from '../../utils/enums';
import { rotuloDoStatus, tomDoStatus } from '../../utils/statusVisual';
import { classeDaBolinha } from '../../components/processes/detalheProcesso.js';
import {
  AJUDA_DO_PERIODO,
  EXTRAS_DA_LISTA,
  FILTROS_DA_LISTA,
  PORTAL_OPTIONS,
  PRESETS_DA_LISTA,
  SITUACAO_OPTIONS,
  STATUS_PROCESSO,
  consultaDaLista,
  descricaoDoRecorteDeProcessos,
  destinoDaLinha,
  opcoesDeTipo,
} from './listaProcessos.js';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE, blockReason } from '../../offline/offlineMessages';
import { motivoDeNaoReativar } from '../../utils/activationMessages';
import useDesativacaoProcesso from '../../hooks/useDesativacaoProcesso';
import useClienteFiltrado from '../../hooks/useClienteFiltrado';
import ProcessFilterChip from '../../components/ui/ProcessFilterChip';
import '../../styles/modules.css';
import './ProcessPage.css';

const POR_PAGINA = 20;

// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE PROCESSOS — Fase 3.4 (DEC-116), no padrão da Figura 19
//
// O balão das listas financeiras da 3.2 (DEC-102): `CabecalhoDeLista` com o
// total, a busca em pílula e o "+"; os filtros em pílulas, todos na URL
// (DEC-103); a linha inteira abre o detalhe; o ⋮ fixo à direita (DEC-107);
// a paginação (a tela antiga mostrava só os 20 primeiros, sem paginador).
//
// **Sem sanfonas por tipo de ação e sem seleção em massa** (decisão 15 da
// banca): o tipo de ação é uma coluna e um filtro.
// ═══════════════════════════════════════════════════════════════════════════
function ProcessoListPage() {
  const online = useOnlineStatus();
  const clicarNaLinha = useLinhaClicavel();

  const {
    filtros, buscaDebounced, page, setPage,
    definirFiltro, aplicarPreset, limpar, temFiltro
  } = useListFilters(FILTROS_DA_LISTA, { naUrl: true, extrasNaLimpeza: EXTRAS_DA_LISTA });

  // Fase 3.5 (DEC-124): `?clienteId=`, vindo da aba "Processos" do cliente. O
  // chip diz o recorte e o desfaz; a faixa mostra o cliente e volta à aba.
  const filtroCliente = useClienteFiltrado({ avisoProprio: true });

  // DEC-058 (F-5a): a mesma consulta, com espelho local escopado por usuário.
  // Guarda-se o ENVELOPE: sem o `total`, a tela sem sinal mostraria 20
  // processos sem dizer que há 35.
  const consulta = consultaDaLista(filtros, {
    page, limit: POR_PAGINA, busca: buscaDebounced || undefined, clienteId: filtroCliente.clienteId
  });
  const { data, loading: carregando, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'processes',
    params: consulta,
    fetcher: () => processService.listProcesses(consulta).then((res) => res.data),
    fallbackError: 'Falha ao buscar processos.'
  });
  const processos = data?.data ?? (Array.isArray(data) ? data : []);
  const total = typeof data?.total === 'number' ? data.total : 0;
  const totalConhecido = typeof data?.total === 'number' ? data.total : null;
  // A PRIMEIRA carga troca a tabela pelo indicador; a recarga por troca de
  // filtro mantém a tabela, esmaecida (DEC-102).
  const loading = carregando && !data;

  // DEC-115: as opções do tipo de ação são os tipos que ela já usou. Sem sinal
  // (ou com falha), a pílula fica com "Todos os tipos" e o valor da URL.
  const [tipos, setTipos] = useState([]);
  useEffect(() => {
    let ativo = true;
    processService.listarTiposDeAcao()
      .then((res) => { if (ativo) setTipos(res.data?.data ?? []); })
      .catch(() => { if (ativo) setTipos([]); });
    return () => { ativo = false; };
  }, []);

  // DEC-052/053 (DEC-117): a prévia, a recusa e as frases moram no hook, o
  // mesmo do ⋮ do detalhe. Depois de agir, a lista refaz a consulta: o
  // registro pode ou não continuar visível, conforme o filtro de situação.
  const desativacao = useDesativacaoProcesso({ aoConcluir: reload });

  const recorte = descricaoDoRecorteDeProcessos({
    filtros,
    busca: buscaDebounced,
    cliente: filtroCliente.clienteId ? { nome: filtroCliente.rotulo } : null,
  });
  const comRecorte = temFiltro || Boolean(filtroCliente.clienteId);

  // Mostra o principal e, havendo litisconsórcio, quantos mais existem — a
  // coluna é estreita e a lista inteira de participantes não cabe. O detalhe
  // do processo mostra todos.
  const nomeCliente = (p) => {
    const principal = p.participantes?.find(x => x.principal);
    const nome = nomeDoCliente(principal?.clienteId ?? p.clientePrincipalId);
    const outros = (p.participantes?.length ?? 0) - 1;
    return outros > 0 ? `${nome} +${outros}` : nome;
  };

  // O `return <Loading/>` antecipado saiu daqui na F-1a.1: ele trocava a árvore
  // inteira — inclusive os controles de filtro — a cada refetch, e o React
  // desmontava e remontava o input, perdendo o foco.
  return (
    <div className="module-container">
      <section className="lista-balao" aria-labelledby="titulo-lista-processos">
        <CabecalhoDeLista
          id="titulo-lista-processos"
          titulo="Processos"
          total={totalConhecido}
          busca={filtros.busca}
          onBusca={(v) => definirFiltro('busca', v)}
          placeholderBusca="Buscar por título, número ou cliente…"
          rotuloBusca="Buscar processos"
          novoRotulo="Novo processo"
          novoDestino="/dashboard/processos/novo"
          novoMotivo={online ? null : MENSAGEM_ESCRITA_OFFLINE}
        />

        {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
        {/* DEC-109: a faixa dispensa o aviso dela; quando só o CLIENTE do
            filtro veio do espelho, a hora é a dele. */}
        {!fromCache && filtroCliente.fromCache && <OfflineNotice atualizadoEm={filtroCliente.updatedAt} />}
        {error && <p className="error-message">{error}</p>}

        {filtroCliente.clienteId && (
          <ProcessFilterChip
            alvo="cliente"
            rotulo={filtroCliente.rotulo}
            carregando={filtroCliente.carregando}
            onRemover={filtroCliente.remover}
          />
        )}

        <FinancialFilters
          filtros={filtros}
          definirFiltro={definirFiltro}
          aplicarPreset={aplicarPreset}
          limpar={limpar}
          temFiltro={comRecorte}
          honorarios={null}
          descricaoDoRecorte={recorte}
          semBusca
          pilulas
          presets={PRESETS_DA_LISTA}
          ajudaDoPeriodo={AJUDA_DO_PERIODO}
        >
          {/* DEC-054 — o status jurídico. Não confundir com a situação, logo
              adiante: "encerrado" continua sendo um processo vivo no cadastro. */}
          <select
            value={filtros.andamento}
            onChange={e => definirFiltro('andamento', e.target.value)}
            aria-label="Status do processo"
          >
            <option value="">Todos os status</option>
            {STATUS_PROCESSO.map(s => (
              <option key={s} value={s}>{rotuloDoStatus(s)}</option>
            ))}
          </select>
          {/* DEC-054 — a fase é o eixo NOVO, e não substitui o status: os dois
              filtram juntos — "em execução E suspenso" é pergunta legítima. */}
          <select
            value={filtros.fase}
            onChange={e => definirFiltro('fase', e.target.value)}
            aria-label="Fase do processo"
          >
            <option value="">Todas as fases</option>
            {FASE_PROCESSO_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* DEC-054 — o filtro da liminar. É ELE que recorta, e não a
              ordenação: a lista NUNCA se reordena por liminar. */}
          <select
            value={filtros.liminar}
            onChange={e => definirFiltro('liminar', e.target.value)}
            aria-label="Liminar"
          >
            {FILTRO_LIMINAR_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* DEC-115 — igualdade, com as opções que ela mesma já usou. */}
          <select
            value={filtros.tipoAcao}
            onChange={e => definirFiltro('tipoAcao', e.target.value)}
            aria-label="Tipo de ação"
          >
            <option value="">Todos os tipos</option>
            {opcoesDeTipo(tipos, filtros.tipoAcao).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {/* DEC-115 — a regra do cartão "Processos não liberados" do Início. */}
          <select
            value={filtros.portal}
            onChange={e => definirFiltro('portal', e.target.value)}
            aria-label="Liberação no portal"
          >
            {PORTAL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* DEC-052 — se o REGISTRO existe para o sistema. É por aqui que um
              processo desativado volta a ser alcançável. */}
          <select
            value={filtros.situacao}
            onChange={e => definirFiltro('situacao', e.target.value)}
            aria-label="Situação do registro"
          >
            {SITUACAO_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FinancialFilters>

        {loading ? (
          <Loading />
        ) : processos.length === 0 ? (
          <EmptyState
            title="Nenhum processo encontrado"
            description={
              comRecorte
                ? `Nenhum processo ${recorte}. Limpe os filtros para ver a lista inteira.`
                : 'Cadastre um novo processo para vê-lo aqui.'
            }
          />
        ) : (
          <div className="table-wrapper" aria-busy={carregando || undefined}>
            {/* Larguras estáveis (Fase 4.3); a última coluna fica fixa à
                direita (DEC-107) e a tabela rola dentro do wrapper. */}
            <table className="data-table data-table--fixed data-table--acoes-fixas data-table--primeira-fixa data-table--acoes-sem-nota">
              <colgroup>
                {/* Fase 3.7 (DEC-133): o número é a coluna fixa à esquerda, e o
                    título fica (os dois identificam o processo). Cliente e fase
                    `prio-2`, tipo de ação `prio-3`: sem o tipo, a lista cabe
                    sem rolar a 1280 px (1.160 de 1.192). */}
                <col className="col-lg" />
                <col className="col-lg" />
                <col className="col-md prio-2" />
                <col className="col-md prio-3" />
                <col className="col-md prio-2" />
                <col className="col-sm" />
                <col className="col-data" />
                <col className="col-acoes-menu" />
              </colgroup>
              <thead>
                <tr>
                  <th>Nº Processo</th>
                  <th>Título</th>
                  <th className="prio-2">Cliente</th>
                  <th className="prio-3">Tipo de ação</th>
                  {/* DEC-054: a fase entra ao lado do status, não no lugar
                      dele. São eixos diferentes. */}
                  <th className="prio-2">Fase</th>
                  <th>Status</th>
                  <th>Distribuição</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {processos.map(p => {
                  const destino = destinoDaLinha(p);
                  const desativado = p.ativo === false;
                  return (
                    <tr
                      key={p._id}
                      className={`${destino ? 'linha-clicavel' : ''}${desativado ? ' linha-desativada' : ''}`.trim() || undefined}
                      onClick={clicarNaLinha(destino)}
                    >
                      <td className="cell-truncate" title={p.numeroProcesso || undefined}>{p.numeroProcesso || '—'}</td>
                      <td className="cell-truncate" title={p.titulo}>
                        {/* DEC-052: com "Ativos e desativados" as duas espécies
                            dividem a tabela; a tag vem ANTES do título porque é
                            ela que muda como o resto da linha deve ser lido. */}
                        {desativado && <span className="tag-desativado">Desativado</span>}
                        {/* DEC-054 — o selo da liminar, ao lado do título: o
                            processo continua tendo a fase que tem. */}
                        {p.liminar === true && (
                          <span
                            className="tag-liminar"
                            title={p.liminarObservacao || 'Processo com liminar'}
                          >
                            Liminar
                          </span>
                        )}
                        {/* O link do título é o alvo de Tab da linha (DEC-102);
                            o desativado não tem detalhe para onde ir. */}
                        {destino ? (
                          <Link to={destino} className="link-interno">{p.titulo}</Link>
                        ) : (
                          p.titulo
                        )}
                      </td>
                      <td className="cell-truncate prio-2" title={nomeCliente(p)}>{nomeCliente(p)}</td>
                      <td className="cell-truncate prio-3" title={p.tipoAcao || undefined}>{p.tipoAcao || '—'}</td>
                      {/* O rótulo vem de `rotuloDaFase`, nunca montado aqui. */}
                      <td className="cell-truncate prio-2">{rotuloDaFase(p.fase)}</td>
                      {/* A bolinha e a palavra, as mesmas do cabeçalho do
                          detalhe (DEC-111). */}
                      <td>
                        <span className="processo-status">
                          <span
                            className={`processo-status__bolinha ${classeDaBolinha(tomDoStatus(p.status))}`}
                            aria-hidden="true"
                          />
                          {rotuloDoStatus(p.status)}
                        </span>
                      </td>
                      <td>{formatDate(p.dataDistribuicao)}</td>
                      {/* DEC-047: a coluna de ações é o menu ⋮. */}
                      <td className="actions-cell actions-cell--menu">
                        <ActionMenu
                          rotulo={`Ações do processo ${p.numeroProcesso || p.titulo || ''}`.trim()}
                          itens={
                            /* DEC-052: as duas ações são MUTUAMENTE exclusivas,
                               e a que aparece é a que o estado permite. */
                            p.ativo === false
                              ? [{
                                  rotulo: 'Reativar',
                                  /* DEC-053: com o cliente desativado, "Reativar"
                                     aparece DESABILITADO e com o motivo ao lado.
                                     Sem sinal, `blockReason` escolhe a falta de
                                     sinal, que bloqueia a ação inteira agora. */
                                  motivo: blockReason(motivoDeNaoReativar(p.impedimentosDeReativacao), { online }),
                                  onSelecionar: () => desativacao.abrir(p._id, 'reativar')
                                }]
                              : [
                                  {
                                    rotulo: 'Editar',
                                    to: `/dashboard/processos/editar/${p._id}`,
                                    motivo: blockReason(null, { online })
                                  },
                                  {
                                    rotulo: 'Desativar',
                                    destrutivo: true,
                                    motivo: blockReason(null, { online }),
                                    onSelecionar: () => desativacao.abrir(p._id, 'desativar')
                                  }
                                ]
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
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
            rotulo="processo"
            onMudarPagina={setPage}
          />
        )}
      </section>

      <Modal {...desativacao.propsDoModal} />
    </div>
  );
}

export default ProcessoListPage;
