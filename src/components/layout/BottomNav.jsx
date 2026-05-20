import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Scale, FolderOpen, Banknote } from 'lucide-react';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/dashboard',            label: 'Início',     icon: LayoutDashboard, end: true },
  { to: '/dashboard/clientes',   label: 'Clientes',   icon: Users            },
  { to: '/dashboard/processos',  label: 'Processos',  icon: Scale            },
  { to: '/dashboard/documentos', label: 'Documentos', icon: FolderOpen       },
  { to: '/dashboard/financeiro', label: 'Financeiro', icon: Banknote         },
];

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navegação mobile">
      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => isActive ? 'bottom-nav-item active' : 'bottom-nav-item'}
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
