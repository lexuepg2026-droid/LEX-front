import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../api/authService';
import { getApiErrorMessage } from '../../utils/apiError';
import { emailValido, MENSAGEM_EMAIL_INVALIDO } from '../../utils/email';
import './LoginPage.css';
import './AuthEmail.css';
import logo from '../../assets/logo-lex.jpeg';

// ═══════════════════════════════════════════════════════════════════════════
// PEDIR A RECUPERAÇÃO DA SENHA (A-2, DEC-064)
//
// A tela responde a MESMA coisa para e-mail com conta e sem conta: o servidor
// devolve o mesmo 200 nos dois casos, e aqui a mensagem só existe num lugar.
// Não há ramo "conta encontrada" e "conta não encontrada" — a tela nem tem como
// saber qual dos dois aconteceu, e é assim que tem de ser.
//
// Como no login (DEC-063), a tela confere o FORMATO antes de enviar e o servidor
// não: é conveniência que poupa a viagem, e o servidor responde igual mesmo se
// alguém contornar a tela.
// ═══════════════════════════════════════════════════════════════════════════

const MENSAGEM_ENVIADO =
  'Se o e-mail informado tiver uma conta, enviaremos as instruções para redefinir a senha.';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!emailValido(email)) {
      setErro(MENSAGEM_EMAIL_INVALIDO);
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setEnviado(true);
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível enviar o pedido. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <img src={logo} alt="Logo LEX" className="logo" />
      <h1 className="auth-titulo">Esqueci minha senha</h1>

      {enviado ? (
        <>
          <p className="auth-mensagem" role="status">{MENSAGEM_ENVIADO}</p>
          <p className="auth-texto">
            Confira também a caixa de spam. O link vale por 60 minutos e só pode ser usado uma vez.
          </p>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <p className="auth-texto">
            Informe o e-mail da sua conta. Se ela existir, você receberá um link para escolher uma nova senha.
          </p>

          <div className="form-group">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          {erro && <p className="error-message" role="alert">{erro}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>
      )}

      <div className="login-links">
        <Link to="/login">Voltar ao login</Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
