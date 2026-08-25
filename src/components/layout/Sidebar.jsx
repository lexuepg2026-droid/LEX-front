import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Scale,
  Banknote, Receipt, CalendarDays, CalendarClock, CreditCard,
  FolderOpen, LibraryBig, FileStack, FileText, UserCog, Sun, Moon, LogOut
} from 'lucide-react';
import logo from '../../assets/logo-lex.jpeg';
import './Sidebar.css';

// As duas PORTAS DE ENTRADA da tela de montagem são itens de menu distintos,
// apontando para a mesma rota com `modo` diferente. Separadas de propósito: a
// advogada decide o que está fazendo ANTES de entrar, e o modo continua visível
// no cabeçalho depois. Um item único com "escolha o modo" na tela empurraria a
// decisão para dentro e deixaria a dúvida no meio do trabalho.
const NAV_ITEMS = [
  { to: '/dashboard',             label: 'Início',      icon: LayoutDashboard, end: true },
  null,
  { to: '/dashboard/clientes',   label: 'Clientes',    icon: Users      },
  { to: '/dashboard/processos',  label: 'Processos',   icon: Scale      },
  // A agenda fica junto de Clientes e Processos, e NÃO no bloco do dinheiro:
  // ela responde "o que vem, e o que já aconteceu", que é a pergunta do
  // trabalho — e não a do caixa. Que ela mostre vencimentos junto é
  // consequência da DEC-055, não motivo para arquivá-la no financeiro.
  { to: '/dashboard/agenda',     label: 'Agenda',      icon: CalendarClock },
  null,
  { to: '/dashboard/financeiro', label: 'Financeiro',  icon: Banknote   },
  { to: '/dashboard/honorarios', label: 'Honorários',  icon: Receipt    },
  { to: '/dashboard/parcelas',   label: 'Parcelas',    icon: CalendarDays },
  { to: '/dashboard/pagamentos', label: 'Pagamentos',  icon: CreditCard },
  null,
  { to: '/dashboard/documentos', label: 'Documentos',  icon: FolderOpen, end: true },
  { to: '/dashboard/documentos/montar?modo=documento', label: 'Gerar documento', icon: FileText,  modo: 'documento' },
  { to: '/dashboard/documentos/montar?modo=modelo',    label: 'Montar modelo',   icon: FileStack, modo: 'modelo'    },
  { to: '/dashboard/secoes',     label: 'Seções',      icon: LibraryBig },
  null,
  { to: '/dashboard/perfil',     label: 'Perfil',      icon: UserCog    },
];

function Sidebar({ theme, toggleTheme, onLogout }) {
  // As duas portas de montagem levam ao MESMO caminho e se distinguem só pelo
  // `?modo=`. O `isActive` do NavLink ignora a query string, então sem esta
  // conta as duas acenderiam juntas — e a advogada perderia justamente o sinal
  // de qual modo está aberto, que é o ponto de ter duas portas.
  const location = useLocation();
  const modoAtual = new URLSearchParams(location.search).get('modo');
  const naMontagem = location.pathname.startsWith('/dashboard/documentos/montar');

  const classeDoItem = (item, isActive) => {
    if (item.modo) {
      return naMontagem && modoAtual === item.modo ? 'nav-link active' : 'nav-link';
    }
    return isActive ? 'nav-link active' : 'nav-link';
  };

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
                  className={({ isActive }) => classeDoItem(item, isActive)}
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
