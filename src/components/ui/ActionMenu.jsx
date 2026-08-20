import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { posicaoDoPainel } from './actionMenuPosition.js';
import './ActionMenu.css';

// ═══════════════════════════════════════════════════════════════════════════
// MENU DE AÇÕES (três pontos) — Fase F-1b.3, reposicionado na F-1b.3.1
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
// ── DEC-046: o painel mora no `body`, e não ao lado do gatilho ───────────
// A F-1b.3 abria o painel com `position: absolute` dentro do próprio `<td>`.
// Ele abria, mas saía cortado nas TRÊS listagens — e "nas três" é a
// assinatura de uma causa estrutural, não de três defeitos.
//
// A causa: TODO ancestral com `overflow` diferente de `visible` recorta
// descendente posicionado. Havia três, aninhados:
//
//   1. `.data-table--fixed td`  → `overflow: hidden`   (o mais interno: o
//      painel era recortado na própria célula de 96 px);
//   2. `.table-wrapper`         → `overflow-x: auto`   (e um eixo `auto` faz
//      o outro computar `auto` também — a rolagem horizontal que fez a tabela
//      caber é a mesma que corta o menu para baixo);
//   3. `.main-content`          → `overflow-y: auto`.
//
// Nenhuma delas se resolve com `z-index`: recorte não é ordem de pintura.
//
// A correção: o painel é renderizado por `createPortal` direto no
// `document.body` — fora dos três contêineres — com `position: fixed` e
// coordenadas tiradas do gatilho por `getBoundingClientRect()`. `fixed` só é
// confiável porque nenhum ancestral do menu tem `transform`, `filter`,
// `contain` ou `perspective`: qualquer um deles criaria bloco de contenção e
// re-ancoraria o `fixed` ao elemento em vez do viewport. Isso foi conferido na
// Parte 1 da fase, e a varredura estática mantém a conferência viva.
//
// **Consequência de projeto:** qualquer flutuante futuro dentro de tabela
// rolável — tooltip, popover, seletor de data — tem exatamente este problema e
// exatamente esta solução.
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
// de itens. O que ele deliberadamente NÃO tem é submenu, ícone e atalho de
// teclado por letra — nada disso tem chamador, e generalizar antes do segundo
// caso é inventar requisito.
// ═══════════════════════════════════════════════════════════════════════════

// Cada item é `{ rotulo, to }` (navegação) ou `{ rotulo, onSelecionar }`
// (ação), com `destrutivo` e `desabilitado` opcionais. `to` e `onSelecionar`
// são exclusivos: um item que navegasse E executasse faria a linha mudar
// debaixo de uma tela que já está saindo.
function ActionMenu({ itens = [], rotulo = 'Ações desta linha' }) {
  const [aberto, setAberto] = useState(false);
  // `null` enquanto a conta não foi feita. O painel é montado invisível para
  // poder ser MEDIDO — sem medida não há alinhamento pela direita — e só
  // aparece depois de posicionado. Sem essa guarda ele pisca no canto
  // superior esquerdo em toda abertura.
  const [posicao, setPosicao] = useState(null);

  const gatilhoRef = useRef(null);
  const painelRef = useRef(null);
  // O foco só volta quando o menu foi mesmo aberto por alguém. Sem esta
  // guarda, o `useEffect` de fechamento roubaria o foco na montagem — em uma
  // tabela de trinta linhas, trinta vezes.
  const abriuAlgumaVez = useRef(false);
  const idMenu = useId();

  const fechar = useCallback(() => setAberto(false), []);

  // A medida e a conta, em `useLayoutEffect`: roda depois do painel montar e
  // ANTES da pintura. Em `useEffect` o painel apareceria por um quadro na
  // posição errada, que é o mesmo defeito visual de antes, só que rápido.
  useLayoutEffect(() => {
    if (!aberto) {
      setPosicao(null);
      return;
    }
    const gatilho = gatilhoRef.current;
    const painel = painelRef.current;
    if (!gatilho || !painel) return;

    setPosicao(
      posicaoDoPainel(gatilho.getBoundingClientRect(), painel.getBoundingClientRect(), {
        width: window.innerWidth,
        height: window.innerHeight
      })
    );
  }, [aberto]);

  useEffect(() => {
    if (!aberto) {
      if (abriuAlgumaVez.current) gatilhoRef.current?.focus();
      return undefined;
    }

    abriuAlgumaVez.current = true;

    // Esc fecha — mesma tecla e mesmo caminho do `Modal` do projeto. O foco
    // volta ao gatilho pelo ramo `!aberto` acima.
    const aoTeclar = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        fechar();
      }
    };

    // Clique fora fecha. `mousedown`, e não `click`: um item que navega
    // desmonta a linha antes do `click` chegar ao documento, e o menu ficaria
    // aberto sobre a tela seguinte.
    //
    // O teste precisa citar os DOIS elementos: com o painel no `body`, ele não
    // é mais descendente do gatilho, e verificar só a raiz fecharia o menu ao
    // primeiro clique DENTRO dele.
    const aoClicarFora = (e) => {
      const dentroDoGatilho = gatilhoRef.current?.contains(e.target);
      const dentroDoPainel = painelRef.current?.contains(e.target);
      if (!dentroDoGatilho && !dentroDoPainel) fechar();
    };

    // ── Rolar fecha o menu (DEC-046) ───────────────────────────────────────
    // Um painel `fixed` é ancorado ao viewport: o botão a que ele pertence
    // rola, o painel não. Reposicionar a cada quadro seria possível e seria
    // pior — o menu passaria por cima do cabeçalho e sairia da tabela. Um menu
    // apontando para a linha errada é pior que menu nenhum, então ele fecha.
    //
    // `capture: true` é obrigatório: `scroll` NÃO borbulha. Sem a captura, a
    // rolagem horizontal da `.table-wrapper` e a vertical da `.main-content`
    // nunca chegariam a um listener do `window` — e são exatamente essas duas
    // as rolagens desta tela.
    document.addEventListener('keydown', aoTeclar);
    document.addEventListener('mousedown', aoClicarFora);
    window.addEventListener('scroll', fechar, true);
    window.addEventListener('resize', fechar);

    // Os listeners existem só ENQUANTO o menu está aberto — e só um menu fica
    // aberto por vez. Uma página de 20 linhas tem 20 componentes e, no
    // máximo, um conjunto de listeners; o `cleanup` devolve os quatro.
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.removeEventListener('mousedown', aoClicarFora);
      window.removeEventListener('scroll', fechar, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto, fechar]);

  if (itens.length === 0) return null;

  const selecionar = (item) => {
    fechar();
    if (item.onSelecionar) item.onSelecionar();
  };

  const painel = (
    <div
      ref={painelRef}
      className="action-menu__lista"
      id={idMenu}
      role="menu"
      style={{
        top: posicao ? `${posicao.top}px` : 0,
        left: posicao ? `${posicao.left}px` : 0,
        visibility: posicao ? 'visible' : 'hidden'
      }}
    >
      {itens.map((item) => {
        const classe =
          'action-menu__item' + (item.destrutivo ? ' action-menu__item--destrutivo' : '');

        if (item.to) {
          return (
            <Link
              key={item.rotulo}
              to={item.to}
              role="menuitem"
              className={classe}
              onClick={fechar}
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
  );

  return (
    <div className="action-menu">
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

      {/* O portal. `document.body` é o único ancestral garantidamente livre dos
          três `overflow` — ver o cabeçalho deste arquivo. */}
      {aberto && createPortal(painel, document.body)}
    </div>
  );
}

export default ActionMenu;
