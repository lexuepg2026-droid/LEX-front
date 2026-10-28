import React, { useEffect, useRef, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import secaoService from '../../api/secaoService';
import Loading from '../common/Loading';
import Icone from '../ui/Icone.jsx';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { TIPO_SECAO_OPTIONS, labelDe } from '../../utils/enums';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  FRASE_SEM_CONEXAO_DA_BIBLIOTECA,
  POR_PAGINA_DA_BIBLIOTECA,
  acumularSecoes,
  rotuloDoCarregarMais,
  secoesRestantes,
} from './bibliotecaDeSecoes.js';
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
//
// Fase 3.9b (DEC-146): sem o teto de 100. A lista vem do servidor de 20 em 20
// e acumula por "Carregar mais" (`bibliotecaDeSecoes.js`); a busca e o tipo
// voltam à página 1. `semToastGlobal`: a falha aparece aqui, em linha. Sem
// sinal a busca não pergunta e diz que precisa de conexão — o que já estava
// na coluna continua lá. Armar e inserir NÃO mudaram.
// ═══════════════════════════════════════════════════════════════════════════

const TAMANHO_TRECHO = 90;

const trechoInicial = (texto) => {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= TAMANHO_TRECHO) return limpo;
  return `${limpo.slice(0, TAMANHO_TRECHO).trimEnd()}…`;
};

function SecaoLibraryPanel({ idsUsados, secaoArmada, onArmar, onAdicionarAoFim, desabilitado }) {
  const online = useOnlineStatus();
  const [secoes, setSecoes] = useState([]);
  const [total, setTotal] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [loading, setLoading] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [error, setError] = useState('');

  const [tipo, setTipo] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');

  // O pedido mais recente vence: um "Carregar mais" que chega depois de a
  // busca mudar não pode acrescentar seções da busca anterior.
  const pedidoAtual = useRef(0);

  // Debounce: sem ele cada tecla vira uma requisição.
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  // Página 1: busca ou tipo novos (e a primeira carga). Sem sinal não pergunta.
  useEffect(() => {
    if (!online) {
      setLoading(false);
      return undefined;
    }
    const pedido = ++pedidoAtual.current;
    setLoading(true);
    setError('');
    secaoService
      .buscarSecoesDaBiblioteca({
        page: 1,
        limit: POR_PAGINA_DA_BIBLIOTECA,
        tipo: tipo || undefined,
        busca: buscaDebounced.trim() || undefined,
      })
      .then((res) => {
        if (pedido !== pedidoAtual.current) return;
        setSecoes(acumularSecoes([], res.data.data ?? res.data, 1));
        setTotal(typeof res.data.total === 'number' ? res.data.total : null);
        setPagina(1);
      })
      .catch((err) => {
        if (pedido === pedidoAtual.current) {
          setError(getApiErrorMessage(err, 'Falha ao carregar a biblioteca de seções.'));
        }
      })
      .finally(() => {
        if (pedido === pedidoAtual.current) setLoading(false);
      });
    return undefined;
  }, [tipo, buscaDebounced, online]);

  const carregarMais = () => {
    if (!online || carregandoMais) return;
    const pedido = ++pedidoAtual.current;
    const proxima = pagina + 1;
    setCarregandoMais(true);
    setError('');
    secaoService
      .buscarSecoesDaBiblioteca({
        page: proxima,
        limit: POR_PAGINA_DA_BIBLIOTECA,
        tipo: tipo || undefined,
        busca: buscaDebounced.trim() || undefined,
      })
      .then((res) => {
        if (pedido !== pedidoAtual.current) return;
        setSecoes((anteriores) => acumularSecoes(anteriores, res.data.data ?? res.data, proxima));
        setTotal(typeof res.data.total === 'number' ? res.data.total : null);
        setPagina(proxima);
      })
      .catch((err) => {
        if (pedido === pedidoAtual.current) {
          setError(getApiErrorMessage(err, 'Falha ao carregar mais seções.'));
        }
      })
      .finally(() => setCarregandoMais(false));
  };

  const restantes = secoesRestantes(total, secoes.length);

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
          <Icone nome="lupa" tamanho={16} className="biblioteca__lupa" />
          <input
            type="search"
            placeholder="Buscar por título..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            maxLength={80}
            aria-label="Buscar seção por título"
            aria-describedby="biblioteca-busca-aviso"
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

      {/* O campo e o filtro NUNCA desmontam durante a carga (F-1a.1): o aviso
          e o indicador ficam abaixo deles. */}
      <p id="biblioteca-busca-aviso" className="biblioteca__aviso" aria-live="polite">
        {!online ? FRASE_SEM_CONEXAO_DA_BIBLIOTECA : ''}
      </p>

      {error && <p className="error-message">{error}</p>}

      {loading ? (
        <Loading />
      ) : secoes.length === 0 && !online ? null : secoes.length === 0 ? (
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

      {!loading && restantes > 0 && (
        <button
          type="button"
          className="ui-btn ui-btn--secondary ui-btn--sm biblioteca__mais"
          onClick={carregarMais}
          disabled={carregandoMais}
          aria-disabled={online ? undefined : 'true'}
        >
          {carregandoMais ? 'Carregando…' : rotuloDoCarregarMais(restantes)}
        </button>
      )}
    </aside>
  );
}

export default SecaoLibraryPanel;
