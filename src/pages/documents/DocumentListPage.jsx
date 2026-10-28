import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import documentService from '../../api/documentService';
import ActionMenu from '../../components/ui/ActionMenu';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Paginador from '../../components/ui/Paginador';
import Loading from '../../components/common/Loading';
import CabecalhoDeLista from '../../components/financeiro/CabecalhoDeLista';
import FinancialFilters from '../../components/financeiro/FinancialFilters';
import useLinhaClicavel from '../../components/financeiro/useLinhaClicavel';
import useListFilters from '../../hooks/useListFilters';
import useCachedResource from '../../hooks/useCachedResource';
import { TIPO_DOCUMENTO_OPTIONS, labelDe } from '../../utils/enums';
import { formatDate } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/toast';
import '../../styles/modules.css';
import './DocumentListPage.css';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import useProcessoFiltrado from '../../hooks/useProcessoFiltrado';
import OfflineNotice from '../../components/ui/OfflineNotice';
import ProcessFilterChip from '../../components/ui/ProcessFilterChip';
import { MENSAGEM_DOWNLOAD_OFFLINE, blockReason } from '../../offline/offlineMessages';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';
import {
  AJUDA_DO_PERIODO,
  EXTRAS_DA_LISTA,
  FILTROS_DA_LISTA,
  PRESETS_DA_LISTA,
  consultaDaLista,
  descricaoDoRecorteDeDocumentos,
  destinoDaLinha,
  destinoDoNovo,
  envelopeParaOEspelho,
  rotuloDoProcessoNaLinha,
} from './listaDocumentos.js';

const POR_PAGINA = 20;

// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE DOCUMENTOS — Fase 3.9a (DEC-139), no padrão da Figura 19
//
// O balão das listas da 3.2 a 3.5: `CabecalhoDeLista` com o total, a busca em
// pílula e o "+"; o período por data de geração em pílula, na URL (DEC-103);
// o chip do `?processoId=` (DEC-070); a linha inteira abre o texto final; o ⋮
// fixo à direita (DEC-107) e a regra das telas estreitas (DEC-133/135); a
// paginação no lugar do teto de 100. Sem seleção em massa.
//
// Só documentos GERADOS aparecem aqui. O caminho de upload segue dormente na
// API, fora da interface — o anteprojeto assinado exclui upload do escopo.
// O que se baixa é o PDF/DOCX que o sistema renderiza a partir do texto.
// ═══════════════════════════════════════════════════════════════════════════
function DocumentListPage() {
  const online = useOnlineStatus();
  const clicarNaLinha = useLinhaClicavel();
  const [deleteModal, setDeleteModal] = useState({ open: false, documento: null });
  const [baixando, setBaixando] = useState('');

  const {
    filtros, buscaDebounced, page, setPage,
    definirFiltro, aplicarPreset, limpar, temFiltro
  } = useListFilters(FILTROS_DA_LISTA, { naUrl: true, extrasNaLimpeza: EXTRAS_DA_LISTA });

  // `?processoId=` vem da aba do processo; aparece num chip (DEC-070).
  const filtroProcesso = useProcessoFiltrado({ avisoProprio: true });
  const processoId = filtroProcesso.processoId || undefined;

  // DEC-058: a mesma consulta, com espelho local escopado por usuário — o
  // ENVELOPE, para o total continuar dito sem sinal.
  const consulta = consultaDaLista(filtros, {
    page, limit: POR_PAGINA, busca: buscaDebounced || undefined, processoId
  });
  const { data, loading: carregando, error, updatedAt, fromCache, reload } = useCachedResource({
    resource: 'documents',
    params: consulta,
    // Sem o texto da peça: ver `envelopeParaOEspelho`.
    fetcher: () => documentService.listDocuments(consulta).then((res) => envelopeParaOEspelho(res.data)),
    fallbackError: 'Falha ao buscar documentos.'
  });
  const documentos = data?.data ?? [];
  const total = typeof data?.total === 'number' ? data.total : 0;
  const totalConhecido = typeof data?.total === 'number' ? data.total : null;
  // A PRIMEIRA carga troca a tabela pelo indicador; a recarga mantém a tabela.
  const loading = carregando && !data;

  const recorte = descricaoDoRecorteDeDocumentos({
    filtros,
    busca: buscaDebounced,
    processo: processoId ? { rotulo: filtroProcesso.rotulo } : null,
  });
  const comRecorte = temFiltro || Boolean(processoId);

  const handleDelete = async () => {
    const { documento } = deleteModal;
    setDeleteModal({ open: false, documento: null });

    try {
      await documentService.deleteDocument(documento._id);
      // Refaz a consulta: recortar só na tela deixaria o espelho com o
      // documento que acabou de sair, e o total errado.
      reload();
      toast.success('Documento removido com sucesso.');
    } catch (err) {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Erro ao remover documento.'));
    }
  };

  const baixar = async (documento, formato) => {
    // PDF e DOCX NÃO ficam guardados neste aparelho (Parte 2 da F-5a): são
    // binários grandes e o valor de tê-los offline é baixo perto do custo. Sem
    // sinal a tela diz isso — no motivo do item, antes do clique.
    if (!online) return;
    const chave = `${documento._id}-${formato}`;
    setBaixando(chave);
    try {
      const { nome, tamanho } = await documentService.baixarEsalvar(documento._id, formato);
      const kb = tamanho ? ` (${Math.round(tamanho / 1024)} kB)` : '';
      toast.success(`${nome}${kb}`);
    } catch (err) {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, `Não foi possível baixar em ${formato.toUpperCase()}.`));
    } finally {
      setBaixando('');
    }
  };

  const novoDestino = destinoDoNovo(processoId);

  return (
    <div className="module-container">
      <section className="lista-balao" aria-labelledby="titulo-lista-documentos">
        {/* O "+" leva à montagem, como o "Gerar documento" de antes. Sem sinal
            ele continua levando: a regra da geração sem sinal é da montagem
            (o envio é recusado pela guarda da F-5a), e esta fase não a muda. */}
        <CabecalhoDeLista
          id="titulo-lista-documentos"
          titulo="Documentos"
          total={totalConhecido}
          busca={filtros.busca}
          onBusca={(v) => definirFiltro('busca', v)}
          placeholderBusca="Buscar por nome, número do processo ou cliente…"
          rotuloBusca="Buscar documentos"
          novoRotulo="Gerar documento"
          novoDestino={novoDestino}
        />

        {/* DEC-109: UM aviso de idade. A lista veio do espelho → a hora dela;
            só o processo do chip veio do espelho → a hora dele. */}
        {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
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
          limpar={limpar}
          temFiltro={comRecorte}
          descricaoDoRecorte={recorte}
          semBusca
          pilulas
          presets={PRESETS_DA_LISTA}
          ajudaDoPeriodo={AJUDA_DO_PERIODO}
        />

        {loading ? (
          <Loading />
        ) : documentos.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={32} />}
            // Com o filtro, "nenhum documento gerado ainda" seria falso sobre o
            // escritório: é ESTE recorte que não tem documento (DEC-070).
            title={
              processoId && !temFiltro
                ? 'Nenhum documento deste processo.'
                : comRecorte
                  ? 'Nenhum documento encontrado'
                  : 'Nenhum documento gerado ainda.'
            }
            description={
              comRecorte
                ? `Nenhum documento ${recorte}. Limpe os filtros para ver a lista inteira.`
                : 'Documento nasce de um modelo: monte o modelo com as seções, escolha o processo e o cliente, e gere. O arquivo em PDF e DOCX sai daqui.'
            }
            action={
              comRecorte ? null : (
                <Link to={novoDestino} className="ui-btn ui-btn--primary ui-btn--md">
                  Gerar o primeiro documento
                </Link>
              )
            }
          />
        ) : (
          <div className="table-wrapper" aria-busy={carregando || undefined}>
            <table className="data-table data-table--fixed data-table--acoes-fixas data-table--primeira-fixa" data-lista="documentos">
              <colgroup>
                {/* DEC-133/135 (Fase 3.9a): o nome é a coluna fixa à esquerda e
                    a que CEDE (`col-cede`: recebe a sobra a partir de 1024, 220
                    px abaixo, 128 no celular). Processo e cliente `prio-2`, tipo
                    `prio-3`; data e situação `prio-1`. Sem o nome, 930 px com
                    tudo; 760 sem o tipo; 420 só com as `prio-1`. */}
                <col className="col-cede" />
                <col className="col-md prio-3" />
                <col className="col-md prio-2" />
                <col className="col-md prio-2" />
                <col className="col-data" />
                <col className="col-md" />
                <col className="col-acoes-menu" />
              </colgroup>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th className="prio-3">Tipo</th>
                  <th className="prio-2">Processo</th>
                  <th className="prio-2">Cliente</th>
                  <th>Gerado em</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((documento) => {
                  const destino = destinoDaLinha(documento);
                  const processo = rotuloDoProcessoNaLinha(documento.processoId);
                  const cliente = documento.cliente?.nome || '—';
                  return (
                    <tr key={documento._id} className="linha-clicavel" onClick={clicarNaLinha(destino)}>
                      {/* O link do nome é o alvo de Tab da linha (DEC-102). */}
                      <td className="cell-truncate" title={documento.nome}>
                        <Link to={destino} className="link-interno">{documento.nome}</Link>
                      </td>
                      <td className="cell-truncate prio-3">{labelDe(TIPO_DOCUMENTO_OPTIONS, documento.tipo)}</td>
                      <td className="cell-truncate prio-2" title={processo}>{processo}</td>
                      <td className="cell-truncate prio-2" title={cliente}>{cliente}</td>
                      <td>{documento.dataGeracao ? formatDate(documento.dataGeracao) : '—'}</td>
                      <td>
                        <div className="doc-selos">
                          {documento.editadoManualmente && (
                            <span className="doc-selo doc-selo--editado">editado à mão</span>
                          )}
                          {documento.visivelPortal && (
                            <span className="doc-selo doc-selo--portal">no portal</span>
                          )}
                          {!documento.editadoManualmente && !documento.visivelPortal && (
                            <span className="doc-selo doc-selo--neutro">gerado</span>
                          )}
                        </div>
                      </td>
                      {/* DEC-047: a coluna de ações é o menu ⋮. O estado
                          "baixando" continua: o item mostra "Baixando…" e fica
                          desabilitado, fora do ciclo do Tab (F-1b.3.2). */}
                      <td className="actions-cell actions-cell--menu">
                        <ActionMenu
                          rotulo={`Ações do documento ${documento.nome || ''}`.trim()}
                          itens={[
                            { rotulo: 'Abrir', to: destino },
                            {
                              rotulo: baixando === `${documento._id}-pdf` ? 'Baixando…' : 'Baixar PDF',
                              onSelecionar: () => baixar(documento, 'pdf'),
                              desabilitado: Boolean(baixando),
                              motivo: online ? undefined : MENSAGEM_DOWNLOAD_OFFLINE
                            },
                            {
                              rotulo: baixando === `${documento._id}-docx` ? 'Baixando…' : 'Baixar DOCX',
                              onSelecionar: () => baixar(documento, 'docx'),
                              desabilitado: Boolean(baixando),
                              motivo: online ? undefined : MENSAGEM_DOWNLOAD_OFFLINE
                            },
                            {
                              rotulo: 'Excluir',
                              destrutivo: true,
                              motivo: blockReason(null, { online }),
                              onSelecionar: () => setDeleteModal({ open: true, documento })
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
            rotulo="documento"
            onMudarPagina={setPage}
          />
        )}
      </section>

      <Modal
        open={deleteModal.open}
        title="Remover documento"
        message={
          deleteModal.documento
            ? `Remover "${deleteModal.documento.nome}"? Ele sai da lista, e os vínculos de seção dele são desativados junto.`
            : ''
        }
        variant="danger"
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ open: false, documento: null })}
      />
    </div>
  );
}

export default DocumentListPage;
