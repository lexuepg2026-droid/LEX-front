import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { labelDe, TIPO_SECAO_OPTIONS } from '../../utils/enums';
import './SecaoPreviewModal.css';

// Pré-visualização da seção: mostra o template CRU, com os {{}} visíveis e
// nada resolvido. Serve para responder "é essa a seção que eu procuro?" —
// resolver as variáveis aqui exigiria escolher processo e cliente, que é outra
// tela (a montagem, Fase 2D.2).

const REGEX_VARIAVEL = /\{\{\s*[\w.]+\s*\}\}/g;

// Quebra o texto em segmentos alternando texto comum e marcador de variável,
// para destacar as chaves sem usar dangerouslySetInnerHTML.
//
// Cada segmento carrega o deslocamento em que começa, e é ele que vira `key`:
// o índice do array serviria, mas o deslocamento é igualmente estável e não
// depende da posição na lista.
const segmentar = (texto) => {
  const fonte = String(texto ?? '');
  const segmentos = [];
  let cursor = 0;

  // `matchAll` cria a sua própria iteração e não depende de `lastIndex`, que é
  // o que torna `.test()` numa regex /g traiçoeiro.
  for (const ocorrencia of fonte.matchAll(REGEX_VARIAVEL)) {
    const inicio = ocorrencia.index;
    if (inicio > cursor) {
      segmentos.push({ inicio: cursor, valor: fonte.slice(cursor, inicio), ehVariavel: false });
    }
    segmentos.push({ inicio, valor: ocorrencia[0], ehVariavel: true });
    cursor = inicio + ocorrencia[0].length;
  }

  if (cursor < fonte.length) {
    segmentos.push({ inicio: cursor, valor: fonte.slice(cursor), ehVariavel: false });
  }

  return segmentos;
};

const destacarVariaveis = (texto) =>
  segmentar(texto).map((seg) =>
    seg.ehVariavel ? (
      <mark key={seg.inicio} className="secao-preview__var">
        {seg.valor}
      </mark>
    ) : (
      <React.Fragment key={seg.inicio}>{seg.valor}</React.Fragment>
    )
  );

function SecaoPreviewModal({ secao, onClose }) {
  const modalRef = useRef(null);
  const fecharRef = useRef(null);

  // Esc fecha, e o foco fica preso dentro do modal enquanto ele estiver
  // aberto: sem a prisão, o Tab passeia pela página atrás do overlay e o
  // usuário de teclado se perde numa tela que ele não está vendo.
  useEffect(() => {
    if (!secao) return undefined;

    const elementoAnterior = document.activeElement;
    fecharRef.current?.focus();

    const SELETOR_FOCAVEL =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const focaveis = modalRef.current?.querySelectorAll(SELETOR_FOCAVEL);
      if (!focaveis || focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      // Devolve o foco a quem abriu o modal.
      if (elementoAnterior instanceof HTMLElement) elementoAnterior.focus();
    };
  }, [secao, onClose]);

  if (!secao) return null;

  return (
    <div className="secao-preview-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="secao-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="secao-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="secao-preview__header">
          <div>
            <h2 id="secao-preview-title" className="secao-preview__title">
              {secao.titulo}
            </h2>
            <span className="secao-preview__tipo">
              {labelDe(TIPO_SECAO_OPTIONS, secao.tipo)}
            </span>
          </div>
          <button
            ref={fecharRef}
            type="button"
            className="secao-preview__close"
            onClick={onClose}
            aria-label="Fechar pré-visualização"
          >
            <X size={18} />
          </button>
        </header>

        <p className="secao-preview__aviso">
          Texto do modelo, como está cadastrado. As variáveis só são preenchidas
          quando o documento for gerado para um processo.
        </p>

        <pre className="secao-preview__texto">{destacarVariaveis(secao.texto)}</pre>

        <footer className="secao-preview__footer">
          <span className="secao-preview__contagem">
            {secao.variaveis?.length
              ? `${secao.variaveis.length} variável(is) neste texto`
              : 'Nenhuma variável neste texto'}
          </span>
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--md"
            onClick={onClose}
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}

export default SecaoPreviewModal;
