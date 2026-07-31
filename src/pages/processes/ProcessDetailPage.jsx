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
import { getApiErrorMessage } from '../../utils/apiError';
import StatusBadge from '../../components/ui/StatusBadge';
import AccessDelivery from '../../components/processes/AccessDelivery';
import './ProcessPage.css';
import './ProcessTabs.css';
import ProcessoTabs from './ProcessTabs';

// Data e hora no fuso do escritório. `ultimoAcessoPortal` e `dataHora` da
// confirmação são carimbos que a advogada pode precisar citar — deixá-los ao
// fuso do navegador faria o mesmo registro aparecer com horas diferentes em
// máquinas diferentes.
const dataHoraBR = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

function ProcessoDetalhePage() {
  const [processo, setProcesso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Participantes vêm de `GET /processes/:id/clientes`, e NÃO do array
  // `participantes` que `GET /processes/:id` já devolve.
  //
  // As duas projeções são deliberadamente diferentes: a do detalhe do processo
  // traz `{ _id, clienteId, papel, principal }`, e só a listagem dedicada
  // carrega `estadoPortal`, `ultimoAcessoPortal` e `ultimaConfirmacaoEm`.
  // Como esta tela precisa do estado do portal por pessoa, é a dedicada que
  // ela consulta. O contrato da 3.1 não foi alterado.
  const [participantesPortal, setParticipantesPortal] = useState([]);

  // Painel de entrega aberto, por clienteId. Um de cada vez: o código é o dado
  // mais sensível desta tela, e manter vários abertos é print de tela com o
  // acesso de todo mundo.
  const [entregaAberta, setEntregaAberta] = useState(null);

  const [confirmacoes, setConfirmacoes] = useState(null);
  const [carregandoConfirmacoes, setCarregandoConfirmacoes] = useState(false);
  const { id } = useParams();

  useEffect(() => {
    const fetchProcesso = async () => {
      try {
        setLoading(true);
        const response = await processService.getProcessById(id);
        setProcesso(response.data);
      } catch (err) {
        // A mensagem fixa dizia "Falha ao carregar dados do processo" também em
        // 500 e em queda de rede, e custava tempo de diagnóstico. O genérico
        // fica só como fallback de quando o servidor não manda mensagem.
        setError(getApiErrorMessage(err, 'Falha ao carregar dados do processo.'));
      } finally {
        setLoading(false);
      }
    };
    fetchProcesso();
  }, [id]);

  useEffect(() => {
    let ativo = true;
    processService
      .listProcessClientes(id)
      .then((res) => {
        if (!ativo) return;
        const lista = res.data.data ?? res.data;
        setParticipantesPortal(Array.isArray(lista) ? lista : []);
      })
      .catch(() => {
        // Falha aqui não derruba a tela: o processo e os dados dele continuam
        // legíveis, e o que se perde é o selo de portal por participante. O
        // erro do processo em si já tem tratamento acima.
        if (ativo) setParticipantesPortal([]);
      });
    return () => { ativo = false; };
  }, [id]);

  // Abrir o histórico é o ato de "olhar", e é ele que marca as confirmações
  // como vistas — por processo, como o backend expõe. Zerar o contador sem a
  // advogada ter aberto nada seria mentira; marcar uma a uma exigiria que ela
  // clicasse em cada registro para o número baixar.
  const abrirConfirmacoes = async () => {
    setCarregandoConfirmacoes(true);
    try {
      const res = await processService.listProcessConfirmacoes(id);
      const lista = res.data.data ?? res.data;
      setConfirmacoes(Array.isArray(lista) ? lista : []);
      await processService.marcarConfirmacoesVistas(id);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível carregar as confirmações.'));
    } finally {
      setCarregandoConfirmacoes(false);
    }
  };

  if (loading) return <p>Carregando...</p>;
  if (error) return <p className="error-message">{error}</p>;
  if (!processo) return null;

  const participantes = processo.participantes ?? [];
  const principal = participantes.find(p => p.principal);

  // Estado de portal por clienteId, para casar com a lista já renderizada.
  const portalPorCliente = new Map(
    participantesPortal.map((v) => [
      String(v.clienteId?._id ?? v.clienteId),
      v,
    ])
  );
  // `clientePrincipalId` é o campo derivado do processo; o participante
  // marcado como principal é a mesma pessoa. Usa o primeiro que existir.
  const clienteNome = nomeDoCliente(principal?.clienteId ?? processo.clientePrincipalId);

  const formatarData = (d) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';

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
              const noPortal = portalPorCliente.get(clienteId);
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

                  {/* Selo do portal, pelo `StatusBadge` que já serve 4 telas.
                      Acessar e confirmar são coisas de força muito diferente:
                      abrir a página é automático, confirmar é declaração. Por
                      isso "acessou, não confirmou" fica em amarelo. */}
                  {noPortal?.estadoPortal && (
                    <span className="participante-portal">
                      <StatusBadge status={noPortal.estadoPortal} />
                      {noPortal.estadoPortal === 'confirmou' && noPortal.ultimaConfirmacaoEm && (
                        <span className="participante-portal-data">
                          em {dataHoraBR(noPortal.ultimaConfirmacaoEm)}
                        </span>
                      )}
                      {noPortal.ultimoAcessoPortal && (
                        <span className="participante-portal-data">
                          último acesso: {dataHoraBR(noPortal.ultimoAcessoPortal)}
                        </span>
                      )}
                    </span>
                  )}

                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setEntregaAberta(entregaAberta === clienteId ? null : clienteId)
                    }
                  >
                    {entregaAberta === clienteId ? 'Fechar entrega' : 'Entregar acesso'}
                  </button>

                  {entregaAberta === clienteId && (
                    <AccessDelivery
                      processoId={id}
                      clienteId={clienteId}
                      nomeCliente={nomeDoCliente(cliente)}
                      nomeProcesso={processo.titulo}
                      onFechar={() => setEntregaAberta(null)}
                    />
                  )}
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

      {/* ── Confirmações de visualização ─────────────────────────────────────
          Sob demanda, e não carregado junto com a tela: abrir esta seção é o
          ato de "olhar", e é ele que marca as confirmações como vistas. Se
          viessem no carregamento, o contador do dashboard zeraria só por a
          advogada ter aberto o processo para ver outra coisa. */}
      <div className="processo-detalhe-secao">
        <h3>Confirmações de leitura</h3>

        {confirmacoes === null ? (
          <>
            <p className="confirmacao-ajuda">
              Cada confirmação é uma declaração do cliente de que leu as
              informações do processo, com data e hora. Abrir esta lista marca
              as confirmações deste processo como vistas.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={abrirConfirmacoes}
              disabled={carregandoConfirmacoes}
            >
              {carregandoConfirmacoes ? 'Carregando…' : 'Ver confirmações'}
            </button>
          </>
        ) : confirmacoes.length === 0 ? (
          <p className="confirmacao-ajuda">
            Nenhum participante confirmou a leitura ainda. Acessar o portal e
            confirmar são coisas diferentes — o selo de cada participante,
            acima, mostra quem já entrou.
          </p>
        ) : (
          <ul className="confirmacao-lista">
            {confirmacoes.map((c) => (
              <li key={c.id ?? c._id} className="confirmacao-item">
                <p className="confirmacao-cabecalho">
                  <strong>{nomeDoCliente(c.clienteId) || 'Participante'}</strong>
                  {' — '}
                  {dataHoraBR(c.dataHora)}
                </p>
                <p className="confirmacao-instantaneo">
                  Na ocasião: processo {c.instantaneo?.statusProcesso ?? '—'},{' '}
                  {c.instantaneo?.quantidadeDocumentos === 1
                    ? '1 documento visível'
                    : `${c.instantaneo?.quantidadeDocumentos ?? 0} documentos visíveis`}
                  .
                </p>
                {/* O texto que o cliente declarou. É o que a advogada mostraria
                    se precisasse demonstrar o que ele afirmou — guardá-lo e não
                    exibi-lo tornaria o registro inútil na hora que importa. */}
                {c.textoConfirmado && (
                  <details className="confirmacao-texto">
                    <summary>Ver o que o cliente declarou</summary>
                    <pre className="confirmacao-declaracao">{c.textoConfirmado}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProcessoTabs processoId={id} />
    </div>
  );
}

export default ProcessoDetalhePage;
