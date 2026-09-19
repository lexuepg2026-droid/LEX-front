import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../api/authService';
import { getApiErrorMessage, getApiErrorCode } from '../../utils/apiError';
import './LoginPage.css';
import './AuthEmail.css';
import logo from '../../assets/logo-lex.jpeg';

// ═══════════════════════════════════════════════════════════════════════════
// ESCOLHER A NOVA SENHA (A-2, DEC-064) — o destino do link do e-mail
//
// O token vem na URL (`?token=`), é lido UMA vez para o estado e a URL é
// reescrita sem ele. Um token que fica na barra de endereço vai para o
// histórico do navegador, para o "copiar link" e, dependendo do cabeçalho
// `Referrer` de quem hospeda, para o próximo site aberto a partir daqui.
//
// Redefinir a senha NÃO abre sessão: depois de trocar, a pessoa volta ao login e
// digita a senha nova. O link, sozinho, nunca vale como credencial.
// ═══════════════════════════════════════════════════════════════════════════

const lerTokenDaUrl = () => new URLSearchParams(window.location.search).get('token') ?? '';

// A mesma regra do cadastro (`RegisterPage`) e do servidor (`validateSenhaForte`).
const validarSenha = (senha, confirmacao) => {
  if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) {
    return 'A senha deve ter no mínimo 8 caracteres, com ao menos uma letra e um número.';
  }
  if (senha !== confirmacao) return 'As senhas não coincidem.';
  return '';
};

function ResetPasswordPage() {
  const [token] = useState(lerTokenDaUrl);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState('');
  const [linkMorto, setLinkMorto] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate('/redefinir-senha', { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const problema = validarSenha(senha, confirmacao);
    if (problema) {
      setErro(problema);
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, senha);
      setConcluido(true);
    } catch (err) {
      // `codigo` é o que separa "o link não vale mais" de "a senha não serve":
      // no segundo caso o link continua inteiro e a pessoa só corrige o campo.
      const codigo = getApiErrorCode(err);
      if (codigo === 'tokenInvalido' || codigo === 'tokenExpirado') {
        setLinkMorto(true);
      }
      setErro(getApiErrorMessage(err, 'Não foi possível redefinir a senha. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  if (concluido) {
    return (
      <div className="login-page">
        <img src={logo} alt="Logo LEX" className="logo" />
        <h1 className="auth-titulo">Senha redefinida</h1>
        <p className="auth-mensagem" role="status">
          Sua senha foi alterada. Por segurança, todos os aparelhos conectados à sua conta foram desconectados.
        </p>
        <button type="button" className="btn-primary" onClick={() => navigate('/login', { replace: true })}>
          Entrar
        </button>
      </div>
    );
  }

  if (!token || linkMorto) {
    return (
      <div className="login-page">
        <img src={logo} alt="Logo LEX" className="logo" />
        <h1 className="auth-titulo">Link inválido</h1>
        <p className="auth-mensagem auth-mensagem--erro" role="alert">
          {linkMorto && erro ? erro : 'Este link é inválido ou já foi utilizado.'}
        </p>
        <div className="login-links">
          <Link to="/esqueci-senha">Pedir um novo link</Link>
          <Link to="/login">Voltar ao login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <img src={logo} alt="Logo LEX" className="logo" />
      <h1 className="auth-titulo">Escolha uma nova senha</h1>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="password"
            placeholder="Nova senha (mín. 8, com letra e número)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {erro && <p className="error-message" role="alert">{erro}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordPage;
