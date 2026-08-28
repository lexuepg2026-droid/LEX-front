import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../api/authService';
import { registrarSessao } from '../api/sessionLoss';
import { startSession, clearAll } from '../offline/offlineCache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // ── Quem sabe se há sessão é este contexto (DEC-050) ────────────────────
  // O interceptor de `api/axiosConfig.js` só desloga em 401 se havia sessão a
  // perder, e é daqui que ele recebe a resposta (via `api/sessionLoss.js`). Manter as duas coisas juntas
  // — o estado do usuário e o aviso ao interceptor — é o que impede elas de
  // divergirem: toda transição de sessão passa por uma destas funções.
  const registrarUsuario = useCallback((usuario) => {
    setUser(usuario);
    registrarSessao(Boolean(usuario));
  }, []);

  // /auth/me, /auth/login e /auth/register devolvem o mesmo envelope
  // `{ usuario }` desde a Fase 2D.1 — não há mais exceção por endpoint.
  // ── O ESPELHO LOCAL É ESCOPADO, E A LIMPEZA VEM ANTES (DEC-058, F-5a) ───
  //
  // `startSession` apaga do IndexedDB tudo que NÃO é deste usuário, e roda
  // **antes** de `registrarUsuario` — quem registra o usuário dispara a
  // navegação, a navegação renderiza a tela e a tela grava. Limpar depois seria
  // limpar por cima do que a sessão nova já escreveu.
  //
  // Ele é chamado nos DOIS caminhos de entrada porque só um deles é o login: o
  // recarregar de página entra por `checkAuth`, com o cookie que já existia, e
  // é exatamente o caminho de quem senta no computador do escritório e abre o
  // sistema sem passar pela tela de login.
  const checkAuth = useCallback(async () => {
    try {
      const res = await authService.getMe();
      await startSession(res.data.usuario?.id);
      registrarUsuario(res.data.usuario);
    } catch {
      // 401 aqui é o estado NORMAL de quem ainda não entrou, e é por isso que o
      // interceptor precisa saber que não havia sessão: sem isso, abrir o app
      // deslogada mandaria para `/login` com um "Sessão expirada" no caminho —
      // e em `/registrar` interromperia o cadastro.
      registrarUsuario(null);
    } finally {
      setIsLoading(false);
    }
  }, [registrarUsuario]);

  const login = useCallback(async (email, senha) => {
    const res = await authService.login(email, senha);
    await startSession(res.data.usuario?.id);
    registrarUsuario(res.data.usuario);
  }, [registrarUsuario]);

  // O cadastro já volta autenticado: o backend emite o cookie `lex-token` na
  // mesma resposta. Registrar o usuário no estado aqui é o que leva a advogada
  // direto ao sistema, em vez de devolvê-la à tela de login.
  const register = useCallback(async (payload) => {
    const res = await authService.register(payload);
    await startSession(res.data.usuario?.id);
    registrarUsuario(res.data.usuario);
    return res.data.usuario;
  }, [registrarUsuario]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Falha na chamada de logout não impede a limpeza local da sessão.
    } finally {
      // ⚠️ O LOGOUT APAGA TUDO (DEC-058). Não marca como inválido, não expira,
      // não filtra na leitura: apaga. Sair da conta num computador emprestado
      // — o do escritório, o da estagiária — precisa deixar o navegador limpo,
      // e um dado "invalidado" que continua no disco continua sendo o dado.
      //
      // Fica no `finally` junto com o resto da limpeza local pela mesma razão
      // que `registrarUsuario(null)` está aqui: falha na chamada de logout não
      // pode deixar o espelho local para trás.
      await clearAll();
      registrarUsuario(null);
      navigate('/login');
    }
  }, [navigate, registrarUsuario]);

  // Substitui o user no estado (ex.: após salvar o perfil) para o Header
  // refletir imediatamente sem novo GET /me. A sessão continua a mesma — é o
  // conteúdo dela que mudou —, e por isso passa pelo mesmo caminho.
  const updateUser = useCallback((usuario) => {
    registrarUsuario(usuario);
  }, [registrarUsuario]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, checkAuth, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// O hook mora junto do provider por ser a interface de consumo dele; separá-lo
// só para satisfazer a regra criaria um arquivo sem outra razão de existir. O
// custo é perder o fast refresh neste arquivo — aceitável, ele quase não muda.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
