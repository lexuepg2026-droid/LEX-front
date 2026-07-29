import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LibraryBig } from 'lucide-react';
import secaoService from '../../api/secaoService';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Loading from '../../components/common/Loading';
import SecaoPreviewModal from '../../components/secoes/SecaoPreviewModal';
import { TIPO_SECAO_OPTIONS, labelDe } from '../../utils/enums';
import { getApiErrorMessage } from '../../utils/apiError';
import { toast } from '../../utils/toast';
import '../../styles/modules.css';
import './SecaoPage.css';

// Trecho inicial do texto, para a lista dar ideia do conteúdo sem virar
// parede de texto. As quebras viram espaço: numa célula de tabela elas não
// ajudam a reconhecer a seção.
const TAMANHO_TRECHO = 120;

const trechoInicial = (texto) => {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= TAMANHO_TRECHO) return limpo;
  return `${limpo.slice(0, TAMANHO_TRECHO).trimEnd()}…`;
};

function SecaoListPage() {
  const [secoes, setSecoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');

  const [preview, setPreview] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, secao: null });

  // Debounce da busca: sem ele cada tecla vira uma requisição.
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(() => {
    setLoading(true);
    setError('');
    // A busca do backend ignora caixa e acento — nada a normalizar aqui.
    secaoService
      .listSecoes({
        limit: 100,
        tipo: tipo || undefined,
        busca: buscaDebounced.trim() || undefined,
      })
      .then((res) => setSecoes(res.data.data ?? res.data))
      .catch((err) =>
        setError(getApiErrorMessage(err, 'Falha ao carregar as seções.'))
      )
      .finally(() => setLoading(false));
  }, [tipo, buscaDebounced]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleDelete = async () => {
    const { secao } = deleteModal;
    setDeleteModal({ open: false, secao: null });
    try {
      await secaoService.deleteSecao(secao._id);
      setSecoes((atual) => atual.filter((s) => s._id !== secao._id));
      toast.success('Seção desativada com sucesso.');
    } catch (err) {
      // 409 quando a seção está em uso: a mensagem do backend já nomeia os
      // documentos que a usam, então basta exibi-la.
      toast.error(getApiErrorMessage(err, 'Erro ao desativar a seção.'));
    }
  };

  const temFiltro = Boolean(tipo || buscaDebounced.trim());

  return (
    <div className="module-container">
      <PageHeader
        title="Biblioteca de Seções"
        actionLabel="Nova Seção"
        actionTo="/dashboard/secoes/nova"
      />

      <p className="secao-intro">
        Trechos reutilizáveis de texto. A mesma qualificação serve a procuração,
        contrato e declaração — escreva uma vez e use em quantos documentos
        precisar.
      </p>

      {error && <p className="error-message">{error}</p>}

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Buscar por título..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          maxLength={80}
          aria-label="Buscar seção por título"
        />
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          aria-label="Filtrar por tipo de seção"
        >
          <option value="">Todos os tipos</option>
          {TIPO_SECAO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : secoes.length === 0 ? (
        <EmptyState
          icon={<LibraryBig size={32} />}
          title={
            temFiltro
              ? 'Nenhuma seção corresponde ao filtro.'
              : 'Nenhuma seção cadastrada ainda.'
          }
          description={
            temFiltro
              ? 'Tente outro termo de busca ou volte para "Todos os tipos".'
              : 'Comece pela qualificação das partes: é o trecho que mais se repete entre documentos. Depois acrescente cláusulas, pedidos e o encerramento.'
          }
          action={
            temFiltro ? (
              <button
                type="button"
                className="ui-btn ui-btn--secondary ui-btn--md"
                onClick={() => {
                  setTipo('');
                  setBusca('');
                }}
              >
                Limpar filtros
              </button>
            ) : (
              <Link to="/dashboard/secoes/nova" className="ui-btn ui-btn--primary ui-btn--md">
                Criar primeira seção
              </Link>
            )
          }
        />
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Trecho inicial</th>
                <th>Variáveis</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {secoes.map((secao) => (
                <tr key={secao._id}>
                  <td>{secao.titulo}</td>
                  <td>
                    <span className="secao-tipo-badge">
                      {labelDe(TIPO_SECAO_OPTIONS, secao.tipo)}
                    </span>
                  </td>
                  <td className="secao-trecho">{trechoInicial(secao.texto)}</td>
                  <td>{secao.variaveis?.length ?? 0}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      onClick={() => setPreview(secao)}
                      className="btn-action btn-view"
                    >
                      Ver
                    </button>
                    <Link
                      to={`/dashboard/secoes/editar/${secao._id}`}
                      className="btn-action btn-edit"
                    >
                      Editar
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteModal({ open: true, secao })}
                      className="btn-action btn-delete"
                    >
                      Desativar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
