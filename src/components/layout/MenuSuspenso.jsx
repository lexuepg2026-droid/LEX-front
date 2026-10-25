import React, { useEffect, useId, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './MenuSuspenso.css';

// ═══════════════════════════════════════════════════════════════════════════
// O SUBMENU DO CABEÇALHO — Financeiro ▾, Documentos ▾ e o menu do usuário
// (Fase 2a, DEC-079)
//
// Padrão "disclosure" do WAI-ARIA, e não `role="menu"`: um `<button>` com
// `aria-expanded` que mostra e esconde uma lista de LINKS. É o que estes painéis
// são — navegação —, e `role="menu"` prometeria ao leitor de tela as setas e o
// comportamento de menu de aplicativo, que um painel de links não tem.
//
// O menu do usuário dela abria por clique numa `div`, sem teclado. Aqui:
//   - abre por clique, Enter ou Espaço (é um `<button>` de verdade);
//   - fecha com Escape, devolvendo o foco ao botão;
//   - fecha com clique fora (`mousedown`, como o ActionMenu: um item que
//     navega desmonta o painel antes de o `click` chegar ao documento);
//   - fecha quando o foco sai dele por Tab — um painel aberto atrás do foco
//     é um painel que ninguém vê fechar;
//   - fecha ao navegar, porque a rota mudou e o painel já cumpriu o papel.
//
// Não está em portal: o cabeçalho não tem `overflow` que recorte, e fora do
// portal a ordem de Tab é a natural (a emenda à DEC-046 explica o custo).
// ═══════════════════════════════════════════════════════════════════════════
function MenuSuspenso({ conteudoDoBotao, rotuloDoBotao, ativo = false, className = '', painelClassName = '', children }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef(null);
  const botao = useRef(null);
  const idPainel = useId();
  const { pathname, search } = useLocation();

  // Navegou: fecha. Comparar a rota, e não ouvir clique nos itens, cobre
  // também a navegação que não passou por um item (o botão voltar).
  useEffect(() => { setAberto(false); }, [pathname, search]);

  useEffect(() => {
    if (!aberto) return undefined;
    const foraDoMenu = (e) => {
      if (raiz.current && !raiz.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('mousedown', foraDoMenu);
    return () => document.removeEventListener('mousedown', foraDoMenu);
  }, [aberto]);

  const fechar = ({ devolverFoco = false } = {}) => {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  };

  const aoTeclar = (e) => {
    if (e.key === 'Escape' && aberto) {
      e.stopPropagation();
      fechar({ devolverFoco: true });
    }
  };

  const aoPerderFoco = (e) => {
    if (aberto && raiz.current && !raiz.current.contains(e.relatedTarget)) setAberto(false);
  };

  return (
    <div
      ref={raiz}
      className={`menu-suspenso ${className}${ativo ? ' menu-suspenso--ativo' : ''}`}
      onKeyDown={aoTeclar}
      onBlur={aoPerderFoco}
    >
      <button
        ref={botao}
        type="button"
        className="menu-suspenso__botao"
        aria-expanded={aberto}
        aria-controls={idPainel}
        aria-label={rotuloDoBotao}
        onClick={() => setAberto((v) => !v)}
      >
        {conteudoDoBotao}
      </button>
      <div id={idPainel} className={`menu-suspenso__painel ${painelClassName}`} hidden={!aberto}>
        {typeof children === 'function' ? children(fechar) : children}
      </div>
    </div>
  );
}

export default MenuSuspenso;
