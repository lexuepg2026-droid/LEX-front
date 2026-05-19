import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { toast } from '../../utils/toast';
import './RegisterPage.css';
import logo from '../../assets/logo-lex.jpeg';

function RegisterPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      // 2. MUDANÇA: Usa 'api.post' e só o final da URL
      await api.post('/auth/register', {
        nomeCompleto: nome,
        email: email,
        senha: senha,
      });

      toast.success('Conta criada com sucesso! Faça o login.');
      navigate('/login');

    } catch (err) {
      console.error('Falha no cadastro:', err);
      if (err.response && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao se cadastrar. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <img src={logo} alt="Logo LEX" className="logo" />
      <h2>Criar Nova Conta</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input 
            type="text" 
            placeholder="Nome Completo" 
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </div>
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
        <div className="form-group">
          <input 
            type="password" 
            placeholder="Confirmar Senha"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
          />
        </div>

        {error && <p className="error-message">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Registrando...' : 'Registrar'}
        </button>
      </form>

      <div className="register-links">
        <Link to="/login">Já tem uma conta? Faça o login</Link>
      </div>
    </div>
  );
}

export default RegisterPage;