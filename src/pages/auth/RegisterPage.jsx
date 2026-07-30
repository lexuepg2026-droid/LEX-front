import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getApiErrorMessage, getApiErrorField } from '../../utils/apiError';
import { maskCPF, maskCEP, maskPhone, unmask } from '../../utils/masks';
import { buscarEnderecoPorCEP } from '../../utils/viacep';
import { UFS } from '../../utils/enums';
import { toast } from '../../utils/toast';
import './RegisterPage.css';
import logo from '../../assets/logo-lex.jpeg';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL_FORM = {
  // Etapa 1 — acesso
  nomeCompleto: '', email: '', senha: '', confirmarSenha: '',
  // Etapa 2 — profissional
  cpf: '', telefone: '',
  oabNumero: '', oabEstado: '',
  advNome: '', advChavePix: '', advInstagram: '', advSite: '',
  // Etapa 2 — endereço
  cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '', pais: 'Brasil',
};

function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));
  const handleChange = (e) => setField(e.target.name, e.target.value);

  const handleMaskedChange = (mask) => (e) => setField(e.target.name, mask(e.target.value));

  const handleCepChange = async (e) => {
    const masked = maskCEP(e.target.value);
    setField('cep', masked);
    const digits = unmask(masked);
    if (digits.length === 8) {
      setCepLoading(true);
      const endereco = await buscarEnderecoPorCEP(digits);
      setCepLoading(false);
      if (endereco) {
        setForm((prev) => ({
          ...prev,
          logradouro: endereco.logradouro || prev.logradouro,
          bairro: endereco.bairro || prev.bairro,
          cidade: endereco.cidade || prev.cidade,
          estado: endereco.estado || prev.estado,
        }));
      }
    }
  };

  const validateStep1 = () => {
    if (!form.nomeCompleto.trim()) return 'Informe o nome completo.';
    if (!EMAIL_REGEX.test(form.email.trim())) return 'E-mail inválido.';
    if (form.senha.length < 8 || !/[a-zA-Z]/.test(form.senha) || !/\d/.test(form.senha)) {
      return 'A senha deve ter no mínimo 8 caracteres, com ao menos uma letra e um número.';
    }
    if (form.senha !== form.confirmarSenha) return 'As senhas não coincidem.';
    return null;
  };

  const handleContinue = (e) => {
    e.preventDefault();
    setError('');
    const stepError = validateStep1();
    if (stepError) {
      setError(stepError);
      return;
    }
    setStep(2);
  };

  const handleBack = () => {
    setError('');
    setStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      nomeCompleto: form.nomeCompleto.trim(),
      email: form.email.trim(),
      senha: form.senha,
      cpf: unmask(form.cpf),
      telefone: unmask(form.telefone) || undefined,
      oab: { numero: unmask(form.oabNumero), estado: form.oabEstado },
      advocacia: {
        nome: form.advNome.trim(),
        chavePix: form.advChavePix || undefined,
        instagram: form.advInstagram || undefined,
        site: form.advSite || undefined,
      },
      endereco: {
        cep: unmask(form.cep) || undefined,
        pais: form.pais || undefined,
        estado: form.estado || undefined,
        cidade: form.cidade || undefined,
        bairro: form.bairro || undefined,
        logradouro: form.logradouro || undefined,
        numero: form.numero || undefined,
        complemento: form.complemento || undefined,
      },
    };

    try {
      // O backend emite o cookie `lex-token` já no cadastro, e `register` do
      // AuthContext grava o usuário no estado. Daqui a advogada entra direto
      // no sistema — terminar o assistente e cair numa tela de login pedindo a
      // senha escolhida dois campos antes era o pior momento do fluxo.
      await register(payload);
      toast.success('Conta criada com sucesso. Bem-vinda ao LEX!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Erro ao criar conta. Verifique os dados.');
      setError(msg);

      // Volta para a etapa 1 só quando o campo problemático está lá (e-mail).
      // CPF/OAB ficam na etapa 2. Nada digitado é perdido em nenhum caso.
      //
      // A decisão vem de `campo`, enviado pelo backend junto do 409. O regex
      // na mensagem fica como fallback para rotas que ainda não devolvam o
      // campo — antes ele era o único critério, e qualquer reescrita do texto
      // da mensagem quebrava o roteamento sem ninguém perceber.
      const campo = getApiErrorField(err);
      if (campo) {
        if (campo === 'email') setStep(1);
      } else if (/mail/i.test(msg)) {
        setStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page register-wizard">
      <img src={logo} alt="Logo LEX" className="logo" />
      <h2>Criar Nova Conta</h2>
      <p className="wizard-progress">Etapa {step} de 2 — {step === 1 ? 'Acesso' : 'Dados profissionais'}</p>

      {/* `wizard-step` saiu das duas etapas: nunca teve regra em CSS nenhum. O
          que estiliza cada etapa é `wizard-step-narrow` (1) e `wizard-grid`
          (2), e a largura comum vem de `.register-page form`. */}
      {step === 1 && (
        <form onSubmit={handleContinue} className="wizard-step-narrow">
          <div className="form-group">
            <label>Nome completo*</label>
            <input type="text" name="nomeCompleto" value={form.nomeCompleto} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>E-mail*</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Senha* (mín. 8, com letra e número)</label>
            <input type="password" name="senha" value={form.senha} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Confirmar senha*</label>
            <input type="password" name="confirmarSenha" value={form.confirmarSenha} onChange={handleChange} required />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="btn-primary">Continuar</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleSubmit} className="wizard-grid">
          <h3 className="wizard-section-title">Dados profissionais</h3>

          <div className="form-group span-1">
            <label>CPF*</label>
            <input type="text" name="cpf" value={form.cpf} onChange={handleMaskedChange(maskCPF)}
                   placeholder="000.000.000-00" inputMode="numeric" required />
          </div>
          <div className="form-group span-1">
            <label>Telefone</label>
            <input type="tel" name="telefone" value={form.telefone} onChange={handleMaskedChange(maskPhone)}
                   placeholder="(00) 00000-0000" inputMode="numeric" />
          </div>

          <div className="form-group span-1">
            <label>Número da OAB*</label>
            <input type="text" name="oabNumero" value={form.oabNumero}
                   onChange={(e) => setField('oabNumero', unmask(e.target.value).slice(0, 6))}
                   inputMode="numeric" required />
          </div>
          <div className="form-group span-1">
            <label>UF da OAB*</label>
            <select name="oabEstado" value={form.oabEstado} onChange={handleChange} required>
              <option value="">Selecione…</option>
              {UFS.map((uf) => <option key={uf.value} value={uf.value}>{uf.label}</option>)}
            </select>
          </div>

          <div className="form-group span-2">
            <label>Nome da advocacia*</label>
            <input type="text" name="advNome" value={form.advNome} onChange={handleChange} maxLength={100} required />
          </div>
          <div className="form-group span-1">
            <label>Chave PIX</label>
            <input type="text" name="advChavePix" value={form.advChavePix} onChange={handleChange} maxLength={120} />
          </div>
          <div className="form-group span-1">
            <label>Instagram</label>
            <input type="text" name="advInstagram" value={form.advInstagram} onChange={handleChange} maxLength={50} />
          </div>
          <div className="form-group span-1">
            <label>Site</label>
            <input type="text" name="advSite" value={form.advSite} onChange={handleChange} maxLength={200} />
          </div>

          <h3 className="wizard-section-title">Endereço</h3>

          <div className="form-group span-1">
            <label>CEP {cepLoading && <span className="cep-hint">buscando…</span>}</label>
            <input type="text" name="cep" value={form.cep} onChange={handleCepChange}
                   placeholder="00000-000" inputMode="numeric" />
          </div>
          <div className="form-group span-2">
            <label>Logradouro</label>
            <input type="text" name="logradouro" value={form.logradouro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Número</label>
            <input type="text" name="numero" value={form.numero} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Complemento</label>
            <input type="text" name="complemento" value={form.complemento} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Bairro</label>
            <input type="text" name="bairro" value={form.bairro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Cidade</label>
            <input type="text" name="cidade" value={form.cidade} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>UF</label>
            <select name="estado" value={form.estado} onChange={handleChange}>
              <option value="">Selecione…</option>
              {UFS.map((uf) => <option key={uf.value} value={uf.value}>{uf.label}</option>)}
            </select>
          </div>
          <div className="form-group span-1">
            <label>País</label>
            <input type="text" name="pais" value={form.pais} onChange={handleChange} />
          </div>

          {error && <p className="error-message span-full">{error}</p>}

          <div className="wizard-actions span-full">
            <button type="button" onClick={handleBack} className="btn-cancel">Voltar</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Criando…' : 'Criar conta'}
            </button>
          </div>
        </form>
      )}

      <div className="register-links">
        <Link to="/login">Já tem uma conta? Faça o login</Link>
      </div>
    </div>
  );
}

export default RegisterPage;
