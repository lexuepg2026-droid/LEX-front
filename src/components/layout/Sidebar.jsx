import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Scale,
  Banknote, Receipt, CalendarDays, CreditCard,
  FolderOpen, Sun, Moon, LogOut
} from 'lucide-react';
import logo from '../../assets/logo-lex.jpeg';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard',             label: 'Início',      icon: LayoutDashboard, end: true },
  null,
  { to: '/dashboard/clientes',   label: 'Clientes',    icon: Users      },
  { to: '/dashboard/processos',  label: 'Processos',   icon: Scale      },
  null,
  { to: '/dashboard/financeiro', label: 'Financeiro',  icon: Banknote   },
  { to: '/dashboard/honorarios', label: 'Honorários',  icon: Receipt    },
  { to: '/dashboard/parcelas',   label: 'Parcelas',    icon: CalendarDays },
  { to: '/dashboard/pagamentos', label: 'Pagamentos',  icon: CreditCard },
  null,
  { to: '/dashboard/documentos', label: 'Documentos',  icon: FolderOpen },
];

function Sidebar({ theme, toggleTheme, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src={logo} alt="Logo LEX" className="sidebar-logo" />
      </div>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {NAV_ITEMS.map((item, i) =>
            item === null ? (
              <li key={i} className="menu-divider" />
            ) : (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            )
          )}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <button onClick={toggleTheme} className="btn-icon-label">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
        </button>
        <button onClick={onLogout} className="btn-icon-label btn-logout">
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
