import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './ProcessPage.css';

function ProcessoFormPage() {
  const [formData, setFormData] = useState({
    // O nome do campo aqui deve ser 'pessoa_id' para bater com o back-end
    pessoa_id: '', 
    titulo_caso: '',
    numero_processo: '',
    descricao_fato: '',
    status_processo: 'Ativo',
    data_emissao: '',
    valor: ''
  });
  const [clientes, setClientes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  // Efeito 1: Buscar a lista de CLIENTES para o dropdown
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const response = await api.get('/clientes');
        setClientes(response.data);
      } catch (err) {
        setError('Falha ao carregar a lista de clientes.');
      }
    };
    fetchClientes();
  }, []);

  // Efeito 2: Se estiver editando, busca os dados DO PROCESSO
  useEffect(() => {
    if (isEditing) {
      const fetchProcesso = async () => {
        try {
          const response = await api.get(`/processos/${id}`);
          setFormData(response.data);
        } catch (err) {
          setError('Falha ao carregar dados do processo.');
        }
      };
      fetchProcesso();
    }
  }, [id, isEditing]);

  // ***** A CORREÇÃO ESTÁ AQUI *****
  // O handleChange agora salva o valor do <select>
  // diretamente no campo 'pessoa_id' do estado.
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value // O 'name' do <select> agora é 'pessoa_id'
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await api.put(`/processos/${id}`, formData);
      } else {
        // O formData agora envia 'pessoa_id' corretamente
        await api.post('/processos', formData); 
      }
      setLoading(false);
      navigate('/dashboard/processos');
    } catch (err) {
      setLoading(false);
      if (err.response && err.response.status === 403) {
        setError('Erro de permissão. Verifique se o cliente selecionado é válido.');
      } else {
        setError('Erro ao salvar processo. Verifique os dados.');
      }
      console.error(err);
    }
  };

  return (
    <div className="page-container">
      <h1 className="page-title">{isEditing ? 'Editar Processo' : 'Registrar Novo Processo'}</h1>
      
      <form onSubmit={handleSubmit} className="data-form">
        <div className="form-grid">
          
          <div className="form-group span-3">
            <label htmlFor="pessoa_id">Cliente*</label>
            <select 
              id="pessoa_id" 
              name="pessoa_id" // <-- NOME CORRIGIDO
              value={formData.pessoa_id} // <-- Lendo do estado 'pessoa_id'
              onChange={handleChange} 
              required
            >
              <option value="">Selecione um cliente...</option>
              {/* CORRIGIDO: Adicionado 'key' prop para consertar o aviso do console */}
              {clientes.map(cliente => (
                <option key={cliente.pessoa_id} value={cliente.pessoa_id}>
                  {cliente.nome} (CPF/CNPJ: {cliente.cpf_cnpj})
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group span-2">
            <label htmlFor="titulo_caso">Título do Caso*</label>
            <input type="text" id="titulo_caso" name="titulo_caso" value={formData.titulo_caso} onChange={handleChange} required />
          </div>

          <div className="form-group span-1">
            <label htmlFor="numero_processo">Nº do Processo (CNJ ou interno)</label>
            <input type="text" id="numero_processo" name="numero_processo" value={formData.numero_processo} onChange={handleChange} />
          </div>

          <div className="form-group span-3">
            <label htmlFor="descricao_fato">Descrição / Fatos</label>
            <textarea id="descricao_fato" name="descricao_fato" value={formData.descricao_fato} onChange={handleChange} rows="5"></textarea>
          </div>

          <div className="form-group span-1">
            <label htmlFor="status_processo">Status*</label>
            <select id="status_processo" name="status_processo" value={formData.status_processo} onChange={handleChange} required>
              <option value="Ativo">Ativo</option>
              <option value="Em andamento">Em andamento</option>
              <option value="Arquivado">Arquivado</option>
              <option value="Encerrado">Encerrado</option>
            </select>
          </div>

          <div className="form-group span-1">
            <label htmlFor="data_emissao">Data de Emissão/Abertura</label>
            <input type="date" id="data_emissao" name="data_emissao" value={formData.data_emissao} onChange={handleChange} />
          </div>

          <div className="form-group span-1">
            <label htmlFor="valor">Valor da Causa (R$)</label>
            <input type="number" step="0.01" id="valor" name="valor" value={formData.valor} onChange={handleChange} />
          </div>
        </div>

        {error && <p className="error-message">{error}</p>}
        
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/dashboard/processos')} className="btn-cancel">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProcessoFormPage;