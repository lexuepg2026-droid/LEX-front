import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════════════
// O ÚLTIMO SEGMENTO DA TRILHA, QUANDO SÓ A PÁGINA O CONHECE — Fase F-1b
//
// ── O problema ────────────────────────────────────────────────────────────
// A trilha do `Header` é derivada do PATHNAME, e só dele. Para
// `/dashboard/honorarios/:id` isso produz "LEX › Honorários › Detalhe", porque
// o cabeçalho não tem como saber que aquele id se chama "Assessoria
// tributária" — quem lê o honorário é a página, depois do GET.
//
// A F-1b pede a trilha com a DESCRIÇÃO ("LEX › Honorários › «descrição»"),
// e é o pedido certo: numa tela alcançada por link de seis lugares
// diferentes, "Detalhe" não diz de qual cobrança se está falando.
//
// ── Por que contexto, e não outra coisa ───────────────────────────────────
// A página e o `Header` são irmãos na árvore (`AppLayout` monta os dois), e
// não há caminho de props entre eles. As alternativas seriam levantar o estado
// do honorário para o layout — fazendo o cabeçalho conhecer regra de negócio —
// ou a página desenhar a própria trilha, e aí haveria DUAS trilhas na tela.
//
// Nenhuma dependência nova: é `createContext`, que já sustenta `AuthContext` e
// `PortalAuthContext`.
//
// ── O rótulo é CASADO COM O CAMINHO, de propósito ─────────────────────────
// Guardar só o texto deixaria o rótulo da tela anterior no ar durante o
// intervalo entre navegar e o GET seguinte responder — a advogada leria o nome
// do honorário antigo no cabeçalho da página nova. Guardando o pathname junto,
// um rótulo de outro caminho simplesmente não é usado.
// ═══════════════════════════════════════════════════════════════════════════

const BreadcrumbContext = createContext(null);

export function BreadcrumbProvider({ children }) {
  const [rotulo, setRotulo] = useState(null); // { pathname, texto }

  const definir = useCallback((pathname, texto) => {
    setRotulo(texto ? { pathname, texto } : null);
  }, []);

  const valor = useMemo(() => ({ rotulo, definir }), [rotulo, definir]);

  return (
    <BreadcrumbContext.Provider value={valor}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

// Lido pelo `Header`. Devolve o texto SÓ se ele foi publicado para o caminho
// atual — ver a nota sobre o casamento com o pathname, acima.
//
// Os dois hooks moram junto do provider por serem a interface de consumo dele,
// pela mesma razão registrada em `AuthContext.jsx`: separá-los só para
// satisfazer a regra criaria um arquivo sem outra razão de existir. O custo é
// perder o fast refresh neste arquivo, que quase não muda.
// eslint-disable-next-line react-refresh/only-export-components
export const useBreadcrumbLabel = (pathname) => {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx?.rotulo) return null;
  return ctx.rotulo.pathname === pathname ? ctx.rotulo.texto : null;
};

// Chamado pela página que conhece o próprio nome. Publica enquanto está
// montada e LIMPA ao sair: sem a limpeza, voltar para uma listagem deixaria o
// nome do último honorário pendurado na trilha da lista.
// eslint-disable-next-line react-refresh/only-export-components
export const usePublicarBreadcrumb = (texto) => {
  const ctx = useContext(BreadcrumbContext);
  const { pathname } = useLocation();
  const definir = ctx?.definir;

  useEffect(() => {
    if (!definir) return undefined;
    definir(pathname, texto);
    return () => definir(pathname, null);
  }, [definir, pathname, texto]);
};

export default BreadcrumbContext;
