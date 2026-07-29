import React, { useCallback, useEffect, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import secaoService from '../../api/secaoService';
import Loading from '../common/Loading';
import { TIPO_SECAO_OPTIONS, labelDe } from '../../utils/enums';
import { getApiErrorMessage } from '../../utils/apiError';
import './SecaoLibraryPanel.css';

// ═══════════════════════════════════════════════════════════════════════════
// BARRA LATERAL — A BIBLIOTECA
//
// Reusa o filtro por tipo e a busca por título que a Fase 2D.1 entregou,
// inclusive a insensibilidade a acento, que está resolvida no regex do backend.
// NÃO normalizar o termo aqui: "qualificacao" e "qualificação" já trazem o
// mesmo resultado, e mexer no termo antes de enviar quebraria isso.
//
// Duas formas de inserir, ambas obrigatórias:
//   Adicionar   → acrescenta ao fim do documento
//   arrastar    → insere na posição onde soltar
//   (e o clique na miniatura "arma" a seção, fazendo aparecerem os slots
//    "Inserir aqui" no canvas — é o equivalente por toque do arrastar)
//
// Seção já presente no documento aparece marcada como usada e não pode entrar
// de novo. A restrição real é o índice único {documentoId, secaoId} do banco; a
// tela antecipa para a advogada não tentar, mas não substitui a garantia.
// ═══════════════════════════════════════════════════════════════════════════

const TAMANHO_TRECHO = 90;

const trechoInicial = (texto) => {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= TAMANHO_TRECHO) return limpo;
  return `${limpo.slice(0, TAMANHO_TRECHO).trimEnd()}…`;
};

function SecaoLibraryPanel({ idsUsados, secaoArmada, onArmar, onAdicionarAoFim, desabilitado }) {
  const [secoes, setSecoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');

  // Debounce: sem ele cada tecla vira uma requisição.
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(() => {
    setLoading(true);
    setError('');
    secaoService
      .listSecoes({
        limit: 100,
        tipo: tipo || undefined,
        busca: buscaDebounced.trim() || undefined,
      })
      .then((res) => setSecoes(res.data.data ?? res.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Falha ao carregar a biblioteca de seções.')))
      .finally(() => setLoading(false));
  }, [tipo, buscaDebounced]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const temFiltro = Boolean(tipo || buscaDebounced.trim());

  return (
    <aside className="biblioteca" aria-label="Biblioteca de seções">
      <div className="biblioteca__cabecalho">
        <h2 className="biblioteca__titulo">Biblioteca de seções</h2>
        <p className="biblioteca__ajuda">
          <strong>Adicionar</strong> põe no fim. Para escolher a posição, toque na miniatura e
          use “Inserir aqui” — ou arraste até a folha.
        </p>
      </div>

      <div className="biblioteca__filtros">
        <label className="biblioteca__busca">
          <Search size={14} aria-hidden="true" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={80}
            aria-label="Buscar seção por título"
          />
        </label>
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

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <Loading />
      ) : secoes.length === 0 ? (
        <div className="biblioteca__vazio">
          <p>
            {temFiltro
              ? 'Nenhuma seção corresponde ao filtro.'
              : 'A biblioteca está vazia. Cadastre seções em Seções, no menu.'}
          </p>
          {temFiltro && (
            <button
              type="button"
              className="ui-btn ui-btn--secondary ui-btn--sm"
              onClick={() => {
                setTipo('');
                setBusca('');
              }}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="biblioteca__lista">
          {secoes.map((secao) => {
            const usada = idsUsados.has(String(secao._id));
            const armada = secaoArmada?._id === secao._id;

            return (
              <li key={secao._id}>
                <div
                  className={[
                    'miniatura',
                    usada ? 'miniatura--usada' : '',
                    armada ? 'miniatura--armada' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  draggable={!usada && !desabilitado}
                  onDragStart={(evento) => {
                    if (usada || desabilitado) return;
                    evento.dataTransfer.setData('text/lex-secao-id', String(secao._id));
                    evento.dataTransfer.setData('text/lex-origem', 'biblioteca');
                    evento.dataTransfer.effectAllowed = 'copy';
                  }}
                >
                  {/* O corpo da miniatura é o botão que arma a seção para
                      inserção por posição. Um <button> de verdade, para
                      funcionar em toque e por teclado — não um div com
                      onClick. */}
                  <button
                    type="button"
                    className="miniatura__corpo"
                    onClick={() => onArmar(armada ? null : secao)}
                    disabled={usada || desabilitado}
                    aria-pressed={armada}
                    aria-label={
                      usada
                        ? `“${secao.titulo}” já está no documento`
                        : `Escolher posição para “${secao.titulo}”`
                    }
                  >
                    <span className="miniatura__linha1">
                      <span className="miniatura__titulo">{secao.titulo}</span>
                      <span className="miniatura__tipo">
                        {labelDe(TIPO_SECAO_OPTIONS, secao.tipo)}
                      </span>
                    </span>
                    <span className="miniatura__trecho">{trechoInicial(secao.texto)}</span>
                  </button>

                  {usada ? (
                    <span className="miniatura__usada-selo">
                      <Check size={12} aria-hidden="true" />
                      no documento
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="miniatura__adicionar"
                      onClick={() => onAdicionarAoFim(secao)}
                      disabled={desabilitado}
                      title="Acrescentar ao fim do documento"
                    >
                      <Plus size={13} aria-hidden="true" />
                      Adicionar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

export default SecaoLibraryPanel;
