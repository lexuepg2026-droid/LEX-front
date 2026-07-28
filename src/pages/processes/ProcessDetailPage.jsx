import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import processService from '../../api/processService';
import { toast } from '../../utils/toast';
import {
  PAPEL_PROCESSO_OPTIONS,
  documentoDoCliente,
  labelDe,
  nomeDoCliente,
} from '../../utils/enums';
import './ProcessPage.css';
import './ProcessTabs.css';
import ProcessoTabs from './ProcessTabs';

function ProcessoDetalhePage() {
  const [processo, setProcesso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Códigos de acesso já buscados, por clienteId. Não vêm na listagem de
  // participantes de propósito — só são pedidos quando a advogada clica.
  const [codigos, setCodigos] = useState({});
  const [buscandoCodigo, setBuscandoCodigo] = useState(null);
  const { id } = useParams();

  useEffect(() => {
    const fetchProcesso = async () => {
      try {
        setLoading(true);
        const response = await processService.getProcessById(id);
        setProcesso(response.data);
      } catch (err) {
        setError('Falha ao carregar dados do processo.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProcesso();
  }, [id]);

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!processo) return null;

  const participantes = processo.participantes ?? [];
  const principal = participantes.find(p => p.principal);
  // `clientePrincipalId` é o campo derivado do processo; o participante
  // marcado como principal é a mesma pessoa. Usa o primeiro que existir.
  const clienteNome = nomeDoCliente(principal?.clienteId ?? processo.clientePrincipalId);

  const formatarData = (d) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';

  const copiarCodigo = async (clienteId) => {
    try {
      setBuscandoCodigo(clienteId);
      let codigo = codigos[clienteId];
      if (!codigo) {
        const response = await processService.getProcessClienteCodigoAcesso(id, clienteId);
        codigo = response.data.codigoAcesso;
        setCodigos(prev => ({ ...prev, [clienteId]: codigo }));
      }
      await navigator.clipboard.writeText(codigo);
      toast.success(`Código copiado: ${codigo}`);
    } catch (err) {
      // Área de transferência bloqueada (contexto não seguro, permissão
      // negada) não pode virar "falha ao buscar": o código pode ter vindo bem.
      const codigo = codigos[clienteId];
      if (codigo) {
        toast.error(`Não foi possível copiar. Código: ${codigo}`);
      } else {
        toast.error('Não foi possível obter o código de acesso.');
      }
      console.error(err);
    } finally {
      setBuscandoCodigo(null);
    }
  };

  return (
    <div className="page-container">
      <div className="detalhe-header">
        <div>
          <h1 className="page-title" style={{ border: 'none', margin: 0, padding: 0 }}>
            {processo.titulo}
          </h1>
          <span className="page-subtitle">
            Cliente principal: {clienteNome}
            {participantes.length > 1 ? ` (+${participantes.length - 1})` : ''}
            {processo.numeroProcesso ? ` | Nº: ${processo.numeroProcesso}` : ''}
          </span>
        </div>
        <Link to={`/dashboard/processos/editar/${id}`} className="btn-primary">
          Editar Processo
        </Link>
      </div>

      <div className="processo-detalhe-secao">
        <h3>Clientes do Processo ({participantes.length})</h3>
        {participantes.length === 0 ? (
          <p>Nenhum cliente vinculado.</p>
        ) : (
          <ul className="participantes-lista">
            {participantes.map(p => {
              const cliente = p.clienteId;
              const clienteId = (cliente?._id ?? cliente)?.toString();
              return (
                <li
                  key={clienteId}
                  className={`participante-item${p.principal ? ' participante-item--principal' : ''}`}
                >
                  <div className="participante-nome">
                    <strong>{nomeDoCliente(cliente)}</strong>
                    <span className="participante-doc">
                      {cliente?.tipoPessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      {documentoDoCliente(cliente) ? ` — ${documentoDoCliente(cliente)}` : ''}
                    </span>
                  </div>

                  <span className="participante-papel">
                    {labelDe(PAPEL_PROCESSO_OPTIONS, p.papel)}
                  </span>

                  {p.principal && <span className="participante-tag">Principal</span>}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => copiarCodigo(clienteId)}
                    disabled={buscandoCodigo === clienteId}
                  >
                    {buscandoCodigo === clienteId ? 'Copiando...' : 'Copiar código de acesso'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="processo-detalhe-secao">
        <h3>Dados do Processo</h3>
        <p><strong>Status:</strong> {processo.status}</p>
        {processo.tipoAcao && <p><strong>Tipo de Ação:</strong> {processo.tipoAcao}</p>}
        {processo.area && <p><strong>Área:</strong> {processo.area}</p>}
        {processo.dataDistribuicao && (
          <p><strong>Data de Distribuição:</strong> {formatarData(processo.dataDistribuicao)}</p>
        )}
        {processo.orgao && <p><strong>Órgão:</strong> {processo.orgao}</p>}
        {processo.vara && <p><strong>Vara:</strong> {processo.vara}</p>}
        {processo.comarca && <p><strong>Comarca:</strong> {processo.comarca}</p>}
        {processo.descricao && <p><strong>Descrição:</strong> {processo.descricao}</p>}
        {processo.observacoes && <p><strong>Observações:</strong> {processo.observacoes}</p>}
      </div>

      <ProcessoTabs processoId={id} />
    </div>
  );
}

export default ProcessoDetalhePage;
