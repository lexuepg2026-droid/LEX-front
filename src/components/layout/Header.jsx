import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Header.css';

const BREADCRUMB_MAP = {
  '/dashboard':              'Início',
  '/dashboard/clientes':     'Clientes',
  '/dashboard/clientes/novo': 'Novo Cliente',
  '/dashboard/processos':    'Processos',
  '/dashboard/processos/novo': 'Novo Processo',
  '/dashboard/honorarios':   'Honorários',
  '/dashboard/honorarios/novo': 'Novo Honorário',
  '/dashboard/parcelas':     'Parcelas',
  '/dashboard/parcelas/novo': 'Nova Parcela',
  '/dashboard/documentos':   'Documentos',
  '/dashboard/pagamentos':   'Pagamentos',
  '/dashboard/pagamentos/novo': 'Novo Pagamento',
  '/dashboard/perfil':       'Perfil',
};

const SECTION_LABELS = {
  clientes:    'Clientes',
  processos:   'Processos',
  honorarios:  'Honorários',
  parcelas:    'Parcelas',
  documentos:  'Documentos',
  pagamentos:  'Pagamentos',
};

function buildBreadcrumb(pathname) {
  if (BREADCRUMB_MAP[pathname]) return ['LEX', BREADCRUMB_MAP[pathname]];
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 3) {
    const section = SECTION_LABELS[parts[1]];
    if (section) {
      const action = parts[2] === 'editar' ? 'Editar' : 'Detalhe';
      return ['LEX', section, action];
    }
  }
  return ['LEX'];
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function Header() {
  const location = useLocation();
  // O nome vem do contexto, não de um GET /me próprio: assim a tela de Perfil
  // reflete aqui na hora, via updateUser, sem recarregar a página.
  const { user } = useAuth();

  const breadcrumb = buildBreadcrumb(location.pathname);

  const nomeCompleto = user?.nomeCompleto || '';
  const firstName = nomeCompleto.split(' ')[0] || '';

  return (
    <header className="app-header">
      <nav className="breadcrumb" aria-label="breadcrumb">
        {breadcrumb.map((segment, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="breadcrumb-sep">›</span>}
            <span className={i === breadcrumb.length - 1 ? 'breadcrumb-current' : 'breadcrumb-item'}>
              {segment}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {nomeCompleto && (
        <div className="header-user">
          <span className="header-greeting">Olá, {firstName}</span>
          <div className="avatar" title={nomeCompleto}>
            {getInitials(nomeCompleto)}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
