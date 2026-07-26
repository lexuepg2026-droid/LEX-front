import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { getTheme as getStoredTheme, setTheme as setStoredTheme, removeTheme } from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';

function DashboardPage() {
  const { logout } = useAuth();
  const [theme, setTheme] = useState(getStoredTheme());

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    setStoredTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleLogout = async () => {
    // Limpeza local do tema; a sessão (zerar user + navegar) fica no contexto.
    document.body.classList.remove('light-mode');
    removeTheme();
    await logout();
  };

  return (
    <AppLayout theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />
  );
}

export default DashboardPage;
