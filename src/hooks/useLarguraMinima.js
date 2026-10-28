import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// A LARGURA DA TELA, PARA O QUE O CSS NÃO RESOLVE SOZINHO (Fase 3.9b, DEC-145)
//
// A biblioteca da montagem é uma coluna ao lado da folha a partir de 1024 px e
// um PAINEL que abre (um diálogo) abaixo disso. Esconder e mostrar caberia em
// CSS; o que não cabe é o papel do elemento — `role="dialog"`, o foco que entra
// e volta, o Escape —, que só vale no painel. Com o `matchMedia` a tela sabe
// qual dos dois desenhar, e a largura continua a mesma do CSS (1024, a borda da
// barra de baixo, DEC-079).
//
// Sem `matchMedia` (a suíte, um navegador muito antigo), vale a coluna: é o
// desenho que funciona sem diálogo nenhum.
// ═══════════════════════════════════════════════════════════════════════════
export const consultaDaLarguraMinima = (px) => `(min-width: ${px}px)`;

const casa = (consulta) =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    ? true
    : window.matchMedia(consulta).matches;

export default function useLarguraMinima(px) {
  const consulta = consultaDaLarguraMinima(px);
  const [larga, setLarga] = useState(() => casa(consulta));

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const lista = window.matchMedia(consulta);
    const aoMudar = () => setLarga(lista.matches);
    aoMudar();
    lista.addEventListener('change', aoMudar);
    return () => lista.removeEventListener('change', aoMudar);
  }, [consulta]);

  return larga;
}
