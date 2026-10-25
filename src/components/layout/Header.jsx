import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import LogoLex from '../ui/LogoLex.jsx';
import NotificationBell from './NotificationBell';
import PendingUploads from './PendingUploads';
import MenuSuspenso from './MenuSuspenso.jsx';
import MenuUsuario from './MenuUsuario.jsx';
import { GRUPOS, LINKS_PRINCIPAIS, grupoAtivo, itemAtivo } from './navegacao.js';
import './Header.css';

// ═══════════════════════════════════════════════════════════════════════════
// O CABEÇALHO HORIZONTAL (Fase 2a, DEC-079)
//
// Substitui a Sidebar. A BARRA da marca — #174034 fixo nos dois modos
// (DEC-078): logo, os links (≥ 1024 px), e à direita o contador da fila, o
// sino e o menu do usuário. Abaixo de 1024 px os links saem e a navegação vai
// para a barra de baixo com "Mais" (`BottomNav`); a barra fica compacta.
//
// A TRILHA que vivia numa segunda faixa saiu na Fase 2b (DEC-085). No lugar
// dela, a faixa de contexto (`FaixaContexto.jsx`), montada pelo `AppLayout`:
// "Voltar" e "Cliente · Processo" nas telas de detalhe e de formulário. O mapa
// de pais que a trilha tinha virou `paiDaRota`, em `contexto.js`.
//
// O cabeçalho fica SEMPRE visível: o desenho dela o escondia ao rolar, e a
// navegação que some é a que a advogada procura no meio de uma tabela longa.
// Ele não precisa de `position: sticky` — quem rola é `.main-content`, abaixo
// dele (ver `AppLayout.css`).
// ═══════════════════════════════════════════════════════════════════════════
function Header({ theme, toggleTheme, onLogout }) {
  const location = useLocation();

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
    </header>
  );
}

export default Header;
