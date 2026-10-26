import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Copy } from 'lucide-react';
import processService from '../../api/processService';
import { toast } from '../../utils/toast';
import {
  FASE_PROCESSO_OPTIONS,
  PAPEL_PROCESSO_OPTIONS,
  labelDe,
  nomeDoCliente,
  rotuloDaFase,
} from '../../utils/enums';
import { rotuloDoStatus, tomDoStatus } from '../../utils/statusVisual';
import { documentoFormatado } from '../../utils/clienteLabel.js';
import { getApiErrorMessage } from '../../utils/apiError';
import StatusBadge from '../../components/ui/StatusBadge';
import ActionMenu from '../../components/ui/ActionMenu';
import Modal from '../../components/ui/Modal';
import AccessDelivery from '../../components/processes/AccessDelivery';
import LiberacaoPortal from '../../components/processes/LiberacaoPortal';
import ProcessFinancialSheet from '../../components/financeiro/ProcessFinancialSheet';
import ProcessTimeline from '../../components/processes/ProcessTimeline';
import {
  classeDaBolinha,
  deveMarcarComoVistas,
  situacaoNoPortal,
} from '../../components/processes/detalheProcesso.js';
import useLinhaClicavel from '../../components/financeiro/useLinhaClicavel';
import Loading from '../../components/common/Loading';
import OfflineNotice from '../../components/ui/OfflineNotice';
import OfflineWriteReason from '../../components/ui/OfflineWriteReason';
import OfflineQueueNotice from '../../components/ui/OfflineQueueNotice';
import { useOutbox } from '../../contexts/OutboxContext';
import { MENSAGEM_ALTERACAO_NAO_ENVIADA } from '../../offline/outboxMessages';
import { blockReason } from '../../offline/offlineMessages';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import useDesativacaoProcesso from '../../hooks/useDesativacaoProcesso';
import './ProcessPage.css';
import './ProcessDetailPage.css';
import ProcessoTabs from './ProcessTabs';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';
import { usePublicarContexto } from '../../contexts/ContextoContext';

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

// ═══════════════════════════════════════════════════════════════════════════
// O DETALHE DO PROCESSO — Fase 3.3b (DEC-111), no desenho da Raniele
//
// Cabeçalho de identidade e seções em balões, como em `ProcessosDetalhes.jsx`
// dela. O CONTEÚDO continua o nosso (inventário 3.15): a mudança de fase com
// motivo e fila offline, as confirmações de leitura, a linha do tempo, a ficha
// com os botões de lançamento (DEC-087), a entrega de acesso e a liberação no
// portal (DEC-097). **Nada do financeiro em modal** — o reparcelamento continua
// em rota própria (DEC-049).
//
// A ordem dos balões: dados, participantes, fase e linha do tempo,
// confirmações e ficha financeira. Os documentos são a aba "Documentos", a
// lista filtrada — a página nunca teve seção própria de documentos.
// ═══════════════════════════════════════════════════════════════════════════
function ProcessoDetalhePage() {

  // Participantes vêm de `GET /processes/:id/clientes`, e NÃO do array
  // `participantes` que `GET /processes/:id` já devolve.
  //
  // As duas projeções são deliberadamente diferentes: a do detalhe do processo
  // traz `{ _id, clienteId, papel, principal }`, e só a listagem dedicada
  // carrega `estadoPortal`, `ultimoAcessoPortal` e `ultimaConfirmacaoEm`.
  // Como esta tela precisa do estado do portal por pessoa, é a dedicada que
  // ela consulta. O contrato da 3.1 não foi alterado.
  const [participantesPortal, setParticipantesPortal] = useState([]);
  // Fase 3.3b (DEC-111): saber se a lista CHEGOU. Ela não tem espelho local;
  // sem ela a situação do portal é "não sei", e não "sem acesso".
  const [portalCarregado, setPortalCarregado] = useState(false);

  // Painel de entrega aberto, por clienteId. Um de cada vez: o código é o dado
  // mais sensível desta tela, e manter vários abertos é print de tela com o
  // acesso de todo mundo.
  const [entregaAberta, setEntregaAberta] = useState(null);

  const [confirmacoes, setConfirmacoes] = useState(null);
  const [carregandoConfirmacoes, setCarregandoConfirmacoes] = useState(false);
  const confirmacoesMarcadas = useRef(false);

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
  const seletorDeFase = useRef(null);

  const { id } = useParams();
  const navigate = useNavigate();
  // DEC-052 no detalhe (Fase 3.4, DEC-117): o MESMO hook da lista — a prévia
  // antes da confirmação, os mesmos textos. O detalhe só abre processo ativo:
  // desativado, a casa dele é a lista, onde o "Reativar" mora.
  const depoisDeDesativar = useCallback(({ acao, recusado }) => {
    if (!recusado && acao === 'desativar') navigate('/dashboard/processos');
  }, [navigate]);
  const desativacao = useDesativacaoProcesso({ aoConcluir: depoisDeDesativar });
  const clicarNaLinha = useLinhaClicavel();
  // Fase 2b (DEC-085): publica para a faixa de contexto o processo. Fase 3.3b
  // (DEC-109): o aviso de idade é o desta tela, do mesmo processo — a faixa
  // não repete.
  usePublicarContexto({ processoId: id, avisoProprio: true });
  const online = useOnlineStatus();
  const { entradas } = useOutbox();
  // Só a pendência DESTE processo: a fila é do aparelho inteiro, e avisar aqui
  // sobre a fase de outro processo faria o aviso perder o sentido.
  const fasePendente = entradas.some(
    (e) => e.operacao === 'mudarFase' && String(e.url).includes(String(id))
  );

  // ── DEC-058 (F-5a): o processo que ela já abriu continua legível ────────
  //
  // A mensagem de erro continua saindo do helper — `useCachedResource` chama
  // `getApiErrorMessage` por dentro com este mesmo fallback, e o genérico só
  // aparece quando o servidor não manda mensagem nenhuma.
  //
  // **O que NÃO tem espelho local nesta tela**, e é decisão: os participantes
  // com estado de portal, as confirmações de leitura e a ficha financeira
  // (`ProcessFinancialSheet`). Sem sinal, o processo aparece e esses blocos
  // ficam vazios — o que se perde é o selo do portal e os números da ficha, e
  // o que se ganha é não guardar, por precaução, o que ela não pediu para ver.
  const {
    data: processo, loading, error, updatedAt, fromCache, reload
  } = useCachedResource({
    resource: 'process',
    params: { id },
    fetcher: () => processService.getProcessById(id).then((res) => res.data),
    fallbackError: 'Falha ao carregar dados do processo.'
  });

  // O seletor de fase acompanha o processo carregado. Era um `setFaseEscolhida`
  // dentro do `.then` do carregamento; com o espelho local o dado pode chegar
  // do banco do navegador, e o seletor precisa acompanhar os dois caminhos.
  useEffect(() => {
    if (processo) setFaseEscolhida(processo.fase ?? '');
  }, [processo]);

  useEffect(() => {
    let ativo = true;
    setPortalCarregado(false);
    processService
      .listProcessClientes(id)
      .then((res) => {
        if (!ativo) return;
        const lista = res.data.data ?? res.data;
        setParticipantesPortal(Array.isArray(lista) ? lista : []);
        setPortalCarregado(true);
      })
      .catch(() => {
        // Falha aqui não derruba a tela: o processo e os dados dele continuam
        // legíveis, e o que se perde é o selo de portal por participante. O
        // erro do processo em si já tem tratamento acima.
        if (ativo) setParticipantesPortal([]);
      });
    return () => { ativo = false; };
  }, [id]);

  // ── Passo 97 (DEC-112): marcar como vistas DEPOIS de a lista aparecer ────
  //
  // Até a 3.3a a marcação ia no mesmo `async` que buscava a lista, logo depois
  // do `setConfirmacoes` — antes de o React pintar. Agora é um efeito: roda
  // depois do render que pôs a lista na tela, uma vez por abertura, e só se há
  // o que marcar. O Início continua levando à ficha; abrir a ficha não marca
  // nada sem a advogada pedir a lista.
  useEffect(() => {
    if (!deveMarcarComoVistas(confirmacoes, confirmacoesMarcadas.current)) return;
    confirmacoesMarcadas.current = true;
    processService.marcarConfirmacoesVistas(id).catch((err) => {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível marcar as confirmações como vistas.'));
    });
  }, [confirmacoes, id]);

  // Abrir o histórico é o ato de "olhar", e é ele que marca as confirmações
  // como vistas — por processo, como o backend expõe. Zerar o contador sem a
  // advogada ter aberto nada seria mentira; marcar uma a uma exigiria que ela
  // clicasse em cada registro para o número baixar.
  const abrirConfirmacoes = async () => {
    // Abrir a lista MARCA as confirmações como vistas — é leitura e escrita no
    // mesmo gesto, e por isso ela inteira fica indisponível sem sinal.
    if (!online) return;
    setCarregandoConfirmacoes(true);
    try {
      const res = await processService.listProcessConfirmacoes(id);
      const lista = res.data.data ?? res.data;
      setConfirmacoes(Array.isArray(lista) ? lista : []);
    } catch (err) {
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível carregar as confirmações.'));
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
  // ── A MUDANÇA DE FASE GRAVA SEM SINAL (F-5b, DEC-059) ─────────────────
  //
  // É a outra exceção da fase: a fase vale por si e não depende de nenhum
  // estado do servidor que o aparelho offline não possa conferir. Sem sinal, o
  // interceptor enfileira em vez de recusar — e a `versaoVista` viaja junto,
  // para o servidor recusar a gravação atrasada em vez de empurrar para o
  // histórico uma transição que parte de uma fase que já não é a atual.
  const salvarFase = async () => {
    setSalvandoFase(true);
    try {
      const { data } = await processService.mudarFase(id, {
        versaoVista: processo?.updatedAt ?? null,
        fase: faseEscolhida,
        // Opcional. Vazio não é enviado, e a transição acontece igual —
        // *"não precisa anotar o porquê, só se ela quiser mesmo"*.
        motivo: motivoFase,
      });
      setFaseEscolhida(data.fase ?? '');
      // Refaz a leitura: é ela que atualiza a tela E o espelho local, de uma
      // fonte só. Escrever o resultado do PATCH direto no estado deixaria o
      // dado guardado desatualizado até a próxima visita.
      reload();
      // O motivo é da TRANSIÇÃO, e a transição acabou: deixá-lo no campo faria
      // a próxima mudança herdar a justificativa da anterior.
      setMotivoFase('');
      toast.success(`Fase alterada para ${rotuloDaFase(data.fase)}.`);
    } catch (err) {
      if (err?.enfileirado) {
        // Não é erro: o que ela pediu está guardado e sobe sozinho. O motivo
        // volta a ficar vazio como voltaria num sucesso — ele é da transição,
        // e a transição foi registrada (na fila).
        setMotivoFase('');
        toast.info(err.message);
        return;
      }
      if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível mudar a fase do processo.'));
    } finally {
      setSalvandoFase(false);
    }
  };

  // ── O ⋮ do cabeçalho (DEC-111) ───────────────────────────────────────────
  // Reúne as ações que já existiam na tela e na lista: editar, mudar a fase
  // (leva ao seletor, no balão da fase) e desativar.
  const irParaAFase = () => {
    // Depois de o menu fechar: o foco vai ao seletor, e não volta ao ⋮.
    requestAnimationFrame(() => {
      seletorDeFase.current?.scrollIntoView({ block: 'center' });
      seletorDeFase.current?.focus();
    });
  };

  const copiarNumero = async (numero) => {
    try {
      await navigator.clipboard.writeText(numero);
      toast.success('Número do processo copiado.');
    } catch {
      toast.error('Não foi possível copiar. Selecione o número e copie à mão.');
    }
  };

  // Padrão de carregamento do projeto (varredura B.5 da Fase 4.3): era um
  // <p> escrito à mão, sem o spinner que todas as outras telas usam.
  if (loading) return <Loading />;
  if (error) return <p className="error-message">{error}</p>;
  if (!processo) return null;

  const participantes = processo.participantes ?? [];

  // Fase 2.5: a liberação mudou (pelo interruptor ou pela entrega). A lista
  // de participantes acompanha sem recarregar — o servidor já confirmou.
  const marcarLiberacao = (clienteId, valor) =>
    setParticipantesPortal((atual) =>
      atual.map((v) =>
        String(v.clienteId?._id ?? v.clienteId) === clienteId ? { ...v, liberadoNoPortal: valor } : v
      )
    );

  // Estado de portal por clienteId, para casar com a lista já renderizada.
  const portalPorCliente = new Map(
    participantesPortal.map((v) => [
      String(v.clienteId?._id ?? v.clienteId),
      v,
    ])
  );

  const formatarData = (d) =>
    d ? new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';

  const motivoSemSinal = blockReason(null, { online });

  // Os dados cadastrais, na ordem do formulário. Os curtos aparecem sempre,
  // com "—" quando vazios (como no desenho dela); os de texto livre, só quando
  // existem.
  const dados = [
    ['Tipo de ação', processo.tipoAcao],
    ['Área', processo.area],
    ['Distribuído em', processo.dataDistribuicao ? formatarData(processo.dataDistribuicao) : null],
    ['Órgão', processo.orgao],
    ['Vara', processo.vara],
    ['Comarca', processo.comarca],
  ];

  return (
    <div className="page-container processo-detalhe">
      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}
      {!online && <OfflineWriteReason />}

      {/* ── O cabeçalho de identidade (DEC-111) ──────────────────────────
          A bolinha diz por cor o que o subtítulo diz por extenso: o status.
          O cliente NÃO está aqui — a faixa de contexto, logo acima, já o
          mostra (DEC-085). */}
      <section className="processo-balao processo-cabecalho" aria-labelledby="processo-titulo">
        <div className="processo-cabecalho__topo">
          <div className="processo-cabecalho__identidade">
            <span
              className={`processo-cabecalho__bolinha ${classeDaBolinha(tomDoStatus(processo.status))}`}
              aria-hidden="true"
            />
            <div className="processo-cabecalho__textos">
              <h1 id="processo-titulo" className="processo-cabecalho__titulo">
                {processo.titulo}
                {/* O selo da liminar aparece no detalhe como aparece na
                    listagem — mesma classe, mesma palavra, mesma cor. Dois
                    desenhos para o mesmo fato fariam a advogada duvidar se são
                    o mesmo fato. */}
                {processo.liminar === true && (
                  <span
                    className="tag-liminar processo-cabecalho__selo"
                    title={processo.liminarObservacao || 'Processo com liminar'}
                  >
                    Liminar
                  </span>
                )}
              </h1>
              {/* DEC-054: `status` e fase são dois eixos, e os dois aparecem.
                  "Suspenso" não é uma fase. */}
              <p className="processo-cabecalho__subtitulo">
                {rotuloDoStatus(processo.status)} · {rotuloDaFase(processo.fase)}
              </p>
              {processo.numeroProcesso && (
                <p className="processo-cabecalho__numero">
                  <span className="processo-cabecalho__numero-valor">Nº {processo.numeroProcesso}</span>
                  <button
                    type="button"
                    className="processo-cabecalho__copiar"
                    aria-label="Copiar o número do processo"
                    title="Copiar o número do processo"
                    onClick={() => copiarNumero(processo.numeroProcesso)}
                  >
                    <Copy size={16} aria-hidden="true" />
                  </button>
                </p>
              )}
            </div>
          </div>

          <ActionMenu
            rotulo={`Ações do processo ${processo.titulo}`}
            itens={[
              { rotulo: 'Editar', to: `/dashboard/processos/editar/${id}`, motivo: motivoSemSinal },
              // A fase grava sem sinal (vai para a fila): o item não bloqueia.
              { rotulo: 'Mudar fase', onSelecionar: irParaAFase },
              { rotulo: 'Desativar', destrutivo: true, motivo: motivoSemSinal, onSelecionar: () => desativacao.abrir(id, 'desativar') },
            ]}
          />
        </div>

        <ProcessoTabs processoId={id} />
      </section>

      <section className="processo-balao" aria-labelledby="secao-dados">
        <h2 id="secao-dados" className="processo-balao__titulo">Dados do processo</h2>
        <dl className="processo-dados">
          {dados.map(([rotulo, valor]) => (
            <div key={rotulo} className="processo-dados__item">
              <dt>{rotulo}</dt>
              <dd>{valor || '—'}</dd>
            </div>
          ))}
          {processo.descricao && (
            <div className="processo-dados__item processo-dados__item--largo">
              <dt>Descrição</dt>
              <dd>{processo.descricao}</dd>
            </div>
          )}
          {processo.observacoes && (
            <div className="processo-dados__item processo-dados__item--largo">
              <dt>Observações</dt>
              <dd>{processo.observacoes}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* ── Participantes (DEC-111): a lista no padrão da 3.2 ─────────────
          A linha inteira abre o cadastro do cliente, como o link do nome; ela
          não recebe foco — os alvos de Tab são o nome, o interruptor e o ⋮. */}
      <section className="processo-balao" aria-labelledby="secao-participantes">
        <h2 id="secao-participantes" className="processo-balao__titulo">
          Participantes <span className="processo-balao__total">({participantes.length})</span>
        </h2>
        {participantes.length === 0 ? (
          <p className="processo-balao__vazio">Nenhum cliente vinculado.</p>
        ) : (
          <ul className="participantes-detalhe">
            {participantes.map(p => {
              const cliente = p.clienteId;
              const clienteId = (cliente?._id ?? cliente)?.toString();
              const noPortal = portalPorCliente.get(clienteId);
              const situacao = situacaoNoPortal(noPortal, { carregado: portalCarregado });
              const nome = nomeDoCliente(cliente);
              const documento = documentoFormatado(cliente);
              const destino = `/dashboard/clientes/detalhe/${clienteId}`;
              return (
                <li key={clienteId} className="participante-linha">
                  <div className="participante-linha__dados" onClick={clicarNaLinha(destino)}>
                    <div className="participante-linha__quem">
                      <Link to={destino} className="link-interno participante-linha__nome">{nome}</Link>
                      {p.principal && <span className="participante-linha__principal">Principal</span>}
                      {documento && <span className="participante-linha__doc">{documento}</span>}
                    </div>

                    <span className="participante-linha__papel">
                      {labelDe(PAPEL_PROCESSO_OPTIONS, p.papel)}
                    </span>

                    {/* A situação NESTE processo, e embaixo o que a pessoa
                        fez no portal. Acessar e confirmar são coisas de força
                        muito diferente: abrir a página é automático, confirmar
                        é declaração. Por isso "acessou, não confirmou" fica em
                        amarelo. */}
                    <div className="participante-linha__portal">
                      {situacao ? (
                        <StatusBadge status={situacao} />
                      ) : (
                        <span className="participante-linha__nota">Situação no portal indisponível sem conexão.</span>
                      )}
                      {noPortal?.estadoPortal && (
                        <span className="participante-linha__estado">
                          <StatusBadge status={noPortal.estadoPortal} />
                          {noPortal.estadoPortal === 'confirmou' && noPortal.ultimaConfirmacaoEm && (
                            <span className="participante-linha__nota">em {dataHoraBR(noPortal.ultimaConfirmacaoEm)}</span>
                          )}
                          {noPortal.ultimoAcessoPortal && (
                            <span className="participante-linha__nota">último acesso: {dataHoraBR(noPortal.ultimoAcessoPortal)}</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Fase 2.5 (DEC-097): quem TEM portal (senha definida)
                        ganha o controle "Liberado no portal" deste processo.
                        Quem não tem não vê o controle — liberar sem senha não
                        abriria nada, e a entrega diz o que falta. */}
                    <div className="participante-linha__interruptor">
                      {noPortal?.temAcessoPortal && (
                        <LiberacaoPortal
                          processoId={id}
                          clienteId={clienteId}
                          nomeCliente={nome}
                          liberado={noPortal.liberadoNoPortal === true}
                          online={online}
                          onAlterado={(valor) => marcarLiberacao(clienteId, valor)}
                        />
                      )}
                    </div>

                    {/* A entrega de acesso GRAVA (gera código e senha
                        provisória): sem sinal o item fica anunciado como
                        desabilitado, com o motivo dentro dele (DEC-053). */}
                    <div className="participante-linha__acoes">
                      <ActionMenu
                        rotulo={`Ações de ${nome}`}
                        itens={[
                          { rotulo: 'Abrir o cadastro', to: destino },
                          {
                            rotulo: entregaAberta === clienteId ? 'Fechar entrega' : 'Entregar acesso',
                            motivo: motivoSemSinal,
                            onSelecionar: () => setEntregaAberta(entregaAberta === clienteId ? null : clienteId),
                          },
                        ]}
                      />
                    </div>
                  </div>

                  {entregaAberta === clienteId && (
                    <AccessDelivery
                      processoId={id}
                      clienteId={clienteId}
                      nomeCliente={nome}
                      nomeProcesso={processo.titulo}
                      online={online}
                      onLiberado={() => marcarLiberacao(clienteId, true)}
                      onFechar={() => setEntregaAberta(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── DEC-054 — ANDAMENTO: os dois eixos, lado a lado e separados ─────
          A Laís descreveu DUAS coisas, e a tela mostra as duas como duas:

            • a FASE — onde o processo está. Anda nos dois sentidos.
            • o ENCERRAMENTO — se acabou. Não é a quinta fase.

          Um processo em recursos e um processo transitado em julgado não estão
          em pontos diferentes da mesma régua, e uma tela que os pusesse no
          mesmo seletor obrigaria a advogada a escolher entre dizer onde o
          processo está e dizer que ele acabou. */}
      <section className="processo-balao" aria-labelledby="secao-andamento">
        <h2 id="secao-andamento" className="processo-balao__titulo">Fase e linha do tempo</h2>

        <div className="andamento-atual">
          <p>
            <strong>Fase atual:</strong> {rotuloDaFase(processo.fase)}
          </p>

          {/* A liminar é SINALIZADOR, não estado: ela não muda a fase e não é
              exigida por nada. A marcação, a observação e a data são editadas
              no formulário do processo, junto do resto do cadastro — aqui elas
              só são LIDAS, porque não geram histórico. O selo está no
              cabeçalho. */}
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
            ref={seletorDeFase}
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
          {/* Sem sinal, esta ação continua disponível — e o aviso diz o que
              vai acontecer com ela (F-5b). */}
          {!online && <OfflineQueueNotice />}
          {fasePendente && (
            <p className="andamento-detalhe">
              <Link to="/dashboard/pendencias">{MENSAGEM_ALTERACAO_NAO_ENVIADA}</Link>
            </p>
          )}
        </div>

        {/* ── A lista bruta do histórico de fases (F-2d) ─────────────────
            Existe porque, sem exibir o histórico, não há como a validação
            manual conferir que o `de → para` está sendo escrito. */}
        <h3 className="andamento-historico-titulo">Histórico de fases</h3>
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

        {/* DEC-056 — a linha do tempo. Em bloco próprio, e IRMÃ da ficha
            financeira, nunca dentro dela: as duas respondem perguntas
            diferentes, e é justamente por isso que o financeiro não entra na
            linha. Juntá-las faria uma tela que não responde nenhuma. */}
        <ProcessTimeline processoId={id} />
      </section>

      {/* ── Confirmações de leitura do portal ──────────────────────────────
          Sob demanda, e não carregado junto com a tela: abrir esta lista é o
          ato de "olhar", e é ele que marca as confirmações como vistas. Se
          viessem no carregamento, o contador do Início zeraria só por a
          advogada ter aberto o processo para ver outra coisa. */}
      <section className="processo-balao" id="confirmacoes" aria-labelledby="secao-confirmacoes">
        <h2 id="secao-confirmacoes" className="processo-balao__titulo">Confirmações de leitura do portal</h2>

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
              aria-disabled={online ? undefined : 'true'}
            >
              {carregandoConfirmacoes ? 'Carregando…' : 'Ver confirmações'}
            </button>
            {!online && <OfflineWriteReason />}
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
      </section>

      {/* ── Financeiro do processo (Fase 4.2) ────────────────────────────────
          Carregada junto com a tela, ao contrário das confirmações: ler a ficha
          não tem efeito colateral nenhum, e é a informação que a advogada abre
          o processo para ver. Os botões de lançamento levam às rotas (DEC-087),
          nunca a modais. */}
      <section className="processo-balao" aria-labelledby="secao-financeiro">
        <h2 id="secao-financeiro" className="processo-balao__titulo">Ficha financeira</h2>
        <ProcessFinancialSheet processoId={id} />
      </section>

      <Modal {...desativacao.propsDoModal} />
    </div>
  );
}

export default ProcessoDetalhePage;
