import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { idsPublicadosPara } from '../components/layout/contexto.js';

// ═══════════════════════════════════════════════════════════════════════════
// QUAL CLIENTE E QUAL PROCESSO ESTA TELA É — Fase 2b (DEC-085)
//
// Irmão do `BreadcrumbContext` que ele substitui, e pelo mesmo motivo: a
// página e a faixa do cabeçalho são irmãs na árvore (`AppLayout` monta as
// duas), e só a página sabe de qual processo está falando — às vezes só depois
// de o GET do honorário voltar, ou de a advogada escolher no `<select>`.
//
// A página publica um ID — `{ processoId }` ou `{ clienteId }` —, e mais nada.
// Quem transforma o id em "Cliente: Fulano · Processo: 123 — Título" é a
// faixa, pelo espelho (`hooks/useContextoResolvido.js`), com as MESMAS chaves
// das telas de detalhe: quem abriu o processo com sinal vê a faixa sem sinal.
//
// ── O valor é CASADO COM O CAMINHO, como no BreadcrumbContext ─────────────
// Guardado sem o pathname, o processo da tela anterior ficaria no ar entre a
// navegação e a página nova publicar o dela — e a advogada leria, no
// formulário da parcela nova, o processo de onde ela veio. Com o caminho
// junto, o que foi publicado para outra tela simplesmente não é usado.
// ═══════════════════════════════════════════════════════════════════════════

const ContextoContext = createContext(null);

export function ContextoProvider({ children }) {
  const [publicado, setPublicado] = useState(null); // { pathname, processoId, clienteId }

  const definir = useCallback((pathname, ids) => {
    setPublicado(ids ? { pathname, ...ids } : null);
  }, []);

  const valor = useMemo(() => ({ publicado, definir }), [publicado, definir]);

  return (
    <ContextoContext.Provider value={valor}>
      {children}
    </ContextoContext.Provider>
  );
}

// Lido pela faixa. Devolve os ids SÓ se foram publicados para o caminho atual.
//
// Os dois hooks moram junto do provider por serem a interface de consumo dele,
// pela razão registrada em `AuthContext.jsx`.
// eslint-disable-next-line react-refresh/only-export-components
export const useContextoPublicado = (pathname) => {
  const ctx = useContext(ContextoContext);
  return idsPublicadosPara(ctx?.publicado, pathname);
};

// Chamado pela página. `{ processoId }` tem precedência: o processo já traz o
// cliente principal. Publica enquanto está montada e LIMPA ao sair, senão a
// lista seguinte herdaria o processo do formulário que acabou de fechar.
// Id vazio (o `<select>` ainda sem escolha) publica nada — a faixa fica só com
// o "Voltar".
// eslint-disable-next-line react-refresh/only-export-components
export const usePublicarContexto = ({ processoId = null, clienteId = null } = {}) => {
  const ctx = useContext(ContextoContext);
  const { pathname } = useLocation();
  const definir = ctx?.definir;
  const proc = processoId ? String(processoId) : null;
  const cli = !proc && clienteId ? String(clienteId) : null;

  useEffect(() => {
    if (!definir) return undefined;
    definir(pathname, proc || cli ? { processoId: proc, clienteId: cli } : null);
    return () => definir(pathname, null);
  }, [definir, pathname, proc, cli]);
};

export default ContextoContext;
