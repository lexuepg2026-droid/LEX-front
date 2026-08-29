import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { listarFila, enviarFila, tentarDeNovo, descartar } from '../offline/outbox';
import { enviarEntrada } from '../api/outboxSender';
import { contarFalhas, filaTravada } from '../offline/outboxPlan';

// ═══════════════════════════════════════════════════════════════════════════
// A FILA NA TELA — um estado só, para o app inteiro (F-5b, Parte 4)
//
// Contexto, e não um hook por tela, por uma razão de comportamento: o reenvio
// dispara **quando o sinal volta**, e com um hook por tela cada tela montada
// dispararia o seu. Duas rodadas simultâneas mandariam a mesma entrada duas
// vezes — a idempotência do servidor seguraria a duplicação, mas o certo é não
// depender dela para um defeito que é nosso.
//
// Quem consome: o contador ao lado do sino, a tela de pendências, o aviso do
// logout e as telas que precisam dizer "há alteração não enviada aqui".
// ═══════════════════════════════════════════════════════════════════════════

const OutboxContext = createContext(null);

export function OutboxProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const online = useOnlineStatus();

  const [entradas, setEntradas] = useState([]);
  const [enviando, setEnviando] = useState(false);
  // `useRef` e não estado: o guarda de reentrância não pode causar render, e
  // precisa valer no MESMO tick em que a segunda chamada chega.
  const emCurso = useRef(false);

  const recarregar = useCallback(async () => {
    if (!userId) {
      setEntradas([]);
      return [];
    }
    const fila = await listarFila(userId);
    setEntradas(fila);
    return fila;
  }, [userId]);

  const enviar = useCallback(async () => {
    if (!userId || emCurso.current) return null;
    emCurso.current = true;
    setEnviando(true);
    try {
      const resultado = await enviarFila({ userId, enviar: enviarEntrada });
      await recarregar();
      return resultado;
    } finally {
      emCurso.current = false;
      setEnviando(false);
    }
  }, [userId, recarregar]);

  useEffect(() => { recarregar(); }, [recarregar]);

  // ── O gatilho automático: quando o sinal VOLTA ────────────────────────
  //
  // Sem gesto nenhum da advogada. Ela guardou o compromisso no fórum, saiu do
  // subsolo, e a fila sobe sozinha — que é a única forma de a fila não virar
  // mais uma coisa para lembrar de fazer.
  useEffect(() => {
    if (online && userId) enviar();
  }, [online, userId, enviar]);

  const acaoTentarDeNovo = useCallback(async (id) => {
    await tentarDeNovo(userId, id);
    await recarregar();
    return enviar();
  }, [userId, recarregar, enviar]);

  // O descarte é o ÚNICO caminho pelo qual trabalho da advogada some. Ele só
  // existe aqui porque a tela pergunta antes, nomeando o que se perde.
  const acaoDescartar = useCallback(async (id) => {
    await descartar(userId, id);
    return recarregar();
  }, [userId, recarregar]);

  const valor = {
    entradas,
    quantidade: entradas.length,
    falhas: contarFalhas(entradas),
    travada: filaTravada(entradas),
    enviando,
    online,
    recarregar,
    enviar,
    tentarDeNovo: acaoTentarDeNovo,
    descartar: acaoDescartar
  };

  return <OutboxContext.Provider value={valor}>{children}</OutboxContext.Provider>;
}

// O hook mora junto do provider por ser a interface de consumo dele — mesma
// razão registrada em `AuthContext.jsx`.
// eslint-disable-next-line react-refresh/only-export-components
export function useOutbox() {
  return useContext(OutboxContext) ?? {
    entradas: [], quantidade: 0, falhas: 0, travada: false, enviando: false,
    online: true, recarregar: async () => {}, enviar: async () => null,
    tentarDeNovo: async () => {}, descartar: async () => {}
  };
}
