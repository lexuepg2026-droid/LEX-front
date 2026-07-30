import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import clientService from '../../api/clientService';
import { formatCPF, formatCNPJ, formatPhone, formatCEP, formatDate } from '../../utils/formatters';
import { labelDe, SEXO_OPTIONS, ESTADO_CIVIL_OPTIONS } from '../../utils/enums';
import { getApiErrorMessage } from '../../utils/apiError';
import './ClientPage.css';

function ClientDetailPage() {
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        const response = await clientService.getClientById(id);
        setCliente(response.data);
      } catch (err) {
        // A mensagem fixa dizia "Cliente não encontrado" também em 500 e em
        // queda de rede, e custava tempo de diagnóstico. O genérico fica só
        // como fallback de quando o servidor não manda mensagem nenhuma.
        setError(getApiErrorMessage(err, 'Não foi possível carregar o cliente.'));
      } finally {
        setLoading(false);
      }
    };
    fetchCliente();
  }, [id]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="error-message">{error}</p>;

  const {
    tipoPessoa, nomeCompleto, cpf,
    rg, dataNascimento, sexo, estadoCivil, profissao, nacionalidade,
    razaoSocial, nomeFantasia, cnpj, representanteLegal,
    email, telefone, endereco, observacoes
  } = cliente;

  const temRepresentante = Boolean(
    representanteLegal && (representanteLegal.nome || representanteLegal.cpf || representanteLegal.cargo)
  );

  return (
    <div className="cliente-page-container">
      <div className="page-header">
        <h1 className="page-title">Detalhe do Cliente</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to={`/dashboard/clientes/editar/${id}`} className="btn-action btn-edit">Editar</Link>
          <button onClick={() => navigate('/dashboard/clientes')} className="btn-action btn-view">Voltar</button>
        </div>
      </div>

      <div className="detail-section">
        <h3>{tipoPessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}</h3>
        {tipoPessoa === 'fisica' ? (
          <>
            <p><strong>Nome Completo:</strong> {nomeCompleto || '—'}</p>
            <p><strong>CPF:</strong> {formatCPF(cpf)}</p>
            <p><strong>RG:</strong> {rg || '—'}</p>
            <p><strong>Data de Nascimento:</strong> {formatDate(dataNascimento)}</p>
            <p><strong>Sexo:</strong> {labelDe(SEXO_OPTIONS, sexo)}</p>
            <p><strong>Estado Civil:</strong> {labelDe(ESTADO_CIVIL_OPTIONS, estadoCivil)}</p>
            <p><strong>Profissão:</strong> {profissao || '—'}</p>
            <p><strong>Nacionalidade:</strong> {nacionalidade || '—'}</p>
          </>
        ) : (
          <>
            <p><strong>Razão Social:</strong> {razaoSocial || '—'}</p>
            <p><strong>Nome Fantasia:</strong> {nomeFantasia || '—'}</p>
            <p><strong>CNPJ:</strong> {formatCNPJ(cnpj)}</p>
          </>
        )}
      </div>

      {tipoPessoa === 'juridica' && temRepresentante && (
        <div className="detail-section">
          <h3>Representante Legal</h3>
          <p><strong>Nome:</strong> {representanteLegal.nome || '—'}</p>
          <p><strong>CPF:</strong> {formatCPF(representanteLegal.cpf)}</p>
          <p><strong>Cargo:</strong> {representanteLegal.cargo || '—'}</p>
        </div>
      )}

      <div className="detail-section">
        <h3>Contato</h3>
        <p><strong>Email:</strong> {email || '—'}</p>
        <p><strong>Telefone:</strong> {formatPhone(telefone)}</p>
      </div>

      {endereco && Object.values(endereco).some(Boolean) && (
        <div className="detail-section">
          <h3>Endereço</h3>
          {endereco.logradouro && <p><strong>Logradouro:</strong> {endereco.logradouro}{endereco.numero ? `, nº ${endereco.numero}` : ''}</p>}
          {endereco.complemento && <p><strong>Complemento:</strong> {endereco.complemento}</p>}
          {endereco.bairro && <p><strong>Bairro:</strong> {endereco.bairro}</p>}
          {(endereco.cidade || endereco.estado) && (
            <p><strong>Cidade/Estado:</strong> {[endereco.cidade, endereco.estado].filter(Boolean).join('/')}</p>
          )}
          {endereco.cep && <p><strong>CEP:</strong> {formatCEP(endereco.cep)}</p>}
          {endereco.pais && <p><strong>País:</strong> {endereco.pais}</p>}
        </div>
      )}

      {observacoes && (
        <div className="detail-section">
          <h3>Observações</h3>
          <p>{observacoes}</p>
        </div>
      )}
    </div>
  );
}

export default ClientDetailPage;
