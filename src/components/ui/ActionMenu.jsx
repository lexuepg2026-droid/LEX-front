import React, { useEffect, useRef, useState, useId } from 'react';
import { Link } from 'react-router-dom';
import './ActionMenu.css';

// ═══════════════════════════════════════════════════════════════════════════
// MENU DE AÇÕES (três pontos) — Fase F-1b.3
//
// ── O defeito que ele corrige ────────────────────────────────────────────
// A coluna "Ações" da listagem de pagamentos tem TRÊS botões — "Baixar
// recibo", "Estornar" e "Editar" — numa coluna dimensionada para dois
// (`col-acoes-2-lg`, 230 px). O terceiro, "Editar", ficava fora da tela.
//
// **Ação escondida atrás de rolagem que ninguém percebe é ação que não
// existe.** Alargar a coluna resolveria hoje e voltaria a quebrar na quarta
// ação; e a largura que cabe em 1024 px não cabe em 360 px, onde a tabela já
// rola horizontalmente.
//
// ── Por que um menu, e não uma coluna maior ──────────────────────────────
// O menu tem largura FIXA de um botão, independente de quantas ações existam.
// É a única forma que não volta a quebrar quando a F-1c acrescentar
// "Reparcelar" e a F-2, "Mudar status".
//
// ── O comportamento é o dos modais do projeto (passo 31) ─────────────────
// Abre por clique e por teclado (é um `<button>` de verdade — Enter e Espaço
// vêm de graça, e é por isso que não há `onKeyDown` inventado aqui), fecha com
// **Esc** e com clique fora, e DEVOLVE O FOCO ao botão que o abriu. Sem a
// devolução, quem navega por teclado é jogado para o início do documento a
// cada menu fechado.
//
// ── Escrito para a F-2 reusar, e não além disso ──────────────────────────
// A F-2 vai precisar do mesmo padrão no menu de processos (Editar / Mudar
// status). Por isso o componente não sabe o que é pagamento: recebe uma lista
// de itens. O que ele deliberadamente NÃO tem é submenu, ícone, atalho de
// teclado por letra e posicionamento automático — nada disso tem chamador, e
// generalizar antes do segundo caso é inventar requisito.
// ═══════════════════════════════════════════════════════════════════════════

// Cada item é `{ rotulo, to }` (navegação) ou `{ rotulo, onSelecionar }`
// (ação), com `destrutivo` e `desabilitado` opcionais. `to` e `onSelecionar`
// são exclusivos: um item que navegasse E executasse faria a linha mudar
// debaixo de uma tela que já está saindo.
function ActionMenu({ itens = [], rotulo = 'Ações desta linha' }) {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef(null);
  const gatilhoRef = useRef(null);
  // O foco só volta quando o menu foi mesmo aberto por alguém. Sem esta
  // guarda, o `useEffect` de fechamento roubaria o foco na montagem — em uma
  // tabela de trinta linhas, trinta vezes.
  const abriuAlgumaVez = useRef(false);
  const idMenu = useId();

  useEffect(() => {
    if (!aberto) {
      if (abriuAlgumaVez.current) gatilhoRef.current?.focus();
      return undefined;
    }

    abriuAlgumaVez.current = true;

    // Esc fecha — mesma tecla e mesmo caminho do `Modal` do projeto.
    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setAberto(false);
      }
    };

    // Clique fora fecha. `mousedown`, e não `click`: um item que navega
    // desmonta a linha antes do `click` chegar ao documento, e o menu ficaria
    // aberto sobre a tela seguinte.
    const aoClicarFora = (e) => {
      if (raizRef.current && !raizRef.current.contains(e.target)) setAberto(false);
    };

    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicarFora);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicarFora);
    };
  }, [aberto]);

  if (itens.length === 0) return null;

  const selecionar = (item) => {
    setAberto(false);
    if (item.onSelecionar) item.onSelecionar();
  };

  return (
    <div className="action-menu" ref={raizRef}>
      <button
        type="button"
        ref={gatilhoRef}
        className="action-menu__gatilho"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? idMenu : undefined}
        aria-label={rotulo}
        onClick={() => setAberto((v) => !v)}
      >
        {/* Três pontos como TEXTO, não ícone: o projeto não tem biblioteca de
            ícones e não vai ganhar uma por causa de um menu. */}
        <span aria-hidden="true">⋮</span>
      </button>

      {aberto && (
        <div className="action-menu__lista" id={idMenu} role="menu">
          {itens.map((item) => {
            const classe =
              'action-menu__item' +
              (item.destrutivo ? ' action-menu__item--destrutivo' : '');

            if (item.to) {
              return (
                <Link
                  key={item.rotulo}
                  to={item.to}
                  role="menuitem"
                  className={classe}
                  onClick={() => setAberto(false)}
                >
                  {item.rotulo}
                </Link>
              );
            }

            return (
              <button
                key={item.rotulo}
                type="button"
                role="menuitem"
                className={classe}
                disabled={item.desabilitado}
                onClick={() => selecionar(item)}
              >
                {item.rotulo}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ActionMenu;
