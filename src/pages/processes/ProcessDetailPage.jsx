import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import processService from '../../api/processService';
import { toast } from '../../utils/toast';
import {
  FASE_PROCESSO_OPTIONS,
  PAPEL_PROCESSO_OPTIONS,
  documentoDoCliente,
  labelDe,
  nomeDoCliente,
  rotuloDaFase,
} from '../../utils/enums';
import { getApiErrorMessage } from '../../utils/apiError';
import StatusBadge from '../../components/ui/StatusBadge';
import AccessDelivery from '../../components/processes/AccessDelivery';
import ProcessFinancialSheet from '../../components/financeiro/ProcessFinancialSheet';
import Loading from '../../components/common/Loading';
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

  // ── DEC-054 — a mudança de fase mora AQUI, e não no formulário ──────────
  //
  // Duas razões, e as duas são de contrato:
  //
  //   1. a fase tem rota própria (`PATCH /processes/:id/fase`) porque toda
  //      mudança grava histórico. O formulário salva por `PATCH /processes/:id`,
  //      que recusa o campo — misturar os dois faria um "Salvar" só disparar
  //      duas requisições com semânticas diferentes;
  //   2. o MOTIVO é da transição, não do processo. Num formulário de quinze
  //      campos ele pareceria mais um dado cadastral, e ela dispensou o
  //      "porquê" justamente por não querer preencher campo obrigatório.
  const [faseEscolhida, setFaseEscolhida] = useState('');
  const [motivoFase, setMotivoFase] = useState('');
  const [salvandoFase, setSalvandoFase] = useState(false);

  const { id } = useParams();

  useEffect(() => {
    const fetchProcesso = async () => {
      try {
        setLoading(true);
        const response = await processService.getProcessById(id);
        setProcesso(response.data);
        setFaseEscolhida(response.data.fase ?? '');
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

  // ── DEC-054: mudar a fase ────────────────────────────────────────────────
  //
  // Não há verificação de ordem aqui, e a ausência é a regra: *"sim, pode
  // voltar"*. Recursos vai para conhecimento sem encontrar um `if` no caminho,
  // e o botão fica habilitado para qualquer uma das quatro.
  //
  // A única coisa que o desabilita é `salvandoFase` — evitar o clique duplo,
  // que gravaria duas entradas iguais no histórico.
  const salvarFase = async () => {
    setSalvandoFase(true);
    try {
      const { data } = await processService.mudarFase(id, {
        fase: faseEscolhida,
        // Opcional. Vazio não é enviado, e a transição acontece igual —
        // *"não precisa anotar o porquê, só se ela quiser mesmo"*.
        motivo: motivoFase,
      });
      setProcesso(data);
      setFaseEscolhida(data.fase ?? '');
      // O motivo é da TRANSIÇÃO, e a transição acabou: deixá-lo no campo faria
      // a próxima mudança herdar a justificativa da anterior.
      setMotivoFase('');
      toast.success(`Fase alterada para ${rotuloDaFase(data.fase)}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível mudar a fase do processo.'));
    } finally {
      setSalvandoFase(false);
    }
  };

  // Padrão de carregamento do projeto (varredura B.5 da Fase 4.3): era um
  // <p> escrito à mão, sem o spinner que todas as outras telas usam.
  if (loading) return <Loading />;
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

      {/* ── DEC-054 — ANDAMENTO: os dois eixos, lado a lado e separados ─────
          A Laís descreveu DUAS coisas, e a tela mostra as duas como duas:

            • a FASE — onde o processo está. Anda nos dois sentidos.
            • o ENCERRAMENTO — se acabou. Não é a quinta fase.

          Um processo em recursos e um processo transitado em julgado não estão
          em pontos diferentes da mesma régua, e uma tela que os pusesse no
          mesmo seletor obrigaria a advogada a escolher entre dizer onde o
          processo está e dizer que ele acabou. */}
      <div className="processo-detalhe-secao">
        <h3>Andamento do processo</h3>

        <div className="andamento-atual">
          <p>
            <strong>Fase atual:</strong> {rotuloDaFase(processo.fase)}
            {/* O selo da liminar aparece no detalhe como aparece na listagem —
                mesma classe, mesma palavra, mesma cor. Dois desenhos para o
                mesmo fato fariam a advogada duvidar se são o mesmo fato. */}
            {processo.liminar === true && (
              <span
                className="tag-liminar andamento-selo"
                title={processo.liminarObservacao || 'Processo com liminar'}
              >
                Liminar
              </span>
            )}
          </p>

          {/* A liminar é SINALIZADOR, não estado: ela não muda a fase e não é
              exigida por nada. A marcação, a observação e a data são editadas
              no formulário do processo, junto do resto do cadastro — aqui elas
              só são LIDAS, porque não geram histórico. */}
          {processo.liminar === true && (
            <p className="andamento-detalhe">
              <strong>Liminar:</strong>{' '}
              {processo.liminarEm ? formatarData(processo.liminarEm) : 'sem data registrada'}
              {processo.liminarObservacao ? ` — ${processo.liminarObservacao}` : ''}
            </p>
          )}

          <p className="andamento-detalhe">
            <strong>Trânsito em julgado:</strong>{' '}
            {processo.transitoEmJulgadoEm ? (
              <>
                {formatarData(processo.transitoEmJulgadoEm)}
                {processo.motivoEncerramento ? ` — ${processo.motivoEncerramento}` : ''}
              </>
            ) : (
              'ainda não'
            )}
          </p>
        </div>

        {/* ── Mudar de fase ──────────────────────────────────────────────
            O seletor oferece AS QUATRO, sempre, sem ordem imposta e sem
            nenhuma desabilitada. *"Sim, pode voltar."* Se alguma opção
            aparecer bloqueada aqui, alguém inventou uma máquina de estados
            que a Laís não pediu. */}
        <div className="andamento-mudar">
          <label htmlFor="fase">Mudar a fase</label>
          <select
            id="fase"
            value={faseEscolhida}
            onChange={(e) => setFaseEscolhida(e.target.value)}
          >
            {FASE_PROCESSO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* OPCIONAL, e a etiqueta diz isso. *"Não precisa anotar o porquê,
              só se ela quiser mesmo."* Sem `required`, sem asterisco, e o
              botão salva com o campo vazio. */}
          <label htmlFor="motivoFase">Motivo (opcional)</label>
          <input
            type="text"
            id="motivoFase"
            value={motivoFase}
            placeholder="Só se quiser registrar por quê"
            maxLength={2000}
            onChange={(e) => setMotivoFase(e.target.value)}
          />

          <button
            type="button"
            className="btn-primary"
            onClick={salvarFase}
            disabled={salvandoFase || !faseEscolhida}
          >
            {salvandoFase ? 'Salvando…' : 'Mudar fase'}
          </button>
        </div>

        {/* ── A linha do tempo, em forma bruta (F-2d) ────────────────────
            A tela da linha do tempo é da F-2e. O que existe aqui é a LISTA do
            que já foi gravado — e ela existe agora porque, sem exibir o
            histórico, não há como a validação manual conferir que o `de → para`
            está sendo escrito. */}
        <h4 className="andamento-historico-titulo">Histórico de fases</h4>
        {(processo.historicoFase ?? []).length === 0 ? (
          <p className="andamento-detalhe">Nenhuma mudança de fase registrada.</p>
        ) : (
          <ul className="andamento-historico">
            {[...(processo.historicoFase ?? [])].reverse().map((h, i) => (
              <li key={`${h.data}-${i}`}>
                {/* `de: null` na primeira entrada — o processo nasceu nesta
                    fase, e não veio de nenhuma. Escrever "de —" ali seria
                    inventar uma origem. */}
                <strong>
                  {h.de ? `${rotuloDaFase(h.de)} → ${rotuloDaFase(h.para)}` : `Cadastrado em ${rotuloDaFase(h.para)}`}
                </strong>
                <span className="andamento-detalhe"> — {dataHoraBR(h.data)}</span>
                {h.motivo && <span className="andamento-motivo">{h.motivo}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="processo-detalhe-secao">
        <h3>Dados do Processo</h3>
        {/* DEC-054: `status` continua aqui, e continua sendo outra coisa. Não
            foi substituído pela fase — "suspenso" não é uma fase, e a listagem
            filtra por ele desde a Fase 2. */}
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

      {/* ── Financeiro do processo (Fase 4.2) ────────────────────────────────
          Carregada junto com a tela, ao contrário das confirmações: ler a ficha
          não tem efeito colateral nenhum, e é a informação que a advogada abre
          o processo para ver. As confirmações são sob demanda porque abri-las
          MARCA como vistas — aqui não há nada a marcar. */}
      <div className="processo-detalhe-secao">
        <h3>Financeiro</h3>
        <ProcessFinancialSheet processoId={id} />
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
