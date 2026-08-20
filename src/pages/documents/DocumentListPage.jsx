import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FolderOpen } from 'lucide-react';
import documentService from '../../api/documentService';
import PageHeader from '../../components/ui/PageHeader';
import ActionMenu from '../../components/ui/ActionMenu';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Loading from '../../components/common/Loading';
import { TIPO_DOCUMENTO_OPTIONS, labelDe } from '../../utils/enums';
import { formatDate } from '../../utils/formatters';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/toast';
import '../../styles/modules.css';
import './DocumentListPage.css';

// Só documentos GERADOS aparecem aqui. O caminho de upload segue dormente na
// API (o campo `origem` aceita "upload"), mas fora da interface — o anteprojeto
// assinado exclui upload do escopo. Por isso a lista não tem mais coluna de
// arquivo nem link para `urlArquivo`: o que se baixa é o PDF/DOCX que o sistema
// renderiza a partir do texto.

function DocumentListPage() {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteModal, setDeleteModal] = useState({ open: false, documento: null });
  const [baixando, setBaixando] = useState('');

  const [searchParams] = useSearchParams();
  const processoId = searchParams.get('processoId');

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError('');

    documentService
      .listDocuments({ page: 1, limit: 100, processoId })
      .then((res) => {
        if (!ativo) return;
        const lista = res.data.data ?? res.data;
        // Modelo é peça interna de composição e tem tela própria (a montagem).
        // Misturá-lo aqui faria a advogada baixar um modelo achando que era o
        // documento do cliente.
        setDocumentos((Array.isArray(lista) ? lista : []).filter((d) => d.ehModelo !== true));
      })
      .catch((err) => {
        if (ativo) setError(getApiErrorMessage(err, 'Falha ao buscar documentos.'));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => { ativo = false; };
  }, [processoId]);

  const handleDelete = async () => {
    const { documento } = deleteModal;
    setDeleteModal({ open: false, documento: null });

    try {
      await documentService.deleteDocument(documento._id);
      setDocumentos((atual) => atual.filter((d) => d._id !== documento._id));
      toast.success('Documento removido com sucesso.');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erro ao remover documento.'));
    }
  };

  const baixar = async (documento, formato) => {
    const chave = `${documento._id}-${formato}`;
    setBaixando(chave);
    try {
      const { nome, tamanho } = await documentService.baixarEsalvar(documento._id, formato);
      const kb = tamanho ? ` (${Math.round(tamanho / 1024)} kB)` : '';
      toast.success(`${nome}${kb}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, `Não foi possível baixar em ${formato.toUpperCase()}.`));
    } finally {
      setBaixando('');
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="module-container">
      <PageHeader
        title="Documentos"
        actionLabel="Gerar documento"
        actionTo="/dashboard/documentos/montar?modo=documento"
      />

      {error && <p className="error-message">{error}</p>}

      {documentos.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={32} />}
          title="Nenhum documento gerado ainda."
          description="Documento nasce de um modelo: monte o modelo com as seções, escolha o processo e o cliente, e gere. O arquivo em PDF e DOCX sai daqui."
          action={
            <Link
              to="/dashboard/documentos/montar?modo=documento"
              className="ui-btn ui-btn--primary ui-btn--md"
            >
              Gerar o primeiro documento
            </Link>
          }
        />
      ) : (
        <div className="table-wrapper">
          {/* Larguras estáveis (Fase 4.3) — ver `styles/modules.css`. A coluna
              de ações é a mais larga do app: são quatro botões, dois deles com
              ícone. */}
          <table className="data-table data-table--fixed">
            <colgroup>
              <col />
              <col className="col-md" />
              <col />
              <col className="col-sm" />
              <col className="col-md" />
              <col className="col-acoes-menu" />
            </colgroup>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Processo</th>
                <th>Gerado em</th>
                <th>Situação</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((documento) => (
                <tr key={documento._id}>
                  <td className="cell-truncate" title={documento.nome}>
                    <Link to={`/dashboard/documentos/${documento._id}/texto`}>{documento.nome}</Link>
                  </td>
                  <td className="cell-truncate">{labelDe(TIPO_DOCUMENTO_OPTIONS, documento.tipo)}</td>
                  <td className="cell-truncate" title={documento.processoId?.titulo || undefined}>{documento.processoId?.titulo || '—'}</td>
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
                  {/* DEC-047: a coluna de ações é o menu ⋮. Era a listagem com
                      MAIS botões do projeto — quatro, em 340 px —, e por isso a
                      que mais ganha com a largura de um botão só.

                      Os ÍCONES saíram: dentro do menu, o item é uma linha de
                      texto, e "Baixar PDF" por extenso diz mais que um ícone
                      de 13 px ao lado de "PDF". O `title` que existia para
                      explicar o ícone deixou de ser necessário pelo mesmo
                      motivo — o rótulo já é a explicação.

                      O estado "baixando" continua: o item mostra "Baixando…" e
                      fica DESABILITADO, como o "Baixar recibo" da listagem de
                      pagamentos. Item desabilitado sai do ciclo do Tab
                      (F-1b.3.2), então o menu não trava nele. */}
                  <td className="actions-cell actions-cell--menu">
                    <ActionMenu
                      rotulo={`Ações do documento ${documento.titulo || ''}`.trim()}
                      itens={[
                        { rotulo: 'Abrir', to: `/dashboard/documentos/${documento._id}/texto` },
                        {
                          rotulo: baixando === `${documento._id}-pdf` ? 'Baixando…' : 'Baixar PDF',
                          onSelecionar: () => baixar(documento, 'pdf'),
                          desabilitado: Boolean(baixando)
                        },
                        {
                          rotulo: baixando === `${documento._id}-docx` ? 'Baixando…' : 'Baixar DOCX',
                          onSelecionar: () => baixar(documento, 'docx'),
                          desabilitado: Boolean(baixando)
                        },
                        {
                          rotulo: 'Excluir',
                          destrutivo: true,
                          onSelecionar: () => setDeleteModal({ open: true, documento })
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
