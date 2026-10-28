import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LibraryBig } from 'lucide-react';
import secaoService from '../../api/secaoService';
import ActionMenu from '../../components/ui/ActionMenu';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Paginador from '../../components/ui/Paginador';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import CabecalhoDeLista from '../../components/financeiro/CabecalhoDeLista';
import FinancialFilters from '../../components/financeiro/FinancialFilters';
import useLinhaClicavel from '../../components/financeiro/useLinhaClicavel';
import SecaoPreviewModal from '../../components/secoes/SecaoPreviewModal';
import useListFilters from '../../hooks/useListFilters';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE, blockReason } from '../../offline/offlineMessages';
import { TIPO_SECAO_OPTIONS, labelDe } from '../../utils/enums';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/toast';
import '../../styles/modules.css';
import './SecaoPage.css';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';
import {
  FILTROS_DA_LISTA,
  consultaDaLista,
  descricaoDoRecorteDeSecoes,
  destinoDaLinha,
  trechoInicial,
} from './listaSecoes.js';

const POR_PAGINA = 20;

// ═══════════════════════════════════════════════════════════════════════════
// A BIBLIOTECA DE SEÇÕES — Fase 3.9a (DEC-139), no padrão da Figura 19
//
// O balão das listas: `CabecalhoDeLista` com o total, a busca em pílula e o
// "+"; o tipo em pílula, na URL (DEC-103) junto com a busca; a linha inteira
// abre a edição; o ⋮ fixo à direita (DEC-107) e a regra das telas estreitas
// (DEC-133/135); a paginação no lugar do teto de 100. Sem seleção em massa.
// ═══════════════════════════════════════════════════════════════════════════
function SecaoListPage() {
  const online = useOnlineStatus();
  const clicarNaLinha = useLinhaClicavel();
  const [preview, setPreview] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, secao: null });

  const {
    filtros, buscaDebounced, page, setPage,
    definirFiltro, aplicarPreset, limpar, temFiltro
  } = useListFilters(FILTROS_DA_LISTA, { naUrl: true });

  const consulta = consultaDaLista(filtros, { page, limit: POR_PAGINA, busca: buscaDebounced || undefined });
  const { data, loading: carregando, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'secoes',
    params: consulta,
    fetcher: () => secaoService.listSecoes(consulta).then((res) => res.data),
    fallbackError: 'Falha ao carregar as seções.'
  });
  const secoes = data?.data ?? [];
  const total = typeof data?.total === 'number' ? data.total : 0;
  const totalConhecido = typeof data?.total === 'number' ? data.total : null;
  const loading = carregando && !data;

  const recorte = descricaoDoRecorteDeSecoes({ filtros, busca: buscaDebounced });

  const handleDelete = async () => {
    const { secao } = deleteModal;
    setDeleteModal({ open: false, secao: null });
    try {
      await secaoService.deleteSecao(secao._id);
      reload();
      toast.success('Seção desativada com sucesso.');
    } catch (err) {
      // 409 quando a seção está em uso: a mensagem do backend já nomeia os
      // documentos que a usam, então basta exibi-la.
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Erro ao desativar a seção.'));
    }
  };

  return (
    <div className="module-container">
      <section className="lista-balao" aria-labelledby="titulo-lista-secoes">
        <CabecalhoDeLista
          id="titulo-lista-secoes"
          titulo="Biblioteca de Seções"
          total={totalConhecido}
          busca={filtros.busca}
          onBusca={(v) => definirFiltro('busca', v)}
          placeholderBusca="Buscar por título…"
          rotuloBusca="Buscar seções"
          novoRotulo="Nova seção"
          novoDestino="/dashboard/secoes/nova"
          novoMotivo={online ? null : MENSAGEM_ESCRITA_OFFLINE}
        />

        <p className="secao-intro">
          Trechos reutilizáveis de texto. A mesma qualificação serve a procuração,
          contrato e declaração — escreva uma vez e use em quantos documentos
          precisar.
        </p>

        {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
        {error && <p className="error-message">{error}</p>}

        <FinancialFilters
          filtros={filtros}
          definirFiltro={definirFiltro}
          aplicarPreset={aplicarPreset}
          limpar={limpar}
          temFiltro={temFiltro}
          descricaoDoRecorte={recorte}
          semBusca
          semPeriodo
          pilulas
        >
          <select
            value={filtros.tipo}
            onChange={(e) => definirFiltro('tipo', e.target.value)}
            aria-label="Tipo de seção"
          >
            <option value="">Todos os tipos</option>
            {TIPO_SECAO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FinancialFilters>

        {loading ? (
          <Loading />
        ) : secoes.length === 0 ? (
          <EmptyState
            icon={<LibraryBig size={32} />}
            title={temFiltro ? 'Nenhuma seção encontrada' : 'Nenhuma seção cadastrada ainda.'}
            description={
              temFiltro
                ? `Nenhuma seção ${recorte}. Limpe os filtros para ver a biblioteca inteira.`
                : 'Comece pela qualificação das partes: é o trecho que mais se repete entre documentos. Depois acrescente cláusulas, pedidos e o encerramento.'
            }
            action={
              temFiltro ? null : (
                <Link to="/dashboard/secoes/nova" className="ui-btn ui-btn--primary ui-btn--md">
                  Criar primeira seção
                </Link>
              )
            }
          />
        ) : (
          <div className="table-wrapper" aria-busy={carregando || undefined}>
            <table className="data-table data-table--fixed data-table--acoes-fixas data-table--primeira-fixa" data-lista="secoes">
              <colgroup>
                {/* DEC-133/135 (Fase 3.9a): o título é a coluna fixa à
                    esquerda. Tipo e trecho `prio-1` (o trecho distingue duas
                    seções de títulos parecidos — é identificação para quem
                    lê); a contagem de variáveis `prio-3`.
                    O trecho é a coluna que CEDE (`col-cede`): recebe a sobra a
                    partir de 1024 e tem 220 px abaixo — era `auto` sempre, e
                    numa tabela que rola coluna `auto` recebe zero (medido:
                    0 px a 360). 220/130/80/120 sem ele. */}
                <col className="col-lg" />
                <col className="col-sm" />
                <col className="col-cede" />
                <col className="col-xs prio-3" />
                <col className="col-acoes-menu" />
              </colgroup>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Trecho inicial</th>
                  <th className="prio-3">Variáveis</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {secoes.map((secao) => {
                  const destino = destinoDaLinha(secao);
                  return (
                    <tr key={secao._id} className="linha-clicavel" onClick={clicarNaLinha(destino)}>
                      {/* O link do título é o alvo de Tab da linha (DEC-102). */}
                      <td className="cell-truncate" title={secao.titulo}>
                        <Link to={destino} className="link-interno">{secao.titulo}</Link>
                      </td>
                      <td>
                        <span className="secao-tipo-badge">
                          {labelDe(TIPO_SECAO_OPTIONS, secao.tipo)}
                        </span>
                      </td>
                      {/* Cortado com reticências. O texto inteiro está no "Ver"
                          da própria linha — reticências que levam a algum lugar. */}
                      <td className="secao-trecho cell-truncate">{trechoInicial(secao.texto)}</td>
                      <td className="cell-num prio-3">{secao.variaveis?.length ?? 0}</td>
                      {/* DEC-047: a coluna de ações é o menu ⋮. "Ver" abre um
                          MODAL de pré-visualização (não navega). "Desativar" leva
                          o vermelho e não virou "Excluir": a seção não é apagada. */}
                      <td className="actions-cell actions-cell--menu">
                        <ActionMenu
                          rotulo={`Ações da seção ${secao.titulo || ''}`.trim()}
                          itens={[
                            { rotulo: 'Ver', onSelecionar: () => setPreview(secao) },
                            { rotulo: 'Editar', to: destino },
                            {
                              rotulo: 'Desativar',
                              destrutivo: true,
                              motivo: blockReason(null, { online }),
                              onSelecionar: () => setDeleteModal({ open: true, secao })
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

        {!loading && total > 0 && (
          <Paginador
            page={page}
            limit={POR_PAGINA}
            total={total}
            rotulo="seção"
            onMudarPagina={setPage}
          />
        )}
      </section>

      <SecaoPreviewModal secao={preview} onClose={() => setPreview(null)} />

      <Modal
        open={deleteModal.open}
        title="Desativar seção"
        message={
          deleteModal.secao
            ? `Desativar "${deleteModal.secao.titulo}"? Ela sai da biblioteca, mas os documentos já gerados com ela continuam intactos.`
            : ''
        }
        variant="danger"
        confirmLabel="Desativar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, secao: null })}
      />
    </div>
  );
}

export default SecaoListPage;
