import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import './ProcessPage.css';

function ProcessoListPage() {
  const [processos, setProcessos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProcessos = async () => {
      try {
        setLoading(true);
        const response = await api.get('/processos'); 
        setProcessos(response.data);
        setLoading(false);
      } catch (err) {
        setError('Falha ao buscar processos.');
        console.error(err);
        setLoading(false);
      }
    };
    fetchProcessos();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este processo?')) {
      try {
        await api.delete(`/processos/${id}`);
        setProcessos(processos.filter(p => p.processo_id !== id));
      } catch (err) {
        setError('Erro ao excluir processo. Verifique se ele possui parcelas ou documentos.');
      }
    }
  };

  const formatarData = (dataISO) => {
    if (!dataISO) return 'N/A';
    try {
      return new Date(dataISO).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    } catch (e) { return 'Data Inválida'; }
  };

  if (loading) return <p>Carregando...</p>;

  return (
    <div className="page-container">
      <h1 className="page-title">Processos Registrados</h1>
      {error && <p className="error-message">{error}</p>}
      <table className="data-table">
        <thead>
          <tr>
            <th>Título do Caso</th>
            <th>Nº do Processo</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Data Abertura</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {processos.length === 0 ? (
            <tr>
              <td colSpan="6">Nenhum processo cadastrado.</td>
            </tr>
          ) : (
            processos.map(p => (
              <tr key={p.processo_id}>
                <td>{p.titulo_caso}</td>
                <td>{p.numero_processo}</td>
                <td>{p.nome_cliente}</td>
                <td>{p.status_processo}</td>
                <td>{formatarData(p.data_emissao)}</td>
                <td className="actions-cell">
                  {/* ***** MUDANÇA AQUI ***** */}
                  {/* Este link agora leva para a página de Detalhes/Financeiro */}
                  <Link to={`/dashboard/processos/detalhe/${p.processo_id}`} className="btn-action btn-edit">
                    Gerenciar
                  </Link>
                  <button onClick={() => handleDelete(p.processo_id)} className="btn-action btn-delete">Excluir</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ProcessoListPage;