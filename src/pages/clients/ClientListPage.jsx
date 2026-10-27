import React from 'react';
import { Link } from 'react-router-dom';
import clientService from '../../api/clientService';
import ActionMenu from '../../components/ui/ActionMenu';
import Avatar from '../../components/ui/Avatar';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Paginador from '../../components/ui/Paginador';
import CabecalhoDeLista from '../../components/financeiro/CabecalhoDeLista';
import FinancialFilters from '../../components/financeiro/FinancialFilters';
import useLinhaClicavel from '../../components/financeiro/useLinhaClicavel';
import useListFilters from '../../hooks/useListFilters';
import {
  FILTROS_DA_LISTA,
  ORDEM_OPTIONS,
  PORTAL_OPTIONS,
  SITUACAO_OPTIONS,
  TIPO_PESSOA_OPTIONS_FILTRO,
  consultaDaLista,
  descricaoDoRecorteDeClientes,
  destinoDaLinha,
  documentoNaLista,
  nomeDoCliente,
  telefoneNaLista,
  temRecorte,
  tipoDoCliente,
} from './listaClientes.js';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { blockReason, MENSAGEM_ESCRITA_OFFLINE } from '../../offline/offlineMessages';
import useDesativacaoCliente from '../../hooks/useDesativacaoCliente';
import '../../styles/modules.css';
import './ClientPage.css';

// 20 por página, o mesmo das outras listas: um valor diferente faria a
// advogada aprender dois ritmos de navegação no mesmo sistema.
const POR_PAGINA = 20;

// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE CLIENTES — Fase 3.5 (DEC-121), no padrão da Figura 19
//
// O balão das listas da 3.2/3.4: `CabecalhoDeLista` com o total, a busca em
// pílula e o "+"; os filtros em pílulas, todos na URL (DEC-103); a linha
// inteira abre o detalhe; o ⋮ fixo à direita (DEC-107); a paginação; o
// espelho offline com o aviso de idade (DEC-058).
//
// Colunas: nome (com o avatar), tipo, CPF/CNPJ, e-mail, telefone e ações. O
// endereço saiu: está no detalhe. **Sem seleção em massa** (a da Raniele não
// entra, decisão 1 da fase).
//
// ── A busca não perde o foco (F-1a.1) ────────────────────────────────────
// Nada aqui troca a árvore pelo `<Loading/>`: a busca mora no cabeçalho, que
// nunca desmonta, e o indicador fica ABAIXO dos controles, só na PRIMEIRA
// carga. A recarga por filtro mantém a tabela, esmaecida (DEC-102). **Não se
// corrige com `autoFocus` nem `.focus()` em efeito.**
// ═══════════════════════════════════════════════════════════════════════════
function ClienteListPage() {
  const online = useOnlineStatus();
  const clicarNaLinha = useLinhaClicavel();

  const {
    filtros, buscaDebounced, page, setPage, definirFiltro, aplicarPreset, limpar
  } = useListFilters(FILTROS_DA_LISTA, { naUrl: true });

  // DEC-058 (F-5a): a mesma consulta, com espelho local escopado por usuário.
  // Os parâmetros são os MESMOS do `fetcher` — é o que faz a chave do espelho
  // distinguir cada filtro, cada página e cada ordem. Guarda-se o ENVELOPE:
  // sem o `total`, a tela sem sinal mostraria 20 clientes sem dizer que há 242.
  const consulta = consultaDaLista(filtros, { page, limit: POR_PAGINA, busca: buscaDebounced || undefined });
  const { data, loading: carregando, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'clients',
    params: consulta,
    fetcher: () => clientService.getAllClients(consulta).then((res) => res.data),
    fallbackError: 'Falha ao buscar clientes.'
  });
  const clientes = data?.data ?? (Array.isArray(data) ? data : []);
  const total = typeof data?.total === 'number' ? data.total : 0;
  const totalConhecido = typeof data?.total === 'number' ? data.total : null;
  const loading = carregando && !data;

  // DEC-052/053 (DEC-122): a prévia, a recusa e as frases moram no hook, o
  // mesmo do ⋮ do detalhe. Depois de agir, a lista refaz a consulta: o
  // registro pode ou não continuar visível, conforme o filtro de situação.
  const desativacao = useDesativacaoCliente({ aoConcluir: reload });

  // A ordem não recorta (DEC-062): fica fora de "Filtros aplicados".
  const temFiltro = temRecorte(filtros, buscaDebounced);
  const recorte = descricaoDoRecorteDeClientes({ filtros, busca: buscaDebounced });
  const motivoSemSinal = blockReason(null, { online });

  return (
    <div className="module-container">
      <section className="lista-balao" aria-labelledby="titulo-lista-clientes">
        <CabecalhoDeLista
          id="titulo-lista-clientes"
          titulo="Clientes"
          total={totalConhecido}
          busca={filtros.busca}
          onBusca={(v) => definirFiltro('busca', v)}
          placeholderBusca="Buscar por nome, razão social, CPF/CNPJ ou e-mail…"
          rotuloBusca="Buscar clientes"
          novoRotulo="Novo cliente"
          novoDestino="/dashboard/clientes/novo"
          novoMotivo={online ? null : MENSAGEM_ESCRITA_OFFLINE}
        />

        {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
        {error && <p className="error-message">{error}</p>}

        <FinancialFilters
          filtros={filtros}
          definirFiltro={definirFiltro}
          aplicarPreset={aplicarPreset}
          limpar={limpar}
          temFiltro={temFiltro}
          honorarios={null}
          descricaoDoRecorte={recorte}
          semBusca
          pilulas
          semPeriodo
        >
          <select
            value={filtros.tipoPessoa}
            onChange={e => definirFiltro('tipoPessoa', e.target.value)}
            aria-label="Tipo de pessoa"
          >
            {TIPO_PESSOA_OPTIONS_FILTRO.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* DEC-119 — "Com processo não liberado" é a regra do cartão do
              Início (DEC-108), contada por cliente. */}
          <select
            value={filtros.portal}
            onChange={e => definirFiltro('portal', e.target.value)}
            aria-label="Acesso ao portal"
          >
            {PORTAL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* DEC-052 — se o REGISTRO existe para o sistema. É por aqui que um
              cliente desativado volta a ser alcançável. */}
          <select
            value={filtros.situacao}
            onChange={e => definirFiltro('situacao', e.target.value)}
            aria-label="Situação do registro"
          >
            {SITUACAO_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* DEC-062 — A–Z é o padrão; trocar o sentido volta à página 1 (o
              `definirFiltro`). Ordenar não recorta, e não entra em "Filtros
              aplicados". */}
          <select
            value={filtros.ordem}
            onChange={e => definirFiltro('ordem', e.target.value)}
            aria-label="Ordenação da lista"
          >
            {ORDEM_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FinancialFilters>

        {loading ? (
          <Loading />
        ) : clientes.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            description={
              temFiltro
                ? `Nenhum cliente ${recorte}. Limpe os filtros para ver a lista inteira.`
                : 'Cadastre um novo cliente para vê-lo aqui.'
            }
          />
        ) : (
          <div className="table-wrapper" aria-busy={carregando || undefined}>
            {/* Larguras estáveis (Fase 4.3); a última coluna fica fixa à
                direita (DEC-107) e a tabela rola dentro do wrapper. */}
            <table className="data-table data-table--fixed data-table--acoes-fixas">
              <colgroup>
                <col className="col-lg" />
                <col className="col-sm" />
                <col className="col-md" />
                <col className="col-lg" />
                <col className="col-sm" />
                <col className="col-acoes-menu" />
              </colgroup>
              <thead>
                <tr>
                  <th>Nome / Razão social</th>
                  <th>Tipo</th>
                  <th>CPF / CNPJ</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map(cliente => {
                  const destino = destinoDaLinha(cliente);
                  const desativado = cliente.ativo === false;
                  const nome = nomeDoCliente(cliente);
                  return (
                    <tr
                      key={cliente._id}
                      className={`${destino ? 'linha-clicavel' : ''}${desativado ? ' linha-desativada' : ''}`.trim() || undefined}
                      onClick={clicarNaLinha(destino)}
                    >
                      <td className="cell-truncate" title={nome}>
                        <span className="cliente-nome-celula">
                          <Avatar id={cliente._id} nome={nome} tamanho="pequeno" />
                          <span className="cliente-nome-celula__texto">
                            {/* DEC-052: a tag vem ANTES do nome — é ela que muda
                                como o resto da linha deve ser lido. */}
                            {desativado && <span className="tag-desativado">Desativado</span>}
                            {/* O link do nome é o alvo de Tab da linha
                                (DEC-102); o desativado não tem detalhe. */}
                            {destino ? (
                              <Link to={destino} className="link-interno">{nome}</Link>
                            ) : (
                              nome
                            )}
                          </span>
                        </span>
                      </td>
                      <td className="cell-truncate">{tipoDoCliente(cliente)}</td>
                      <td className="cell-truncate">{documentoNaLista(cliente)}</td>
                      <td className="cell-truncate" title={cliente.email || undefined}>{cliente.email || '—'}</td>
                      <td className="cell-truncate">{telefoneNaLista(cliente)}</td>
                      {/* DEC-047: a coluna de ações é o menu ⋮. */}
                      <td className="actions-cell actions-cell--menu">
                        <ActionMenu
                          rotulo={`Ações de ${nome}`}
                          itens={
                            /* DEC-052: as duas ações são MUTUAMENTE exclusivas,
                               e a que aparece é a que o estado permite. Sem
                               sinal, tudo que grava fica desabilitado COM o
                               motivo (F-5a, Parte 4). */
                            cliente.ativo === false
                              ? [{
                                  rotulo: 'Reativar',
                                  motivo: motivoSemSinal,
                                  onSelecionar: () => desativacao.abrir(cliente._id, 'reativar')
                                }]
                              : [
                                  {
                                    rotulo: 'Editar',
                                    to: `/dashboard/clientes/editar/${cliente._id}`,
                                    motivo: motivoSemSinal
                                  },
                                  {
                                    rotulo: 'Desativar',
                                    destrutivo: true,
                                    motivo: motivoSemSinal,
                                    onSelecionar: () => desativacao.abrir(cliente._id, 'desativar')
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

        {/* O paginador fica FORA do `loading` — ver a nota em `PaymentListPage`.
            Com a ordem alfabética (DEC-062), sem ele o fim do alfabeto não
            existiria na tela. */}
        {!loading && total > 0 && (
          <Paginador
            page={page}
            limit={POR_PAGINA}
            total={total}
            rotulo="cliente"
            onMudarPagina={setPage}
          />
        )}
      </section>

      <Modal {...desativacao.propsDoModal} />
    </div>
  );
}

export default ClienteListPage;
