import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import EmailConfirmationBanner from './EmailConfirmationBanner';
import VoltarAoTopo from './VoltarAoTopo.jsx';
import FaixaContexto from './FaixaContexto.jsx';
// A faixa de contexto precisa saber de qual processo ou cliente a página é, e
// só a página sabe. O provider envolve a faixa e o Outlet — os dois lados da
// conversa. Ver `contexts/ContextoContext.jsx` (Fase 2b, DEC-085).
import { ContextoProvider } from '../../contexts/ContextoContext';
import './AppLayout.css';

// Fase 2a (DEC-079): a Sidebar saiu. O cabeçalho horizontal ocupa o topo, e
// abaixo de 1024 px a navegação vai para a barra de baixo com "Mais". Tema e
// Sair continuam sendo as funções do `DashboardPage`, agora entregues ao menu
// do usuário (no cabeçalho) e à folha do "Mais" (na barra de baixo).
function AppLayout({ theme, toggleTheme, onLogout }) {
  return (
    <ContextoProvider>
      <div className="app-layout">
        <Header theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />
        {/* No lugar da trilha: "Voltar" e o contexto, só onde há os dois. */}
        <FaixaContexto />
        {/* A-2: aviso de e-mail não confirmado. Não bloqueia nada. */}
        <EmailConfirmationBanner />
        <main className="main-content">
          <Outlet />
        </main>
        {/* Quem rola aqui é `.main-content`, não o `window`. */}
        <VoltarAoTopo seletor=".main-content" />
        <BottomNav theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />
      </div>
    </ContextoProvider>
  );
}

export default AppLayout;
