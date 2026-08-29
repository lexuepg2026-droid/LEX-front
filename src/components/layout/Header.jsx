import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBreadcrumbLabel } from '../../contexts/BreadcrumbContext';
import NotificationBell from './NotificationBell';
import PendingUploads from './PendingUploads';
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
  // Seções e Financeiro faltavam nos dois mapas (varredura B.5 da Fase 4.3):
  // as três telas de seção e a de financeiro caíam no `return ['LEX']` do
  // fim, e o cabeçalho ficava sem trilha nenhuma — justamente nas telas em
  // que a advogada mais navega para dentro.
  '/dashboard/secoes':       'Biblioteca de Seções',
  '/dashboard/secoes/nova':  'Nova Seção',
  '/dashboard/financeiro':   'Financeiro',
  // F-3 — a agenda e o formulário do compromisso. As duas entradas estavam
  // faltando nas telas de Seções e Financeiro até a varredura B.5 da 4.3, e o
  // sintoma era cabeçalho sem trilha nenhuma justamente onde a advogada mais
  // navega para dentro. Uma tela nova entra nos dois mapas no mesmo commit.
  '/dashboard/agenda':       'Agenda',
  '/dashboard/agenda/novo':  'Novo compromisso',
};

const SECTION_LABELS = {
  clientes:    'Clientes',
  processos:   'Processos',
  honorarios:  'Honorários',
  parcelas:    'Parcelas',
  documentos:  'Documentos',
  pagamentos:  'Pagamentos',
  secoes:      'Biblioteca de Seções',
  agenda:      'Agenda',
};

// `rotuloDaPagina` é o nome do registro aberto, publicado pela própria página
// (F-1b). Quando existe, ele SUBSTITUI o "Detalhe" genérico: numa tela
// alcançada por link de vários lugares, "Detalhe" não diz de qual registro se
// trata. Quando não existe — porque a página não publica, ou porque o GET
// ainda não voltou — a trilha antiga continua valendo inteira.
function buildBreadcrumb(pathname, rotuloDaPagina = null) {
  if (BREADCRUMB_MAP[pathname]) return ['LEX', BREADCRUMB_MAP[pathname]];
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length >= 3) {
    const section = SECTION_LABELS[parts[1]];
    if (section) {
      const action = parts[2] === 'editar' ? 'Editar' : 'Detalhe';
      return ['LEX', section, rotuloDaPagina || action];
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

  const rotuloDaPagina = useBreadcrumbLabel(location.pathname);
  const breadcrumb = buildBreadcrumb(location.pathname, rotuloDaPagina);

  const nomeCompleto = user?.nomeCompleto || '';
  const firstName = nomeCompleto.split(' ')[0] || '';

  return (
    <header className="app-header">
      <nav className="breadcrumb" aria-label="breadcrumb">
        {breadcrumb.map((segment, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="breadcrumb-sep">›</span>}
            {/* `breadcrumb-item` saiu: nunca teve regra em CSS nenhum. Os
                segmentos não-atuais já herdam a cor de `.breadcrumb`, e só o
                último se distingue, por `.breadcrumb-current`. */}
            <span className={i === breadcrumb.length - 1 ? 'breadcrumb-current' : undefined}>
              {segment}
            </span>
          </React.Fragment>
        ))}
      </nav>

      <div className="header-user">
        {/* O sino fica no cabeçalho, e não na Sidebar: ele precisa estar
            visível nas duas larguras, e em 360 px a Sidebar não existe. */}
        {/* O contador da FILA vem antes do sino: o que não saiu do aparelho
            é mais urgente do que o que o mundo cobra — e ele só aparece quando
            existe (F-5b). */}
        <PendingUploads />
        <NotificationBell />
        {nomeCompleto && (
          <>
            <span className="header-greeting">Olá, {firstName}</span>
            <div className="avatar" title={nomeCompleto}>
              {getInitials(nomeCompleto)}
            </div>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;
