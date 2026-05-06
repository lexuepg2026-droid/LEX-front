import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './ClientPage.css';

function ClienteListPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        setLoading(true);
        const response = await api.get('/clientes'); 
        setClientes(response.data);
        setLoading(false);
      } catch (err) {
        setError('Falha ao buscar clientes.');
        console.error(err);
        setLoading(false);
      }
    };
    fetchClientes();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente? Isso não será possível se ele tiver processos vinculados.')) {
      try {
        await api.delete(`/clientes/${id}`);
        setClientes(clientes.filter(cliente => cliente.pessoa_id !== id));
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao excluir cliente.');
      }
    }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="cliente-page-container">
      <h1 className="page-title">Clientes Registrados</h1>
      {error && <p className="error-message">{error}</p>}
      
      {/* Tabela com scroll horizontal */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome / Razão Social</th>
              <th>CPF / CNPJ</th>
              <th>Tipo</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Endereço</th>
              <th>Nacionalidade</th>
              <th>Profissão</th>
              <th>Est. Civil</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan="10">Nenhum cliente cadastrado.</td>
              </tr>
            ) : (
              clientes.map(cliente => (
                <tr key={cliente.pessoa_id}>
                  {/* Usa os nomes de dados corrigidos */}
                  <td>{cliente.nome}</td>
                  <td>{cliente.cpf_cnpj}</td>
                  <td>{cliente.tipo_pessoa}</td>
                  <td>{cliente.email}</td>
                  <td>{cliente.telefone}</td>
                  {/* Combina o endereço em um campo */}
                  <td>
                    {cliente.rua || ''} {cliente.num || ''}, {cliente.bairro || ''} - {cliente.cidade || ''} ({cliente.estado || ''})
                  </td>
                  <td>{cliente.nacionalidade}</td>
                  <td>{cliente.profissao}</td>
                  <td>{cliente.estado_civil}</td>
                  <td className="actions-cell">
                    <Link to={`/dashboard/clientes/editar/${cliente.pessoa_id}`} className="btn-action btn-edit">Editar</Link>
                    <button onClick={() => handleDelete(cliente.pessoa_id)} className="btn-action btn-delete">Excluir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ClienteListPage;