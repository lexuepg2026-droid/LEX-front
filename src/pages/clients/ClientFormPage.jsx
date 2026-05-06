import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './ClientPage.css';

function ClienteFormPage() {
  // 1. Novo estado para controlar o tipo de pessoa
  const [tipoPessoa, setTipoPessoa] = useState('fisica'); // 'fisica' ou 'juridica'
  
  // 2. Estado unificado para TODOS os campos
  const [formData, setFormData] = useState({
    // Pessoa
    email: '', telefone: '', cep: '', rua: '', num: '', complemento: '', bairro: '', cidade: '', estado: '', pais: '',
    // PessoaFisica
    nome_completo: '', cpf: '', sexo: '', data_nasc: '', profissao: '', nacionalidade: '', estado_civil: '',
    // PessoaJuridica
    cnpj: '', razao_social: '', nome_fantasia: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  // Efeito de busca (para edição)
  useEffect(() => {
    if (isEditing) {
      const fetchCliente = async () => {
        try {
          const response = await api.get(`/clientes/${id}`);
          const dados = response.data;
          
          setTipoPessoa(dados.tipo); // 'fisica' ou 'juridica'
          setFormData(dados); // Preenche todos os campos
        } catch (err) {
          setError('Falha ao carregar dados do cliente.');
        }
      };
      fetchCliente();
    }
  }, [id, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Prepara os dados para enviar (inclui o tipo)
    const dadosParaEnviar = {
      tipo_pessoa: tipoPessoa,
      ...formData
    };

    try {
      if (isEditing) {
        // (A rota PUT de edição também precisa ser refeita no back-end)
        // await api.put(`/clientes/${id}`, dadosParaEnviar);
      } else {
        await api.post('/clientes', dadosParaEnviar);
      }
      setLoading(false);
      navigate('/dashboard/clientes');
    } catch (err) {
      setLoading(false);
      setError('Erro ao salvar cliente. Verifique os dados.');
      console.error(err);
    }
  };

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">{isEditing ? 'Editar Cliente' : 'Registrar Novo Cliente'}</h1>
      
      {/* --- SELETOR DE TIPO --- */}
      {!isEditing && (
        <div className="form-group tipo-pessoa-seletor">
          <label>Tipo de Pessoa:</label>
          <div className="radio-group">
            <input type="radio" id="tipo_fisica" name="tipo_pessoa" value="fisica" 
                   checked={tipoPessoa === 'fisica'} onChange={() => setTipoPessoa('fisica')} />
            <label htmlFor="tipo_fisica">Pessoa Física</label>
            
            <input type="radio" id="tipo_juridica" name="tipo_pessoa" value="juridica" 
                   checked={tipoPessoa === 'juridica'} onChange={() => setTipoPessoa('juridica')} />
            <label htmlFor="tipo_juridica">Pessoa Jurídica</label>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="data-form">
        
        {/* --- CAMPOS DE PESSOA FÍSICA --- */}
        {tipoPessoa === 'fisica' && (
          <div className="form-grid section">
            <h3>Dados Pessoais</h3>
            <div className="form-group span-2">
              <label>Nome Completo*</label>
              <input type="text" name="nome_completo" value={formData.nome_completo} onChange={handleChange} required />
            </div>
            <div className="form-group span-1">
              <label>CPF*</label>
              <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} required />
            </div>
            <div className="form-group span-1">
              <label>Data Nasc.</label>
              <input type="date" name="data_nasc" value={formData.data_nasc} onChange={handleChange} />
            </div>
            <div className="form-group span-1">
              <label>Sexo</label>
              <input type="text" name="sexo" value={formData.sexo} onChange={handleChange} />
            </div>
            <div className="form-group span-1">
              <label>Estado Civil</label>
              <input type="text" name="estado_civil" value={formData.estado_civil} onChange={handleChange} />
            </div>
            <div className="form-group span-1">
              <label>Nacionalidade</label>
              <input type="text" name="nacionalidade" value={formData.nacionalidade} onChange={handleChange} />
            </div>
            <div className="form-group span-2">
              <label>Profissão</label>
              <input type="text" name="profissao" value={formData.profissao} onChange={handleChange} />
            </div>
          </div>
        )}

        {/* --- CAMPOS DE PESSOA JURÍDICA --- */}
        {tipoPessoa === 'juridica' && (
          <div className="form-grid section">
            <h3>Dados Empresariais</h3>
            <div className="form-group span-1">
              <label>CNPJ*</label>
              <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} required />
            </div>
            <div className="form-group span-2">
              <label>Razão Social*</label>
              <input type="text" name="razao_social" value={formData.razao_social} onChange={handleChange} required />
            </div>
            <div className="form-group span-3">
              <label>Nome Fantasia</label>
              <input type="text" name="nome_fantasia" value={formData.nome_fantasia} onChange={handleChange} />
            </div>
          </div>
        )}

        {/* --- CAMPOS COMUNS (CONTATO) --- */}
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

        {/* --- CAMPOS COMUNS (ENDEREÇO) --- */}
        <div className="form-grid section">
          <h3>Endereço</h3>
          <div className="form-group span-1">
            <label>CEP</label>
            <input type="text" name="cep" value={formData.cep} onChange={handleChange} />
          </div>
          <div className="form-group span-2">
            <label>Rua</label>
            <input type="text" name="rua" value={formData.rua} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Número</label>
            <input type="text" name="num" value={formData.num} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Bairro</label>
            <input type="text" name="bairro" value={formData.bairro} onChange={handleChange} />
          </div>
          <div className="form-group span-1">
            <label>Complemento</label>
            <input type="text" name="complemento" value={formData.complemento} onChange={handleChange} />
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