import React from 'react';

// A logo vetorial dela (`assets/LEX_horizontal.svg`), desenhada em linha
// (Fase 1, DEC-074).
//
// ── Por que componente, e não `<img src>` ──────────────────────────────────
// O SVG original pinta tudo em bege #EDE3CF, fixo: some no fundo bege do modo
// claro. Com `fill`/`stroke` em `currentColor` a logo herda a cor do texto de
// quem a monta — bege no escuro, verde-escuro no claro — sem duas versões do
// arquivo e sem o `filter` que a JPEG antiga precisava. `currentColor` só vale
// em SVG que está NO documento: carregado por `<img>`, o SVG não enxerga a cor
// da página e sairia preto.
//
// Os traços são os de `assets/LEX_horizontal.svg`, que é a fonte; há teste
// (`tests/css/logo.test.js`) conferindo que os dois não divergiram.
function LogoLex({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 624 181"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo LEX"
    >
      <line x1="407" y1="168.072" x2="216" y2="168.072" stroke="currentColor" strokeWidth="25" />
      <line x1="407" y1="93.0723" x2="216" y2="93.0723" stroke="currentColor" strokeWidth="25" />
      <line x1="407" y1="18.0723" x2="216" y2="18.0723" stroke="currentColor" strokeWidth="25" />
      <line y1="-12.5" x2="237.693" y2="-12.5" transform="matrix(0.727829 -0.685758 0.727829 0.685758 449.957 180.144)" stroke="currentColor" strokeWidth="25" />
      <path d="M441.055 8.57227L431.949 17.1363L491.351 73.2086L500.457 64.6445L509.564 56.0805L450.161 0.00823443L441.055 8.57227Z" fill="currentColor" />
      <path d="M536.457 98.6445L527.371 107.227L604.969 180.155L614.055 171.572L623.141 162.989L545.543 90.0617L536.457 98.6445Z" fill="currentColor" />
      <line x1="12.5" y1="5.57227" x2="12.5" y2="180.572" stroke="currentColor" strokeWidth="25" />
      <line x1="191" y1="168.072" y2="168.072" stroke="currentColor" strokeWidth="25" />
    </svg>
  );
}

export default LogoLex;
