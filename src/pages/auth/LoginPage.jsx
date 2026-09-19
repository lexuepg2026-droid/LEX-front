import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { emailValido, MENSAGEM_EMAIL_INVALIDO } from '../../utils/email';
import './LoginPage.css';
import logo from '../../assets/logo-lex.jpeg';

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

  return (
    <div className="login-page">
      <img src={logo} alt="Logo LEX" className="logo" />
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input 
            type="email" 
            placeholder="Email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div className="form-group">
          <input 
            type="password" 
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className="login-links">
        <Link to="/esqueci-senha">Esqueci minha senha</Link>
        <Link to="/registrar">Criar nova conta</Link>
      </div>
    </div>
  );
}

export default LoginPage;