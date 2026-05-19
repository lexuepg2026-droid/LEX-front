import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import clientService from '../../api/clientService';
import { toast } from '../../utils/toast';
import './ClientPage.css';

function ClienteFormPage() {
  const [tipoPessoa, setTipoPessoa] = useState('fisica');
  const [formData, setFormData] = useState({
    nomeCompleto: '', cpf: '',
    razaoSocial: '', nomeFantasia: '', cnpj: '',
    email: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', pais: '',
    observacoes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    if (!isEditing) return;
    const fetchCliente = async () => {
      try {
        const response = await clientService.getClientById(id);
        const d = response.data;
        setTipoPessoa(d.tipoPessoa);
        setFormData({
          nomeCompleto: d.nomeCompleto || '',
          cpf: d.cpf || '',
          razaoSocial: d.razaoSocial || '',
          nomeFantasia: d.nomeFantasia || '',
          cnpj: d.cnpj || '',
          email: d.email || '',
          telefone: d.telefone || '',
          cep: d.endereco?.cep || '',
          logradouro: d.endereco?.logradouro || '',
          numero: d.endereco?.numero || '',
          complemento: d.endereco?.complemento || '',
          bairro: d.endereco?.bairro || '',
          cidade: d.endereco?.cidade || '',
          estado: d.endereco?.estado || '',
          pais: d.endereco?.pais || '',
          observacoes: d.observacoes || ''
        });
      } catch (err) {
        setError('Falha ao carregar dados do cliente.');
      }
    };
    fetchCliente();
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endereco = {
      cep: formData.cep || undefined,
      logradouro: formData.logradouro || undefined,
      numero: formData.numero || undefined,
      complemento: formData.complemento || undefined,
      bairro: formData.bairro || undefined,
      cidade: formData.cidade || undefined,
      estado: formData.estado || undefined,
      pais: formData.pais || undefined,
    };

    const payload = {
      tipoPessoa,
      email: formData.email || undefined,
      telefone: formData.telefone || undefined,
      observacoes: formData.observacoes || undefined,
      endereco,
    };

    if (tipoPessoa === 'fisica') {
      payload.nomeCompleto = formData.nomeCompleto;
      payload.cpf = formData.cpf;
    } else {
      payload.razaoSocial = formData.razaoSocial;
      payload.nomeFantasia = formData.nomeFantasia;
      payload.cnpj = formData.cnpj;
    }

    try {
      if (isEditing) {
        await clientService.updateClient(id, payload);
      } else {
        await clientService.createClient(payload);
      }
      toast.success(isEditing ? 'Cliente atualizado com sucesso.' : 'Cliente cadastrado com sucesso.');
      navigate('/dashboard/clientes');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar cliente. Verifique os dados.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Cliente' : 'Registrar Novo Cliente'}</h1>

      {!isEditing && (
        <div className="form-group tipo-pessoa-seletor">
          <label>Tipo de Pessoa:</label>
          <div className="radio-group">
            <input type="radio" id="tipo_fisica" name="tipoPessoa" value="fisica"
                   checked={tipoPessoa === 'fisica'} onChange={() => setTipoPessoa('fisica')} />
            <label htmlFor="tipo_fisica">Pessoa Física</label>
            <input type="radio" id="tipo_juridica" name="tipoPessoa" value="juridica"
                   checked={tipoPessoa === 'juridica'} onChange={() => setTipoPessoa('juridica')} />
            <label htmlFor="tipo_juridica">Pessoa Jurídica</label>
          </div>
        </div>
      )}
      {isEditing && (
        <p className="tipo-pessoa-label">
          Tipo: <strong>{tipoPessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</strong>
        </p>
      )}

      <form onSubmit={handleSubmit} className="data-form">

        {tipoPessoa === 'fisica' && (
          <div className="form-grid section">
            <h3>Dados Pessoais</h3>
            <div className="form-group span-2">
              <label>Nome Completo*</label>
              <input type="text" name="nomeCompleto" value={formData.nomeCompleto} onChange={handleChange} required />
            </div>
            <div className="form-group span-1">
              <label>CPF* (somente números, 11 dígitos)</label>
              <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} required maxLength="11" />
            </div>
          </div>
        )}

        {tipoPessoa === 'juridica' && (
          <div className="form-grid section">
            <h3>Dados Empresariais</h3>
            <div className="form-group span-1">
              <label>CNPJ* (somente números, 14 dígitos)</label>
              <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} required maxLength="14" />
            </div>
            <div className="form-group span-2">
              <label>Razão Social*</label>
              <input type="text" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} required />
            </div>
            <div className="form-group span-3">
              <label>Nome Fantasia*</label>
              <input type="text" name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} required />
            </div>
          </div>
        )}

        <div className="form-grid section">
          <h3>Contato</h3>
          <div className="form-group span-2">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Telefone</label>
            <input type="tel" name="telefone" value={formData.telefone} onChange={handleChange} />
          </div>
        </div>

        <div className="form-grid section">
          <h3>Endereço</h3>
          <div className="form-group span-1">
            <label>CEP</label>
            <input type="text" name="cep" value={formData.cep} onChange={handleChange} />
          </div>
          <div className="form-group span-2">
            <label>Logradouro</label>
            <input type="text" name="logradouro" value={formData.logradouro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Número</label>
            <input type="text" name="numero" value={formData.numero} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Complemento</label>
            <input type="text" name="complemento" value={formData.complemento} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Bairro</label>
            <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Cidade</label>
            <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Estado (UF)</label>
            <input type="text" name="estado" value={formData.estado} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>País</label>
            <input type="text" name="pais" value={formData.pais} onChange={handleChange} />
          </div>
        </div>

        <div className="form-grid section">
          <h3>Observações</h3>
          <div className="form-group span-3">
            <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/clientes')} className="btn-cancel">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ClienteFormPage;
