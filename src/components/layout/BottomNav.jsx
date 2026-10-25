import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CloudUpload, Ellipsis, LayoutDashboard, LogOut, Moon, Sun, UserCog } from 'lucide-react';
import Icone from '../ui/Icone.jsx';
import { GRUPOS, LINKS_PRINCIPAIS, PENDENCIAS, PERFIL, itemAtivo, maisAtivo } from './navegacao.js';
import './BottomNav.css';

// ═══════════════════════════════════════════════════════════════════════════
// A BARRA DE BAIXO E O "MAIS" (Fase 2a, DEC-079)
//
// Abaixo de 1024 px: Início, Clientes, Processos, Agenda e "Mais". Eram sete
// itens espremidos em 360 px, e Sair e Tema não existiam no celular — a
// Sidebar, que os tinha, some abaixo de 768 px.
//
// O "Mais" abre uma folha que sobe de baixo com o resto: Financeiro, Documentos,
// Pendências, Perfil, Tema e Sair. Ela é um diálogo:
//   - abre com o foco no primeiro item;
//   - o Tab circula dentro dela (o resto da tela está atrás do fundo escuro,
//     e tabular para o que não se vê é o defeito do painel cortado da DEC-046);
//   - fecha com Escape, com toque no fundo, pelo botão Fechar e ao navegar;
//   - devolve o foco ao botão "Mais".
// ═══════════════════════════════════════════════════════════════════════════

// O ícone de cada destino: os dela onde existem, o lucide que a tela já usava
// onde não existem (lista no relatório da fase).
const ICONES_DA_BARRA = {
  '/dashboard':           { lucide: LayoutDashboard },
  '/dashboard/clientes':  { nome: 'pessoa' },
  '/dashboard/processos': { nome: 'folder' },
  '/dashboard/agenda':    { nome: 'calendario' },
};

const ICONES_DOS_GRUPOS = { financeiro: 'dinheiro', documentos: 'documento' };

const SELETOR_FOCAVEL = 'a[href], button:not([disabled])';

function IconeDaBarra({ to }) {
  const icone = ICONES_DA_BARRA[to];
  if (icone?.lucide) {
    const Lucide = icone.lucide;
    return <Lucide size={22} aria-hidden="true" />;
  }
  return <Icone nome={icone.nome} tamanho={22} />;
}

function BottomNav({ theme, toggleTheme, onLogout }) {
  const location = useLocation();
  const [aberto, setAberto] = useState(false);
  const botaoMais = useRef(null);
  const folha = useRef(null);

  const fechar = useCallback(() => {
    setAberto(false);
    botaoMais.current?.focus();
  }, []);

  // Navegou: fecha. Sem devolver o foco aqui — a tela nova é que importa, e o
  // `fechar` chamado pelos itens já o devolve antes de a rota mudar.
  useEffect(() => { setAberto(false); }, [location.pathname, location.search]);

  // Foco no primeiro item ao abrir.
  useEffect(() => {
    if (!aberto) return;
    folha.current?.querySelector(SELETOR_FOCAVEL)?.focus();
  }, [aberto]);

  const aoTeclar = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      fechar();
      return;
    }
    if (e.key !== 'Tab') return;
    const focaveis = [...folha.current.querySelectorAll(SELETOR_FOCAVEL)];
    if (focaveis.length === 0) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    // `preventDefault` antes de mover: sem ele o navegador já levou o foco
    // para fora, e o `.focus()` viria tarde (a mesma linha da F-1b.3.2).
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault();
      primeiro.focus();
    }
  };

  const classeDoLink = (item) =>
    `bottom-nav-item${itemAtivo(item, location) ? ' active' : ''}`;

  const classeDoItemDaFolha = (item) =>
    `mais__item${itemAtivo(item, location) ? ' mais__item--ativo' : ''}`;

  return (
    <>
      <nav className="bottom-nav" aria-label="Navegação mobile">
        {LINKS_PRINCIPAIS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={() => classeDoLink(item)}
          >
            <IconeDaBarra to={item.to} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          ref={botaoMais}
          type="button"
          className={`bottom-nav-item${maisAtivo(location) ? ' active' : ''}`}
          aria-expanded={aberto}
          aria-controls="painel-mais"
          onClick={() => setAberto((v) => !v)}
        >
          <Ellipsis size={22} aria-hidden="true" />
          <span>Mais</span>
        </button>
      </nav>

      {aberto && (
        <div className="mais__fundo" onMouseDown={(e) => { if (e.target === e.currentTarget) fechar(); }}>
          <div
            id="painel-mais"
            ref={folha}
            className="mais"
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções de navegação"
            onKeyDown={aoTeclar}
          >
            {GRUPOS.map((grupo) => (
              <section key={grupo.id} className="mais__grupo" aria-labelledby={`mais-${grupo.id}`}>
                <h2 id={`mais-${grupo.id}`} className="mais__titulo">
                  <Icone nome={ICONES_DOS_GRUPOS[grupo.id]} tamanho={18} />
                  {grupo.label}
                </h2>
                <ul className="mais__lista">
                  {grupo.itens.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={classeDoItemDaFolha(item)}
                        aria-current={itemAtivo(item, location) ? 'page' : undefined}
                        onClick={fechar}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <ul className="mais__lista mais__lista--conta">
              <li>
                <Link to={PENDENCIAS.to} className={classeDoItemDaFolha(PENDENCIAS)} onClick={fechar}>
                  <CloudUpload size={18} aria-hidden="true" />
                  {PENDENCIAS.label}
                </Link>
              </li>
              <li>
                <Link to={PERFIL.to} className={classeDoItemDaFolha(PERFIL)} onClick={fechar}>
                  <UserCog size={18} aria-hidden="true" />
                  {PERFIL.label}
                </Link>
              </li>
              <li>
                <button type="button" className="mais__item" onClick={toggleTheme}>
                  {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
                  {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="mais__item mais__item--sair"
                  onClick={() => { setAberto(false); onLogout(); }}
                >
                  <LogOut size={18} aria-hidden="true" />
                  Sair
                </button>
              </li>
              <li>
                <button type="button" className="mais__item mais__item--fechar" onClick={fechar}>
                  <Icone nome="fechar" tamanho={18} />
                  Fechar
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}

export default BottomNav;
