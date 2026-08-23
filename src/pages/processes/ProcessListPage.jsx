import React, { useState, useEffect } from 'react';
import processService from '../../api/processService';
import PageHeader from '../../components/ui/PageHeader';
import ActionMenu from '../../components/ui/ActionMenu';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { nomeDoCliente } from '../../utils/enums';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  mensagemDesativarProcesso,
  mensagemReativarProcesso,
  motivoDeNaoReativar
} from '../../utils/activationMessages';
import '../../styles/modules.css';

function ProcessoListPage() {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // DEC-052: um modal só, para as duas ações. `acao` diz qual — e é ela que
  // escolhe a frase, o rótulo do botão e o verbo. Dois modais separados
  // divergiriam na primeira revisão de redação.
  const [ativacaoModal, setAtivacaoModal] = useState({
    open: false, id: null, acao: null, mensagem: '', carregando: false
  });
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [status, setStatus] = useState('');
  // Sem isto a reativação não teria onde acontecer: a listagem escondia os
  // desativados e um menu com "Reativar" não teria linha onde existir.
  const [situacao, setSituacao] = useState('ativos');
  // Contador de recarga: toda ação de ativação incrementa, e o efeito refaz a
  // consulta com o filtro que estiver valendo.
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  useEffect(() => {
    setLoading(true);
    setError('');
    processService.listProcesses({
      busca: buscaDebounced || undefined,
      status: status || undefined,
      situacao
    })
      .then(res => setProcessos(res.data.data ?? res.data))
      .catch(() => setError('Falha ao buscar processos.'))
      .finally(() => setLoading(false));
  }, [buscaDebounced, status, situacao, versao]);

  // ── DEC-052: a contagem vem ANTES da confirmação ────────────────────────
  //
  // O modal só abre depois que o servidor diz quantos vínculos estão em jogo.
  // A advogada precisa saber o tamanho do efeito antes de causá-lo — é a regra
  // do modal de estorno (passo 161). Abrir primeiro e preencher o número
  // depois faria a frase mudar debaixo dos olhos de quem já está lendo.
  const abrirAtivacao = async (id, acao) => {
    setAtivacaoModal({ open: true, id, acao, mensagem: '', carregando: true });
    try {
      const { data } = await processService.getActivationPreview(id);

      // ── DEC-053: a última barreira antes do 409 ──────────────────────────
      //
      // O item do menu já vem desabilitado pela listagem, mas a listagem pode
      // estar velha — a advogada deixou a aba aberta e desativou o cliente por
      // outro caminho. O preview é lido no INSTANTE do clique, e é ele que
      // impede o modal de abrir com um botão "Reativar" que levaria a uma
      // recusa. Sem isto, "nenhuma tela dispara o que o backend recusaria"
      // valeria só enquanto ninguém tivesse duas abas.
      const impedimento = acao === 'reativar'
        ? motivoDeNaoReativar(data.impedimentosDeReativacao)
        : null;

      if (impedimento) {
        setAtivacaoModal({ open: false, id: null, acao: null, mensagem: '', carregando: false });
        toast.error(`Não é possível reativar. ${impedimento}`);
        // A listagem é refeita para o menu passar a mostrar o motivo — a tela
        // estava desatualizada, e deixá-la assim faria a advogada clicar de novo.
        setVersao(v => v + 1);
        return;
      }

      const mensagem = acao === 'desativar'
        ? mensagemDesativarProcesso(data.vinculosAfetados)
        : mensagemReativarProcesso(data.vinculosAfetados);
      setAtivacaoModal({ open: true, id, acao, mensagem, carregando: false });
    } catch (err) {
      setAtivacaoModal({ open: false, id: null, acao: null, mensagem: '', carregando: false });
      toast.error(getApiErrorMessage(err, 'Não foi possível conferir o efeito desta ação.'));
    }
  };

  const fecharAtivacao = () =>
    setAtivacaoModal({ open: false, id: null, acao: null, mensagem: '', carregando: false });

  const confirmarAtivacao = async () => {
    const { id, acao } = ativacaoModal;
    fecharAtivacao();
    try {
      if (acao === 'desativar') {
        await processService.deleteProcess(id);
        toast.success('Processo desativado. Você pode reativá-lo quando quiser.');
      } else {
        await processService.reactivateProcess(id);
        toast.success('Processo reativado.');
      }
      // Refaz a busca em vez de mexer na lista em memória: o processo pode ou
      // não continuar visível, conforme o filtro de situação em vigor, e
      // adivinhar isso aqui duplicaria a regra do filtro.
      setVersao(v => v + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(
        err,
        acao === 'desativar' ? 'Erro ao desativar processo.' : 'Erro ao reativar processo.'
      ));
    }
  };

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
      <PageHeader title="Processos Registrados" actionLabel="Novo Processo" actionTo="/dashboard/processos/novo" />
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
              <col className="col-xs" />
              <col className="col-sm" />
              <col className="col-acoes-menu" />
            </colgroup>
            <thead>
              <tr>
                <th>Título</th>
                <th>Nº Processo</th>
                <th>Cliente</th>
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
                    {p.titulo}
                  </td>
                  <td className="cell-truncate">{p.numeroProcesso || '—'}</td>
                  <td className="cell-truncate" title={nomeCliente(p)}>{nomeCliente(p)}</td>
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
                              motivo: motivoDeNaoReativar(p.impedimentosDeReativacao),
                              onSelecionar: () => abrirAtivacao(p._id, 'reativar')
                            }
                          : {
                              rotulo: 'Desativar',
                              destrutivo: true,
                              onSelecionar: () => abrirAtivacao(p._id, 'desativar')
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

      <Modal
        open={ativacaoModal.open}
        title={ativacaoModal.acao === 'reativar' ? 'Reativar processo' : 'Desativar processo'}
        message={ativacaoModal.carregando ? 'Conferindo o efeito desta ação…' : ativacaoModal.mensagem}
        variant={ativacaoModal.acao === 'reativar' ? 'default' : 'danger'}
        confirmLabel={ativacaoModal.acao === 'reativar' ? 'Reativar' : 'Desativar'}
        onConfirm={confirmarAtivacao}
        onCancel={fecharAtivacao}
      />
    </div>
  );
}

export default ProcessoListPage;
