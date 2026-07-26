import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../api/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const checkAuth = useCallback(async () => {
    try {
      const res = await authService.getMe();
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email, senha) => {
    const res = await authService.login(email, senha);
    setUser(res.data.usuario);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Falha na chamada de logout não impede a limpeza local da sessão.
    } finally {
      setUser(null);
      navigate('/login');
    }
  }, [navigate]);

  // Substitui o user no estado (ex.: após salvar o perfil) para o Header
  // refletir imediatamente sem novo GET /me.
  const updateUser = useCallback((usuario) => {
    setUser(usuario);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, checkAuth, login, logout, updateUser }}>
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
