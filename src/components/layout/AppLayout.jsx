import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
// A trilha do cabeçalho precisa, em telas de detalhe, de um rótulo que só a
// página conhece. O provider envolve Header e Outlet — os dois lados da
// conversa. Ver `contexts/BreadcrumbContext.jsx`.
import { BreadcrumbProvider } from '../../contexts/BreadcrumbContext';
import './AppLayout.css';

function AppLayout({ theme, toggleTheme, onLogout }) {
  return (
    <BreadcrumbProvider>
      <div className="app-layout">
        <Sidebar theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />
        <div className="main-wrapper">
          <Header />
          <main className="main-content">
            <Outlet />
          </main>
        </div>
        <BottomNav />
      </div>
    </BreadcrumbProvider>
  );
}

export default AppLayout;
