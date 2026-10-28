import React from 'react';
import './PularParaConteudo.css';

// ═══════════════════════════════════════════════════════════════════════════
// "PULAR PARA O CONTEÚDO" (Fase 4a, DEC-156)
//
// Achado da varredura da 3.10: o primeiro Tab ia sempre ao logo, e quem usa
// teclado atravessava o cabeçalho inteiro em toda tela. Este link é o
// PRIMEIRO elemento focável do layout da advogada e do portal; fica fora da
// tela até receber foco e leva ao `<main id="conteudo" tabIndex={-1}>`.
//
// O foco é movido à mão, e não pelo `href` sozinho: a âncora mudaria o hash da
// URL (o histórico ganharia uma entrada a cada uso) e nem todo navegador move
// o foco para um alvo de âncora. O `href` fica para quem abre em nova aba ou
// lê o destino no leitor de tela.
//
// Fica em `ui/`, e não em `layout/`, porque o portal também o monta, e o
// portal não importa nada de `layout/` (`tests/portal/isolamento.test.js`).
// As cores são as da MARCA fixa, iguais nos dois modos: o link aparece sobre
// o cabeçalho da advogada e sobre a barra do portal, que são a marca.
//
// Nas telas de autenticação ele não entra: lá o primeiro Tab já é o "Voltar",
// colado no conteúdo.
// ═══════════════════════════════════════════════════════════════════════════

export const ID_DO_CONTEUDO = 'conteudo';

function PularParaConteudo() {
  const pular = (e) => {
    const alvo = document.getElementById(ID_DO_CONTEUDO);
    if (!alvo) return;
    e.preventDefault();
    alvo.focus();
  };

  return (
    <a href={`#${ID_DO_CONTEUDO}`} className="pular-conteudo" onClick={pular}>
      Pular para o conteúdo
    </a>
  );
}

export default PularParaConteudo;
