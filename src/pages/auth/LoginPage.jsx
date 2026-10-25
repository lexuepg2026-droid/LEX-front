import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { emailValido, MENSAGEM_EMAIL_INVALIDO } from '../../utils/email';
import './LoginPage.css';
import LayoutAutenticacao from '../../components/layout/LayoutAutenticacao.jsx';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // ── DEC-063: a tela valida o formato; o SERVIDOR não ─────────────────
    //
    // Aqui é conveniência pura: poupa uma requisição e avisa o erro de
    // digitação sem envolver o servidor. Repare que a validação acontece
    // ANTES do `setLoading(true)` e o `return` sai sem chamar `login()` — o
    // ponto do passo 264 é justamente que nada é enviado.
    //
    // **E o servidor continua sem validar formato, de propósito.** Ele
    // responde 401 "Credenciais inválidas" para e-mail inexistente e para
    // senha errada, com corpo idêntico, e um 400 que só e-mail malformado
    // recebe permitiria descobrir quais endereços têm conta. Quem contornar
    // esta tela recebe o mesmo 401 de sempre, que é o comportamento certo.
    // A nota inteira está em `validations/authValidation.js`, no backend.
    if (!emailValido(email)) {
      setError(MENSAGEM_EMAIL_INVALIDO);
      return;
    }

    setLoading(true);

    try {
      await login(email, senha);
      navigate('/dashboard');

    } catch (err) {
      setError(getApiErrorMessage(err, 'Credenciais inválidas. Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  // Fase 2a (DEC-081): o layout da Figura 16 — título, rótulos VISÍVEIS acima
  // dos campos (os dela eram só placeholder, que some ao digitar), o botão
  // preenchido, o "Esqueceu sua senha?" e o "Criar conta" contornado. A lógica
  // acima não mudou.
  return (
    <LayoutAutenticacao voltarPara="/">
      <div className="login-page">
        <h1 className="auth-titulo">Fazer login</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-senha">Senha</label>
            <input
              id="login-senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="error-message" role="alert">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Entrando...' : 'Fazer login'}
          </button>
        </form>

        <div className="login-links">
          <Link to="/esqueci-senha">Esqueceu sua senha?</Link>
          <Link to="/registrar" className="btn-contornado">Criar conta</Link>
        </div>
      </div>
    </LayoutAutenticacao>
  );
}

export default LoginPage;