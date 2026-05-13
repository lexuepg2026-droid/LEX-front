import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { removeToken, getTheme as getStoredTheme, setTheme as setStoredTheme, removeTheme } from '../../utils/storage';

function DashboardPage() {
  const navigate = useNavigate();
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

  const handleLogout = () => {
    removeToken();
    document.body.classList.remove('light-mode');
    removeTheme();
    navigate('/login');
  };

  return (
    <AppLayout theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />
  );
}

export default DashboardPage;
