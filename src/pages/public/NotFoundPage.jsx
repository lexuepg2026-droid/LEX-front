import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LogoLex from '../../components/ui/LogoLex.jsx';
import { destinoDeVolta } from './naoEncontrada.js';
// O link tem a forma do botão primário; a folha vem com quem aplica a classe.
import '../../components/ui/Button.css';
import './NotFoundPage.css';

// "Página não encontrada" (Fase 2a, item 5). Até aqui uma URL inexistente
// renderizava a tela vazia, sem cabeçalho e sem saída — e uma tela em branco se
// lê como sistema fora do ar, não como endereço errado.
//
// Monta em dois lugares: dentro do layout da advogada (`/dashboard/…`, com o
// cabeçalho e a navegação em volta) e sozinha, para todo o resto. A sessão
// decide o link só fora do portal: lá ele leva sempre ao `/portal`.
function NotFoundPage({ dentroDoLayout = false }) {
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const { to, rotulo } = destinoDeVolta(pathname, isAuthenticated);

  return (
    <div className={`nao-encontrada${dentroDoLayout ? ' nao-encontrada--no-layout' : ''}`}>
      <div className="nao-encontrada__balao">
        {!dentroDoLayout && <LogoLex className="nao-encontrada__logo" />}
        <h1 className="nao-encontrada__titulo">Página não encontrada</h1>
        <p className="nao-encontrada__texto">
          O endereço <code>{pathname}</code> não existe no LEX. Ele pode ter sido digitado
          errado ou ter mudado de lugar.
        </p>
        <Link to={to} className="ui-btn ui-btn--primary ui-btn--md">{rotulo}</Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
