import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Moon, Sun, UserCog } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import MenuSuspenso from './MenuSuspenso.jsx';
import { PERFIL, iniciais, primeiroNome } from './navegacao.js';
import './MenuUsuario.css';

// O menu do usuário (Fase 2a): "Olá, {nome}" e o círculo de iniciais, como na
// Figura 17. Abre Perfil, a troca de tema e Sair.
//
// Tema e Sair são EXATAMENTE as funções que a Sidebar recebia: `toggleTheme` e
// `onLogout` vêm do `DashboardPage`, e o `onLogout` continua sendo o que avisa
// da fila offline antes de sair (F-5b). Nada foi reescrito aqui.
//
// O mesmo componente serve ao cabeçalho largo e à barra compacta do celular;
// abaixo de 1024 px a saudação some e fica só o círculo (DEC-079).
function MenuUsuario({ theme, toggleTheme, onLogout }) {
  const { user } = useAuth();
  const nomeCompleto = user?.nomeCompleto || '';
  if (!nomeCompleto) return null;

  return (
    <MenuSuspenso
      className="menu-usuario"
      painelClassName="menu-suspenso__painel--direita"
      rotuloDoBotao={`Menu de ${nomeCompleto}`}
      conteudoDoBotao={(
        <>
          <span className="menu-usuario__saudacao">Olá, {primeiroNome(nomeCompleto)}</span>
          <span className="menu-usuario__avatar" aria-hidden="true">{iniciais(nomeCompleto)}</span>
        </>
      )}
    >
      {(fechar) => (
        <ul className="menu-suspenso__lista">
          <li>
            <Link to={PERFIL.to} className="menu-suspenso__item">
              <UserCog size={16} aria-hidden="true" />
              {PERFIL.label}
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="menu-suspenso__item"
              onClick={() => { toggleTheme(); fechar({ devolverFoco: true }); }}
            >
              {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="menu-suspenso__item menu-suspenso__item--sair"
              onClick={() => { fechar(); onLogout(); }}
            >
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          </li>
        </ul>
      )}
    </MenuSuspenso>
  );
}

export default MenuUsuario;
