import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { deveSeguirOCliqueDaLinha } from './linhaClicavel.js';

// O `onClick` da linha da lista (DEC-102). A regra está em `linhaClicavel.js`;
// aqui só a navegação. `destino` nulo deixa a linha sem clique (ex.: edição
// sem sinal, que o menu ⋮ também recusa).
export default function useLinhaClicavel() {
  const navigate = useNavigate();
  return useCallback((destino) => {
    if (!destino) return undefined;
    return (evento) => {
      const selecao = typeof window !== 'undefined' ? window.getSelection?.()?.toString() : '';
      if (deveSeguirOCliqueDaLinha(evento, selecao)) navigate(destino);
    };
  }, [navigate]);
}
