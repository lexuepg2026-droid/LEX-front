import React from 'react';
import { ICONES } from './iconesDados.js';

// Os ícones dela, desenhados em linha com `currentColor` (Fase 2a, DEC-077).
//
// Mesmo princípio do `LogoLex`: o arquivo em `assets/icons/` é a fonte, e o
// traço herda a cor de quem monta o ícone — bege no cabeçalho, a cor do texto
// no resto da tela. Por `<img>` o SVG não enxerga a cor da página, e o bege
// fixo do original sumiria no modo claro.
//
// Sem `rotulo` o ícone é decorativo: `aria-hidden`, porque o texto ao lado já
// diz o que ele diz. Com `rotulo` ele É a informação (um botão só de ícone), e
// é anunciado como imagem com nome.
function Icone({ nome, tamanho = 20, rotulo, className }) {
  const icone = ICONES[nome];
  if (!icone) return null;

  const acessivel = rotulo
    ? { role: 'img', 'aria-label': rotulo }
    : { 'aria-hidden': 'true', focusable: 'false' };

  return (
    <svg
      className={className}
      width={tamanho}
      height={tamanho}
      viewBox={icone.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...acessivel}
    >
      {icone.caminhos.map((d) => (
        <path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={icone.traco}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default Icone;
