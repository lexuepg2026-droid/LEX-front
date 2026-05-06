import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Outlet } from 'react-router-dom';
import './DashboardPage.css';
import logo from '../../assets/logo-lex.jpeg';

function DashboardPage() {
  const navigate = useNavigate();
  
  // ----- LÓGICA DO TEMA -----
  // 1. Pega o tema salvo ou usa 'dark' como padrão
  const [theme, setTheme] = useState(localStorage.getItem('lex-theme') || 'dark');

  // 2. Efeito que aplica a classe ao <body>
  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    // Salva a preferência no localStorage
    localStorage.setItem('lex-theme', theme);
  }, [theme]); // Roda toda vez que 'theme' mudar

  // 3. Função que o botão vai chamar
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };
  // ----- FIM DA LÓGICA DO TEMA -----

  const handleLogout = () => {
    localStorage.removeItem('lex-token');
    // Reseta o tema ao sair
    document.body.classList.remove('light-mode');
    localStorage.removeItem('lex-theme');
    navigate('/login');
  };

  return (
    <div className="dashboard-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <img src={logo} alt="Logo LEX" className="sidebar-logo" />
        </div>
        
        <ul className="sidebar-menu">
          <li><Link to="/dashboard">Início</Link></li>
          <li className="menu-divider"></li>
          <li><Link to="/dashboard/clientes">Listar Clientes</Link></li>
          <li><Link to="/dashboard/clientes/novo">Novo Cliente</Link></li>
          <li className="menu-divider"></li>
          <li><Link to="/dashboard/processos">Listar Processos</Link></li>
          <li><Link to="/dashboard/processos/novo">Novo Processo</Link></li>
        </ul>
        
        <div className="sidebar-footer">
          {/* 4. O BOTÃO DE TEMA */}
          <button onClick={toggleTheme} className="btn-theme-toggle">
            Mudar para Modo {theme === 'dark' ? 'Claro' : 'Escuro'}
          </button>
          
          <button onClick={handleLogout} className="btn-logout">
            Sair (Logout)
          </button>
        </div>
      </nav>

      <main className="main-content">
        <Outlet /> 
      </main>
    </div>
  );
}

export default DashboardPage;