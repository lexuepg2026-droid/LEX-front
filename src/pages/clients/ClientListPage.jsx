import React, { useState } from 'react';
import clientService from '../../api/clientService';
import PageHeader from '../../components/ui/PageHeader';
import ActionMenu from '../../components/ui/ActionMenu';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Paginador from '../../components/ui/Paginador';
import useListFilters from '../../hooks/useListFilters';
import { ORDENS_CLIENTE, ORDEM_CLIENTE_PADRAO } from '../../utils/ordemCliente';
import { toast } from '../../utils/toast';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE } from '../../offline/offlineMessages';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  mensagemDesativarCliente,
  mensagemReativarCliente
} from '../../utils/activationMessages';
import '../../styles/modules.css';

// 20 por página, o mesmo das listagens financeiras. Não é número escolhido
// aqui: é o que `POR_PAGINA` já significa nas outras telas, e um valor
// diferente faria a advogada aprender dois ritmos de navegação no mesmo
// sistema.
const POR_PAGINA = 20;

function ClienteListPage() {
  // DEC-052: um modal só para as duas ações — ver a nota em `ProcessListPage`.
  const [ativacaoModal, setAtivacaoModal] = useState({ open: false, id: null, acao: null });
  const online = useOnlineStatus();

  // ── A-1: o estado dos filtros passou a vir do hook (F-1b.3) ─────────────
  //
  // Esta tela mantinha `busca`, `situacao` e o debounce em `useState` próprio,
  // porque não tinha página nenhuma para reiniciar. Com a ordenação e o
  // paginador, ela passa a ter — e a REGRA 1 do hook (mudar filtro volta para
  // a página 1) é exatamente o defeito que o passo 175 existe para pegar.
  //
  // Escrever o `setPage(1)` à mão aqui seria a quarta cópia da regra, e o
  // comentário do próprio hook diz por que isso dá errado: a tela escrita por
  // último copia a anterior e esquece.
  //
  // `honorarioId`, `preset`, `de` e `ate` vêm no estado do hook e ficam
  // INERTES nesta tela: são recorte financeiro, e cliente não tem período. O
  // hook é de listagem, não do módulo financeiro.
  const {
    filtros, buscaDebounced, page, setPage, definirFiltro
  } = useListFilters({ situacao: 'ativos', ordem: ORDEM_CLIENTE_PADRAO });

  // ── DEC-058: a listagem tem espelho local, escopado por usuário (F-5a) ──
  //
  // Com sinal, nada muda: busca no servidor e exibe. Sem sinal, exibe o que
  // ESTA advogada já tinha consultado, com o aviso de idade no topo — e nunca
  // o que outra pessoa consultou neste mesmo navegador, porque a chave do que
  // se guarda carrega o id do usuário (`offline/cacheKey.js`).
  //
  // Os parâmetros da consulta são os MESMOS do `fetcher`: é o que faz a chave
  // do cache distinguir "ativos" de "todos" e cada busca da anterior.
  //
  // `page` e `ordem` entram na consulta, e por isso entram na CHAVE do cache:
  // cada página e cada sentido têm espelho próprio, e voltar para uma página
  // já vista funciona sem sinal.
  const consulta = {
    page,
    limit: POR_PAGINA,
    busca: buscaDebounced || undefined,
    situacao: filtros.situacao,
    ordem: filtros.ordem
  };
  const { data, loading, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'clients',
    params: consulta,
    // Guarda-se o ENVELOPE inteiro, e não só o array: é ele que traz o
    // `total`, e sem o total o paginador sumiria sem nada dizer que há mais
    // clientes. Mesma razão escrita em `InstallmentListPage`.
    fetcher: () => clientService.getAllClients(consulta).then((res) => res.data),
    fallbackError: 'Falha ao buscar clientes.'
  });
  const clientes = data?.data ?? (Array.isArray(data) ? data : []);
  const total = typeof data?.total === 'number' ? data.total : 0;

  // O cliente NÃO cascateia — `deleteClient` só aceita desativar quem não
  // participa de processo ativo —, então não há contagem a buscar antes de
  // abrir o modal. A frase é fixa, e a da reativação carrega o aviso que
  // importa: os processos dele não voltam.
  const abrirAtivacao = (id, acao) => setAtivacaoModal({ open: true, id, acao });

  const fecharAtivacao = () => setAtivacaoModal({ open: false, id: null, acao: null });

  const confirmarAtivacao = async () => {
    const { id, acao } = ativacaoModal;
    fecharAtivacao();
    try {
      if (acao === 'desativar') {
        await clientService.deleteClient(id);
        toast.success('Cliente desativado. Você pode reativá-lo quando quiser.');
      } else {
        await clientService.reactivateClient(id);
        toast.success('Cliente reativado. Os processos dele continuam como estavam.');
      }
      // Refaz a busca: o cliente pode ou não continuar visível conforme o
      // filtro de situação, e adivinhar isso aqui duplicaria a regra do filtro.
      reload();
    } catch (err) {
      toast.error(getApiErrorMessage(
        err,
        acao === 'desativar' ? 'Erro ao desativar cliente.' : 'Erro ao reativar cliente.'
      ));
    }
  };

  const formatEndereco = (endereco) => {
    if (!endereco?.logradouro) return '—';
    return [
      endereco.logradouro,
      endereco.numero ? `nº ${endereco.numero}` : null,
      endereco.bairro,
      [endereco.cidade, endereco.estado].filter(Boolean).join('/'),
    ].filter(Boolean).join(', ');
  };

  // ── O `return <Loading/>` ANTECIPADO saiu daqui (F-1a.1) ─────────────────
  //
  // Era `if (loading) return <Loading />;`, e era a causa da perda de foco na
  // busca. Cada tecla digitada refazia a consulta (com debounce), o efeito
  // punha `loading` em `true`, e o return antecipado trocava a ÁRVORE INTEIRA
  // por `<Loading/>` — o React desmontava o `<input>` e montava outro quando a
  // resposta chegava. Foco perdido, cursor no começo, e a advogada clicando de
  // novo no campo a cada palavra.
  //
  // A correção é estrutural: o indicador de carregamento passa a viver ABAIXO
  // dos controles, dentro do JSX, e o input nunca desmonta. É o padrão que
  // `SecaoListPage` já usava — esta tela é que estava fora dele.
  //
  // **Não se corrige com `autoFocus` nem `.focus()` em efeito**: os dois
  // tratam o sintoma e roubam o foco de quem está navegando por teclado, que é
  // um defeito pior que o original.
  return (
    <div className="module-container">
      {/* Sem sinal o botão CONTINUA na tela, atenuado e com o motivo ao lado
          (DEC-053, generalizada na F-5a): botão ausente faz procurar, botão
          desabilitado com explicação ensina. */}
      <PageHeader
        title="Clientes Registrados"
        actionLabel="Novo Cliente"
        actionTo="/dashboard/clientes/novo"
        actionMotivo={online ? undefined : MENSAGEM_ESCRITA_OFFLINE}
      />
      {/* O aviso de idade fica ACIMA do erro e dos filtros: a primeira coisa a
          saber sobre esta tela é de quando é o que ela mostra. */}
      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Buscar por nome, razão social ou email..."
          value={filtros.busca}
          onChange={e => definirFiltro('busca', e.target.value)}
          maxLength={80}
        />
        {/* DEC-052 — é por este seletor que um cliente desativado volta a ser
            alcançável. Sem ele, um cliente desativado por engano ficava
            desativado para sempre. */}
        <select
          value={filtros.situacao}
          onChange={e => definirFiltro('situacao', e.target.value)}
          aria-label="Situação do registro"
        >
          <option value="ativos">Somente ativos</option>
          <option value="inativos">Somente desativados</option>
          <option value="todos">Ativos e desativados</option>
        </select>
        {/* DEC-062 — o padrão é A–Z, e `definirFiltro` é o que devolve a
            lista para a página 1 ao trocar o sentido. Sem isso, quem está na
            página 4 e inverte a ordem continua na página 4 de uma lista que
            acabou de virar do avesso: os nomes mudam, a posição não, e não há
            nada na tela explicando o que aconteceu.

            A ordenação NÃO entra em "Filtros aplicados" — ordenar não recorta
            o conjunto, e anunciá-la ali faria a advogada procurar por que a
            lista está curta quando ela não está. */}
        <select
          value={filtros.ordem}
          onChange={e => definirFiltro('ordem', e.target.value)}
          aria-label="Ordenação da lista"
        >
          {ORDENS_CLIENTE.map((o) => (
            <option key={o.valor} value={o.valor}>{o.rotulo}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : clientes.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado." description="Tente ajustar os filtros ou cadastre um novo cliente." />
      ) : (
        <div className="table-wrapper">
          {/* Larguras estáveis (Fase 4.3). Nome, e-mail e endereço são texto
              livre sem teto: sem `<colgroup>` eles decidem a largura da tabela
              e empurram a coluna de ações para fora da tela. */}
          <table className="data-table data-table--fixed">
            <colgroup>
              <col />
              <col className="col-md" />
              <col className="col-xs" />
              <col />
              <col className="col-sm" />
              <col />
              <col className="col-acoes-menu" />
            </colgroup>
            <thead>
              <tr>
                <th>Nome / Razão Social</th>
                <th>CPF / CNPJ</th>
                <th>Tipo</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Endereço</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map(cliente => {
                const nome = cliente.tipoPessoa === 'fisica' ? cliente.nomeCompleto : cliente.razaoSocial;
                const endereco = formatEndereco(cliente.endereco);
                return (
                <tr key={cliente._id} className={cliente.ativo === false ? 'linha-desativada' : undefined}>
                  <td className="cell-truncate" title={nome}>
                    {cliente.ativo === false && <span className="tag-desativado">Desativado</span>}
                    {nome}
                  </td>
                  <td>{cliente.tipoPessoa === 'fisica' ? cliente.cpf : cliente.cnpj}</td>
                  <td>{cliente.tipoPessoa === 'fisica' ? 'Física' : 'Jurídica'}</td>
                  <td className="cell-truncate" title={cliente.email || undefined}>{cliente.email || '—'}</td>
                  <td>{cliente.telefone || '—'}</td>
                  <td className="cell-truncate" title={endereco}>{endereco}</td>
                  {/* DEC-047: a coluna de ações é o menu ⋮, aqui como em toda
                      listagem. As três ações são as mesmas de antes — nenhuma
                      foi perdida na migração —, agora com largura de UM botão.
                      A destrutiva por último e em vermelho — hoje é
                      "Desativar", não mais "Excluir" (ver a nota abaixo). */}
                  <td className="actions-cell actions-cell--menu">
                    <ActionMenu
                      rotulo={`Ações de ${cliente.nome}`}
                      itens={[
                        { rotulo: 'Ver', to: `/dashboard/clientes/detalhe/${cliente._id}` },
                        /* Sem sinal, tudo que leva a gravar fica desabilitado
                           COM o motivo. "Editar" entra na conta: o formulário
                           existe para salvar, e abri-lo para recusar o envio no
                           fim perderia o que foi digitado (Parte 4 da F-5a). */
                        {
                          rotulo: 'Editar',
                          to: `/dashboard/clientes/editar/${cliente._id}`,
                          motivo: online ? undefined : MENSAGEM_ESCRITA_OFFLINE
                        },
                        /* DEC-052: as duas ações são mutuamente exclusivas — a
                           que aparece é a que o estado do registro permite.
                           "Excluir" virou "Desativar": sempre foi soft delete,
                           e agora que a volta existe o nome antigo mente. */
                        cliente.ativo === false
                          ? {
                              rotulo: 'Reativar',
                              onSelecionar: () => abrirAtivacao(cliente._id, 'reativar'),
                              motivo: online ? undefined : MENSAGEM_ESCRITA_OFFLINE
                            }
                          : {
                              rotulo: 'Desativar',
                              destrutivo: true,
                              onSelecionar: () => abrirAtivacao(cliente._id, 'desativar'),
                              motivo: online ? undefined : MENSAGEM_ESCRITA_OFFLINE
                            }
                      ]}
                    />
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* O paginador fica FORA do `loading`: sumi-lo durante a consulta faria
          a página pular a cada clique em "Próxima".

          Ele entra nesta tela na A-1, e não por simetria: com a ordem
          alfabética como padrão, a listagem pedia 20 e mostrava os 20
          PRIMEIROS do alfabeto, em silêncio. Antes disso o recorte também
          existia, mas por data de cadastro — e escondia os mais antigos, que
          é a metade que ninguém procura. Ordenado por nome, o recorte passa a
          esconder o fim do alfabeto: um cliente chamado "Zeca" simplesmente
          não existiria na tela. */}
      {!loading && total > 0 && (
        <Paginador
          page={page}
          limit={POR_PAGINA}
          total={total}
          rotulo="cliente"
          onMudarPagina={setPage}
        />
      )}

      <Modal
        open={ativacaoModal.open}
        title={ativacaoModal.acao === 'reativar' ? 'Reativar cliente' : 'Desativar cliente'}
        message={
          ativacaoModal.acao === 'reativar'
            ? mensagemReativarCliente()
            : mensagemDesativarCliente()
        }
        variant={ativacaoModal.acao === 'reativar' ? 'default' : 'danger'}
        confirmLabel={ativacaoModal.acao === 'reativar' ? 'Reativar' : 'Desativar'}
        onConfirm={confirmarAtivacao}
        onCancel={fecharAtivacao}
      />
    </div>
  );
}

export default ClienteListPage;
