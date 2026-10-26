import React, { useState, useEffect } from 'react';
import processService from '../../api/processService';
import PageHeader from '../../components/ui/PageHeader';
import ActionMenu from '../../components/ui/ActionMenu';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/formatters';
import {
  FASE_PROCESSO_OPTIONS,
  FILTRO_LIMINAR_OPTIONS,
  nomeDoCliente,
  rotuloDaFase,
} from '../../utils/enums';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE, blockReason } from '../../offline/offlineMessages';
import { motivoDeNaoReativar } from '../../utils/activationMessages';
import useDesativacaoProcesso from '../../hooks/useDesativacaoProcesso';
import '../../styles/modules.css';

function ProcessoListPage() {
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [status, setStatus] = useState('');
  // DEC-054 — dois recortes novos, independentes entre si e do `status`.
  const [fase, setFase] = useState('');
  const [liminar, setLiminar] = useState('');
  // Sem isto a reativação não teria onde acontecer: a listagem escondia os
  // desativados e um menu com "Reativar" não teria linha onde existir.
  const [situacao, setSituacao] = useState('ativos');
  const online = useOnlineStatus();

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  // DEC-058 (F-5a): a mesma consulta de sempre, agora com espelho local
  // escopado por usuário. `reload` substitui o contador de recarga que existia
  // aqui — toda ação de ativação continua refazendo a consulta com o filtro que
  // estiver valendo.
  const consulta = {
    busca: buscaDebounced || undefined,
    status: status || undefined,
    fase: fase || undefined,
    liminar: liminar || undefined,
    situacao
  };
  const { data, loading, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'processes',
    params: consulta,
    fetcher: () => processService.listProcesses(consulta).then((res) => res.data.data ?? res.data),
    fallbackError: 'Falha ao buscar processos.'
  });
  const processos = data ?? [];

  // DEC-052/053 (Fase 3.4, DEC-117): a prévia, a recusa e as frases moram no
  // hook, o mesmo do ⋮ do detalhe. Aqui, depois de agir (ou de o preview
  // recusar), a lista refaz a consulta: o registro pode ou não continuar
  // visível, conforme o filtro de situação.
  const desativacao = useDesativacaoProcesso({ aoConcluir: reload });

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
  // desmontava e remontava o input, perdendo o foco. O indicador passou para
  // baixo dos controles. Ver a nota longa em `ClientListPage`.

  return (
    <div className="module-container">
      <PageHeader
        title="Processos Registrados"
        actionLabel="Novo Processo"
        actionTo="/dashboard/processos/novo"
        actionMotivo={online ? undefined : MENSAGEM_ESCRITA_OFFLINE}
      />
      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Buscar por título ou número..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          maxLength={80}
        />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="encerrado">Encerrado</option>
          <option value="suspenso">Suspenso</option>
        </select>
        {/* DEC-054 — a fase é o eixo NOVO, e não substitui o `status` ao lado:
            "suspenso" não é uma fase, e "execução" não é um status. Os dois
            filtram juntos de propósito — "em execução E suspenso" é pergunta
            legítima. */}
        <select
          value={fase}
          onChange={e => setFase(e.target.value)}
          aria-label="Fase do processo"
        >
          <option value="">Todas as fases</option>
          {FASE_PROCESSO_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {/* DEC-054 — o filtro da liminar. É ELE que recorta, e não a ordenação:
            ela pediu destaque ("liminar é um plus"), não prioridade. A lista
            NUNCA se reordena por liminar — reordenar muda o que a advogada
            espera encontrar onde deixou. Quem quiser ver só as liminares usa
            este seletor, e decide QUANDO. */}
        <select
          value={liminar}
          onChange={e => setLiminar(e.target.value)}
          aria-label="Liminar"
        >
          {FILTRO_LIMINAR_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {/* DEC-052 — não confundir com o filtro ao lado: `status` é o andamento
            jurídico ("encerrado" continua sendo um processo vivo no cadastro);
            `situacao` é se o REGISTRO existe para o sistema. É por este seletor
            que um processo desativado volta a ser alcançável — sem ele, a
            reativação não teria linha onde acontecer. */}
        <select
          value={situacao}
          onChange={e => setSituacao(e.target.value)}
          aria-label="Situação do registro"
        >
          <option value="ativos">Somente ativos</option>
          <option value="inativos">Somente desativados</option>
          <option value="todos">Ativos e desativados</option>
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : processos.length === 0 ? (
        <EmptyState title="Nenhum processo encontrado." description="Tente ajustar os filtros ou cadastre um novo processo." />
      ) : (
        <div className="table-wrapper">
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`. */}
          <table className="data-table data-table--fixed">
            <colgroup>
              <col />
              <col className="col-lg" />
              <col />
              <col className="col-sm" />
              <col className="col-xs" />
              <col className="col-sm" />
              <col className="col-acoes-menu" />
            </colgroup>
            <thead>
              <tr>
                <th>Título</th>
                <th>Nº Processo</th>
                <th>Cliente</th>
                {/* DEC-054: a fase entra ao lado do status, não no lugar dele.
                    São eixos diferentes, e a coluna que sumisse levaria junto o
                    filtro que a advogada usa desde a Fase 2. */}
                <th>Fase</th>
                <th>Status</th>
                <th>Distribuição</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {processos.map(p => (
                <tr key={p._id} className={p.ativo === false ? 'linha-desativada' : undefined}>
                  <td className="cell-truncate" title={p.titulo}>
                    {/* DEC-052: com o filtro em "Ativos e desativados" as duas
                        espécies dividem a tabela, e sem marca a advogada não
                        distingue uma da outra. A tag vem ANTES do título porque
                        é ela que muda como o resto da linha deve ser lido. */}
                    {p.ativo === false && <span className="tag-desativado">Desativado</span>}
                    {/* DEC-054 — o selo da liminar. *"Liminar é um plus dentro
                        das fases (…) não é uma fase nova."* Por isso é um selo
                        ao lado do título, e não um valor na coluna Fase: o
                        processo continua tendo a fase que tem.

                        Em cor de atenção, e com `title` para quem passar o
                        mouse ler a observação — quando houver. A observação é
                        opcional, e o selo aparece com ou sem ela. */}
                    {p.liminar === true && (
                      <span
                        className="tag-liminar"
                        title={p.liminarObservacao || 'Processo com liminar'}
                      >
                        Liminar
                      </span>
                    )}
                    {p.titulo}
                  </td>
                  <td className="cell-truncate">{p.numeroProcesso || '—'}</td>
                  <td className="cell-truncate" title={nomeCliente(p)}>{nomeCliente(p)}</td>
                  {/* O rótulo vem de `rotuloDaFase`, nunca montado aqui: foi
                      assim que a coluna de status já exibiu string crua de enum
                      com sublinhado. */}
                  <td className="cell-truncate">{rotuloDaFase(p.fase)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>{formatDate(p.dataDistribuicao)}</td>
                  {/* DEC-047: a coluna de ações é o menu ⋮. "Gerenciar" é o
                      nome que esta tela sempre deu ao caminho do detalhe, e
                      renomeá-lo aqui seria mudar o vocabulário numa fase que
                      só mexe na forma. */}
                  <td className="actions-cell actions-cell--menu">
                    <ActionMenu
                      rotulo={`Ações do processo ${p.numeroProcesso || ''}`.trim()}
                      itens={[
                        { rotulo: 'Gerenciar', to: `/dashboard/processos/detalhe/${p._id}` },
                        /* DEC-052: as duas ações são MUTUAMENTE exclusivas, e a
                           que aparece é a que o estado do registro permite.
                           Oferecer "Desativar" num processo já desativado seria
                           oferecer uma ação que o backend responde 404.

                           "Excluir" virou "Desativar": a ação sempre foi soft
                           delete, e agora que a volta existe o nome antigo
                           mente. Ver a nota em `activationMessages.js`. */
                        p.ativo === false
                          ? {
                              rotulo: 'Reativar',
                              /* DEC-053: com o cliente desativado, "Reativar"
                                 aparece DESABILITADO e com o motivo ao lado,
                                 em vez de sumir. Botão ausente faz procurar;
                                 botão desabilitado com explicação ensina.

                                 `motivo` é `null` quando nada impede, e é isso
                                 que devolve o item ao comportamento normal —
                                 sem `if` duplicando a linha inteira. */
                              /* Sem sinal há DOIS motivos possíveis para o
                                 mesmo item, e `blockReason` escolhe: a falta
                                 de sinal ganha, porque bloqueia a ação inteira
                                 agora. O motivo da DEC-053 volta a aparecer
                                 quando o sinal voltar. */
                              motivo: blockReason(motivoDeNaoReativar(p.impedimentosDeReativacao), { online }),
                              onSelecionar: () => desativacao.abrir(p._id, 'reativar')
                            }
                          : {
                              rotulo: 'Desativar',
                              destrutivo: true,
                              motivo: blockReason(null, { online }),
                              onSelecionar: () => desativacao.abrir(p._id, 'desativar')
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

      <Modal {...desativacao.propsDoModal} />
    </div>
  );
}

export default ProcessoListPage;
