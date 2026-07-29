import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Variable, X } from 'lucide-react';
import documentService from '../../api/documentService';
import { getApiErrorMessage } from '../../utils/apiError';
import './VariableSelector.css';

// Seletor de variáveis do template.
//
// REGRA: o que a advogada lê é o RÓTULO e a DESCRIÇÃO, escritos à mão no
// backend. A chave crua ({{cpfCliente}}) aparece só como detalhe secundário,
// em fonte monoespaçada — ela é o que vai para o texto, não o que orienta a
// escolha. Nunca derivar rótulo da chave aqui: o backend já manda pronto.

// Busca local por rótulo, ignorando caixa e acento — mesmo comportamento da
// busca de seções no backend, para a tela não parecer inconsistente.
const semAcento = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

function VariableSelector({ onInserir, disabled = false }) {
  const [catalogo, setCatalogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const buscaRef = useRef(null);

  useEffect(() => {
    let cancelado = false;
    documentService
      .listarVariaveis()
      .then((res) => {
        if (!cancelado) setCatalogo(res.data);
      })
      .catch((err) => {
        if (!cancelado) {
          setErro(getApiErrorMessage(err, 'Não foi possível carregar as variáveis.'));
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  // Filtra por rótulo, e também por descrição e chave: quem já conhece o nome
  // técnico deve conseguir chegar nele.
  const gruposFiltrados = useMemo(() => {
    if (!catalogo) return [];
    const termo = semAcento(busca.trim());
    if (!termo) return catalogo.grupos;

    return catalogo.grupos
      .map((grupo) => ({
        ...grupo,
        variaveis: grupo.variaveis.filter(
          (v) =>
            semAcento(v.rotulo).includes(termo) ||
            semAcento(v.descricao).includes(termo) ||
            semAcento(v.chave).includes(termo)
        ),
      }))
      .filter((grupo) => grupo.variaveis.length > 0);
  }, [catalogo, busca]);

  const totalFiltrado = gruposFiltrados.reduce((acc, g) => acc + g.variaveis.length, 0);

  return (
    <div className="var-selector">
      <div className="var-selector__header">
        <span className="var-selector__title">
          <Variable size={15} />
          Variáveis disponíveis
          {catalogo && <span className="var-selector__count">{catalogo.total}</span>}
        </span>
        <p className="var-selector__hint">
          Clique para inserir no ponto onde o cursor está.
        </p>
      </div>

      <div className="var-selector__search">
        <Search size={14} className="var-selector__search-icon" />
        <input
          ref={buscaRef}
          type="text"
          placeholder="Buscar variável..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          maxLength={60}
          aria-label="Buscar variável por nome"
        />
        {busca && (
          <button
            type="button"
            className="var-selector__clear"
            onClick={() => {
              setBusca('');
              buscaRef.current?.focus();
            }}
            aria-label="Limpar busca"
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="var-selector__body">
        {loading && <p className="var-selector__status">Carregando variáveis...</p>}

        {!loading && erro && <p className="var-selector__status var-selector__status--erro">{erro}</p>}

        {!loading && !erro && totalFiltrado === 0 && (
          <p className="var-selector__status">
            Nenhuma variável corresponde a “{busca}”.
          </p>
        )}

        {!loading &&
          !erro &&
          gruposFiltrados.map((grupo) => (
            <section key={grupo.origem} className="var-group">
              <h4 className="var-group__title">
                {grupo.rotulo}
                <span className="var-group__count">{grupo.variaveis.length}</span>
              </h4>
              <p className="var-group__description">{grupo.descricao}</p>

              <ul className="var-group__list">
                {grupo.variaveis.map((v) => (
                  <li key={v.chave}>
                    <button
                      type="button"
                      className="var-item"
                      disabled={disabled}
                      onClick={() => onInserir(v.chave)}
                      title={v.descricao}
                    >
                      <span className="var-item__rotulo">{v.rotulo}</span>
                      <span className="var-item__descricao">{v.descricao}</span>
                      <code className="var-item__chave">{`{{${v.chave}}}`}</code>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
      </div>
    </div>
  );
}

export default VariableSelector;
