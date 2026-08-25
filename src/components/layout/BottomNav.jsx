import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Scale, CalendarClock, FolderOpen, Banknote, UserCog } from 'lucide-react';
import './BottomNav.css';

const NAV_ITEMS = [
  { to: '/dashboard',            label: 'Início',     icon: LayoutDashboard, end: true },
  { to: '/dashboard/clientes',   label: 'Clientes',   icon: Users            },
  { to: '/dashboard/processos',  label: 'Processos',  icon: Scale            },
  // A agenda entra na barra de baixo porque é a tela que a advogada abre NO
  // CELULAR — é lá que ela pergunta "o que eu tenho hoje", e é lá que a vista
  // de agenda é o padrão. Uma tela desenhada para 360 px que só se alcança
  // pelo menu de 1024 px teria sido desenhada para ninguém.
  { to: '/dashboard/agenda',     label: 'Agenda',     icon: CalendarClock    },
  { to: '/dashboard/documentos', label: 'Documentos', icon: FolderOpen       },
  { to: '/dashboard/financeiro', label: 'Financeiro', icon: Banknote         },
  { to: '/dashboard/perfil',     label: 'Perfil',     icon: UserCog          },
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
