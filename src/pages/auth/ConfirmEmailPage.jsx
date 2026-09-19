import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../api/authService';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import './LoginPage.css';
import './AuthEmail.css';
import logo from '../../assets/logo-lex.jpeg';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIRMAR O E-MAIL (A-2, DEC-064) — o destino do link do e-mail de cadastro
//
// A tela consome o link ao ABRIR: não há botão "confirmar". Quem clicou no link
// do e-mail já disse o que queria, e um passo extra só criaria a chance de o
// link expirar entre um clique e outro.
//
// Duas armadilhas tratadas aqui, e as duas têm teste:
//
//   • `React.StrictMode` monta o efeito duas vezes em desenvolvimento. O
//     segundo envio do MESMO token responderia "já utilizado" e sobrescreveria
//     o sucesso da primeira resposta com um erro. `enviado` (um ref, que
//     sobrevive à remontagem) garante UM envio só.
//   • O token sai da barra de endereço logo depois de lido — ver a nota em
//     `ResetPasswordPage.jsx`.
//
// Confirmar NÃO abre sessão. Se a pessoa já estava logada, a tela atualiza o
// usuário (`checkAuth`) para o aviso de "confirme seu e-mail" sumir sem F5.
// ═══════════════════════════════════════════════════════════════════════════

const lerTokenDaUrl = () => new URLSearchParams(window.location.search).get('token') ?? '';

function ConfirmEmailPage() {
  const [estado, setEstado] = useState('carregando'); // carregando | ok | erro
  const [mensagem, setMensagem] = useState('');

  const enviado = useRef(false);
  const navigate = useNavigate();
  const { isAuthenticated, checkAuth } = useAuth();

  useEffect(() => {
    if (enviado.current) return;
    enviado.current = true;

    const token = lerTokenDaUrl();
    navigate('/confirmar-email', { replace: true });

    if (!token) {
      setEstado('erro');
      setMensagem('Este link é inválido ou já foi utilizado.');
      return;
    }

    authService
      .confirmEmail(token)
      .then(async () => {
        setEstado('ok');
        // O usuário logado precisa saber que agora está confirmado.
        await checkAuth();
      })
      .catch((err) => {
        setEstado('erro');
        setMensagem(getApiErrorMessage(err, 'Não foi possível confirmar o e-mail. Tente novamente.'));
      });
  }, [navigate, checkAuth]);

  return (
    <div className="login-page">
      <img src={logo} alt="Logo LEX" className="logo" />

      {estado === 'carregando' && (
        <p className="auth-texto" role="status">Confirmando seu e-mail…</p>
      )}

      {estado === 'ok' && (
        <>
          <h1 className="auth-titulo">E-mail confirmado</h1>
          <p className="auth-mensagem" role="status">Obrigado! Seu e-mail foi confirmado.</p>
          <div className="login-links">
            <Link to={isAuthenticated ? '/dashboard' : '/login'}>
              {isAuthenticated ? 'Ir para o sistema' : 'Entrar'}
            </Link>
          </div>
        </>
      )}

      {estado === 'erro' && (
        <>
          <h1 className="auth-titulo">Não foi possível confirmar</h1>
          <p className="auth-mensagem auth-mensagem--erro" role="alert">{mensagem}</p>
          <p className="auth-texto">
            Entre no sistema: enquanto o e-mail não estiver confirmado, um aviso no topo da tela
            permite pedir um novo link.
          </p>
          <div className="login-links">
            <Link to={isAuthenticated ? '/dashboard' : '/login'}>
              {isAuthenticated ? 'Ir para o sistema' : 'Entrar'}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default ConfirmEmailPage;
