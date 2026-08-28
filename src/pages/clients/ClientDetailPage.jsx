import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import clientService from '../../api/clientService';
import { formatCPF, formatCNPJ, formatPhone, formatCEP, formatDate } from '../../utils/formatters';
import { labelDe, SEXO_OPTIONS, ESTADO_CIVIL_OPTIONS } from '../../utils/enums';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import './ClientPage.css';

function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const online = useOnlineStatus();

  // DEC-058: o detalhe que ela já abriu continua legível sem sinal, com a
  // idade do dado no topo. A mensagem de erro continua vindo do helper —
  // `useCachedResource` chama `getApiErrorMessage` por dentro, com este mesmo
  // fallback, e o genérico só aparece quando o servidor não manda mensagem.
  const { data: cliente, loading, error, updatedAt, fromCache } = useCachedResource({
    resource: 'client',
    params: { id },
    fetcher: () => clientService.getClientById(id).then((res) => res.data),
    fallbackError: 'Não foi possível carregar o cliente.'
  });

  // Padrão de carregamento do projeto (varredura B.5 da Fase 4.3): era um
  // <p> escrito à mão, sem o spinner que todas as outras telas usam.
  if (loading) return <Loading />;
  if (error) return <p className="error-message">{error}</p>;
  if (!cliente) return <p className="error-message">Não foi possível carregar o cliente.</p>;

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
          {/* Sem sinal, "Editar" continua visível e anunciado como
              desabilitado (DEC-053: `aria-disabled`, não `disabled` — o motivo
              precisa ser alcançável por quem depende de leitor de tela). */}
          {online ? (
            <Link to={`/dashboard/clientes/editar/${id}`} className="btn-action btn-edit">Editar</Link>
          ) : (
            <button
              type="button"
              className="btn-action btn-edit"
              aria-disabled="true"
              title={undefined}
              onClick={(e) => e.preventDefault()}
            >
              Editar
            </button>
          )}
          <button onClick={() => navigate('/dashboard/clientes')} className="btn-action btn-view">Voltar</button>
        </div>
      </div>

      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
      {!online && <OfflineWriteReason />}

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
