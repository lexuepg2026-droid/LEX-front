import React, { useEffect, useRef } from 'react';
import Icone from '../ui/Icone.jsx';
import './BibliotecaEmPainel.css';

// ═══════════════════════════════════════════════════════════════════════════
// A BIBLIOTECA COMO PAINEL, ABAIXO DE 1024 px (Fase 3.9b, DEC-145)
//
// No padrão do "Mais" da barra de baixo (DEC-079): um diálogo que sobe de
// baixo, com o fundo escurecido.
//   - abre com o foco no primeiro item (a busca);
//   - o Tab circula dentro dele — a folha está atrás do fundo;
//   - fecha com Escape, com toque no fundo e pelo botão Fechar;
//   - quem devolve o foco ao botão "Biblioteca de seções" é a tela, no
//     `onFechar`, porque é ela que tem o botão.
//
// O painel fica MONTADO com `hidden` quando fechado: a busca e o filtro que a
// advogada digitou continuam lá na próxima abertura, e a lista não é pedida de
// novo a cada toque no botão.
//
// ⚠️ Sem `transform` (nem na animação): as miniaturas são arrastáveis, e o
// arrastar e o ⋮ do cabeçalho não convivem com ancestral transformado
// (DEC-046). A entrada é só por opacidade.
// ═══════════════════════════════════════════════════════════════════════════

const SELETOR_FOCAVEL = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled])';

function BibliotecaEmPainel({ id, aberto, onFechar, children }) {
  const painel = useRef(null);

  useEffect(() => {
    if (!aberto) return;
    painel.current?.querySelector(SELETOR_FOCAVEL)?.focus();
  }, [aberto]);

  const aoTeclar = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onFechar();
      return;
    }
    if (e.key !== 'Tab') return;
    const focaveis = [...painel.current.querySelectorAll(SELETOR_FOCAVEL)].filter(
      (el) => el.offsetParent !== null
    );
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    // `preventDefault` antes de mover — a mesma linha da F-1b.3.2.
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };

  return (
    <div
      className="biblioteca-painel__fundo"
      hidden={!aberto}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        id={id}
        ref={painel}
        className="biblioteca-painel"
        role="dialog"
        aria-modal="true"
        aria-label="Biblioteca de seções"
        onKeyDown={aoTeclar}
      >
        {children}
        <button type="button" className="biblioteca-painel__fechar" onClick={onFechar}>
          <Icone nome="fechar" tamanho={18} />
          Fechar
        </button>
      </div>
    </div>
  );
}

export default BibliotecaEmPainel;
