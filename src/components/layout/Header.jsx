import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useBreadcrumbLabel } from '../../contexts/BreadcrumbContext';
import LogoLex from '../ui/LogoLex.jsx';
import NotificationBell from './NotificationBell';
import PendingUploads from './PendingUploads';
import MenuSuspenso from './MenuSuspenso.jsx';
import MenuUsuario from './MenuUsuario.jsx';
import { GRUPOS, LINKS_PRINCIPAIS, grupoAtivo, itemAtivo } from './navegacao.js';
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

// ═══════════════════════════════════════════════════════════════════════════
// O CABEÇALHO HORIZONTAL (Fase 2a, DEC-079)
//
// Substitui a Sidebar. Duas faixas:
//
//   1. a BARRA da marca — #174034 fixo nos dois modos (DEC-078): logo, os
//      links (≥ 1024 px), e à direita o contador da fila, o sino e o menu do
//      usuário. Abaixo de 1024 px os links saem e a navegação vai para a barra
//      de baixo com "Mais" (`BottomNav`); a barra fica compacta.
//   2. a TRILHA, logo abaixo, no tema da tela. A lógica é a mesma de antes —
//      `buildBreadcrumb` e o rótulo publicado pela página (F-1b). Trocar a
//      trilha por "Voltar" ou pelo cabeçalho de contexto é decisão da Fase 2b.
//
// O cabeçalho fica SEMPRE visível: o desenho dela o escondia ao rolar, e a
// navegação que some é a que a advogada procura no meio de uma tabela longa.
// Ele não precisa de `position: sticky` — quem rola é `.main-content`, abaixo
// dele (ver `AppLayout.css`).
// ═══════════════════════════════════════════════════════════════════════════
function Header({ theme, toggleTheme, onLogout }) {
  const location = useLocation();
  const rotuloDaPagina = useBreadcrumbLabel(location.pathname);
  const breadcrumb = buildBreadcrumb(location.pathname, rotuloDaPagina);

  return (
    <header className="app-header">
      <div className="app-header__barra">
        <Link to="/dashboard" className="app-header__logo" aria-label="LEX — Início">
          <LogoLex className="app-header__logo-img" />
        </Link>

        <nav className="nav-principal" aria-label="Navegação principal">
          <ul className="nav-principal__lista">
            {LINKS_PRINCIPAIS.map((item) => {
              const ativo = itemAtivo(item, location);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={`nav-principal__link${ativo ? ' nav-principal__link--ativo' : ''}`}
                    aria-current={ativo ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            {GRUPOS.map((grupo) => (
              <li key={grupo.id}>
                <MenuSuspenso
                  className="nav-principal__grupo"
                  ativo={grupoAtivo(grupo, location)}
                  conteudoDoBotao={(
                    <>
                      {grupo.label}
                      <ChevronDown size={16} aria-hidden="true" className="menu-suspenso__seta" />
                    </>
                  )}
                >
                  <ul className="menu-suspenso__lista">
                    {grupo.itens.map((item) => {
                      const ativo = itemAtivo(item, location);
                      return (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            className={`menu-suspenso__item${ativo ? ' menu-suspenso__item--ativo' : ''}`}
                            aria-current={ativo ? 'page' : undefined}
                          >
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </MenuSuspenso>
              </li>
            ))}
          </ul>
        </nav>

        <div className="app-header__acoes">
          {/* O contador da FILA vem antes do sino: o que não saiu do aparelho
              é mais urgente do que o que o mundo cobra — e ele só aparece
              quando existe (F-5b). */}
          <PendingUploads />
          <NotificationBell />
          <MenuUsuario theme={theme} toggleTheme={toggleTheme} onLogout={onLogout} />
        </div>
      </div>

      <div className="app-header__trilha">
        <nav className="breadcrumb" aria-label="breadcrumb">
          {breadcrumb.map((segment, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="breadcrumb-sep">›</span>}
              <span className={i === breadcrumb.length - 1 ? 'breadcrumb-current' : undefined}>
                {segment}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default Header;
