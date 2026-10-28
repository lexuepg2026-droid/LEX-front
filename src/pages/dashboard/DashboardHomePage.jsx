import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ChevronLeft, ChevronRight, HandCoins } from 'lucide-react';
import dashboardService from '../../api/dashboardService';
import financeiroService from '../../api/financeiroService';
import installmentService from '../../api/installmentService';
import calendarService from '../../api/calendarService';
import BlocoDoPainel from '../../components/dashboard/BlocoDoPainel';
import CartaoDeResumo from '../../components/dashboard/CartaoDeResumo';
import LinhaDeData from '../../components/dashboard/LinhaDeData';
import {
  CARTOES_DO_ACUMULADO,
  CARTAO_VENCIDO_HOJE,
  notaDasVencidas,
  notaDoSaldoAdiantado,
} from '../../components/dashboard/resumoFinanceiro.js';
import {
  contarParcelasVencidas,
  parcelasVencidasDoAviso,
  lerBlocosFechados,
  gravarBlocosFechados,
} from '../../utils/painel';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import Icone from '../../components/ui/Icone';
import OfflineNotice from '../../components/ui/OfflineNotice';
import Loading from '../../components/common/Loading';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE, MENSAGEM_LEITURA_SEM_CACHE } from '../../offline/offlineMessages';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { destinoDoItem } from '../../utils/calendarLabels';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  chaveDoMes,
  mesCorrente,
  lerMesDaUrl,
  mesesIguais,
  mesVizinhoNaFaixa,
  paramsDoMes,
  rotuloDoMes,
  datasProximas,
  janelaDasDatas,
  destinoDasConfirmacoes,
  destinoDasConfirmacoesDoProcesso,
  rotuloDaConfirmacaoPorProcesso,
  destinoDosNaoLiberados,
} from './inicio.js';
import { pluralizar } from '../../components/ui/plural.js';
// `link-interno` (F-1b) mora em `styles/modules.css`, junto das demais
// classes compartilhadas das telas de módulo.
import '../../styles/modules.css';
// `Button.css` importado EXPLICITAMENTE: as ações dos blocos usam `.ui-btn`, e
// esta tela não monta o `PageHeader`, que é quem normalmente traz essas regras.
// Sem este import os botões de ação sairiam sem estilo nenhum — o defeito que a
// varredura de classes da Fase 2E.1 existe para pegar.
import '../../components/ui/Button.css';
import './DashboardPage.css';
import { rotuloDaParcela } from '../../components/financeiro/installmentLabel';
import { jaAvisadoPeloToastGlobal } from '../../api/toastGlobal';

// Fase 2b (DEC-084): com o servidor fora, os GETs em paralelo desta tela
// falham juntos. O toast global sai UMA vez (deduplicação da DEC-083), e os
// `catch` abaixo só falam do que ele não cobre — um 404, por exemplo.
//
// Fase 4a2 (DEC-161): o bloco "Gráficos" saiu do Início, com o componente,
// os estilos, as duas leituras que só ele fazia (`/dashboard/status` e
// `/dashboard/honorarios-por-mes`) e o `recharts`. As rotas continuam no
// back — tirar rota é mudar contrato —, só sem uso no front.

// O `BlocoDoPainel` recebe um COMPONENTE de ícone (`size`, `className`), no
// formato do lucide. Este adaptador põe os ícones da Raniele no mesmo formato,
// sem mexer no bloco. Lucide só onde ela não tem equivalente (o alerta).
const doIcone = (nome) => {
  const IconeDoBloco = ({ size, className }) => (
    <Icone nome={nome} tamanho={size} className={className} />
  );
  return IconeDoBloco;
};
const ICONE_CALENDARIO = doIcone('calendario');
const ICONE_DINHEIRO = doIcone('dinheiro');
const ICONE_FOLDER = doIcone('folder');

// O ícone ao lado do rótulo do cartão: o da Raniele pelo nome, ou o lucide
// quando ela não tem equivalente.
const IconeDoCartao = ({ icone, Icon }) => (
  <span className="card-icon">
    {icone ? <Icone nome={icone} tamanho={16} /> : <Icon size={16} aria-hidden="true" />}
  </span>
);

// ── Ações rápidas (Fase 3.1) ───────────────────────────────────────────────
//
// "Nova parcela" leva ao formulário de parcela, e não ao Financeiro como no
// Início da Raniele: a ação diz "nova parcela", e quem clica espera o
// formulário, não uma lista onde ainda precisa achar o botão (DEC-099).
const ACOES_RAPIDAS = [
  { rotulo: 'Novo cliente',  para: '/dashboard/clientes/novo',  icone: 'pessoa' },
  { rotulo: 'Novo processo', para: '/dashboard/processos/novo', icone: 'folder' },
  { rotulo: 'Nova parcela',  para: '/dashboard/parcelas/novo',  icone: 'dinheiro' },
];

// ── Cartões de contagem ────────────────────────────────────────────────────
//
// Dois saíram desta lista na Fase 4.3, e nos dois casos porque o mesmo número
// passou a ser dito melhor em outro lugar:
//
// - **"Pagamentos do Mês"** virou "Recebido em {mês}", na faixa de dinheiro.
//   Era o cartão que abria esta fase: exibia "R$ 0,00" com o seed inteiro
//   quitado em meses passados, e não havia como distinguir "não entrou nada
//   neste mês" de "o número quebrou". O rótulo com o mês resolve a ambiguidade
//   na própria frase.
// - **"Parcelas Vencidas"** foi absorvido pelo cartão "Total vencido", que traz
//   o VALOR e a contagem juntos. Manter os dois deixaria dois números do mesmo
//   assunto lado a lado, vindos de rotas diferentes e livres para divergir.
const CARDS = [
  { key: 'processosAtivos',        label: 'Processos Ativos',       icone: 'folder',    color: 'primary' },
  { key: 'clientesCadastrados',    label: 'Clientes Cadastrados',   icone: 'pessoa',    color: 'primary' },
  // "Em aberto" (Fase 0, DEC-069): o backend passou a contar `pendente` E
  // `parcialmente_pago`. "A receber" contava só os que nunca receberam nada.
  // A chave continua `honorariosAReceber` — é o nome do campo na API.
  { key: 'honorariosAReceber',     label: 'Honorários em aberto',   icone: 'dinheiro',  color: 'warning' },
  { key: 'documentosCadastrados',  label: 'Documentos Cadastrados', icone: 'documento', color: 'neutral' },
  // `info` e não `success`: é coisa a fazer, não resultado alcançado. E não é
  // `warning`: confirmação chegando é o sistema funcionando, nada está errado.
  { key: 'confirmacoesNaoVistas',  label: 'Confirmações Novas',     icone: 'sino',      color: 'info'    },
];

// ── Indicadores em dinheiro ────────────────────────────────────────────────
//
// Todos de `GET /api/financeiro/resumo`. Desde a Fase 3.1 (DEC-098) a rota
// aceita `?mes=AAAA-MM`, e SÓ estes dois campos seguem o mês escolhido.
//
// **O mês do rótulo vem do servidor** (`mesReferencia`), e não de
// `new Date()` aqui. Os dois quase sempre concordam — e no dia em que não
// concordarem, o cartão estaria dizendo "agosto" sobre o número de julho.
const CARDS_DO_MES = [
  {
    key: 'aReceberNoMes',
    label: (mes) => `A receber em ${mes}`,
    icone: 'calendario',
    color: 'warning',
    vazio: 'nada a vencer no mês',
  },
  {
    key: 'recebidoNoMes',
    label: (mes) => `Recebido em ${mes}`,
    icone: 'dinheiro',
    color: 'success',
    vazio: 'nenhum pagamento no mês',
  },
];

// Os acumulados, o vencido de hoje e a nota do saldo adiantado vêm de
// `components/dashboard/resumoFinanceiro.js` desde a Fase 3.7 (DEC-131): a
// Visão geral do Financeiro mostra os mesmos números, e uma definição só
// impede os dois painéis de discordarem.

// Os blocos de estatística, que nascem fechados.
const PADRAO_FECHADO = new Set(['acumulado', 'resumo']);

const formatCurrentDate = () =>
  new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

const daysUntilLabel = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due - today) / 86400000);
  if (diff < 0)   return 'Vencida';
  if (diff === 0) return 'Vence hoje';
  if (diff === 1) return 'Vence amanhã';
  return `Vence em ${diff} dias`;
};

// O que a advogada ainda tem a receber NESTA parcela. A parcela parcialmente
// paga é o caso que o valor cheio erraria: 4.000 contratados com 1.000 já
// recebidos precisam aparecer como 3.000 na lista de cobranças urgentes.
const emAbertoDaParcela = (inst) =>
  Math.max(0, Number(inst.valor || 0) - Number(inst.valorPago || 0));

const pluralParcelas = (n) => (n === 1 ? '1 parcela vencida' : `${n} parcelas vencidas`);

function DashboardHomePage() {
  const online = useOnlineStatus();
  const [summary, setSummary] = useState(null);
  // Fase 3.2 (DEC-104): a lista curta das confirmações por processo.
  const [listaDeConfirmacoesAberta, setListaDeConfirmacoesAberta] = useState(false);
  const confirmacoes = destinoDasConfirmacoes(summary?.confirmacoesNovasPorProcesso);
  const naoLiberados = destinoDosNaoLiberados(summary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [upcoming, setUpcoming] = useState([]);
  const [agenda, setAgenda] = useState(null);
  const [agendaFalhou, setAgendaFalhou] = useState(false);

  // ── O mês escolhido mora na URL (Fase 3.1, DEC-098) ─────────────────────
  //
  // Como a Agenda faz com `?mes=`: o "voltar" do navegador desfaz a troca, e o
  // link copiado abre no mesmo mês. Sem `?mes=` (ou com um inválido) é o mês
  // corrente — e aí a chamada vai SEM o parâmetro, a mesma de antes da fase.
  //
  // Trocar `?mes=` não rola a página: `VoltarAoTopo` só reage ao `pathname`.
  const [searchParams, setSearchParams] = useSearchParams();
  const mesDaUrl = lerMesDaUrl(searchParams.get('mes'));
  const corrente = mesCorrente();
  const mesEscolhido = mesDaUrl ?? corrente;
  const chaveEscolhida = chaveDoMes(mesEscolhido);
  const noMesCorrente = mesesIguais(mesEscolhido, corrente);
  const mesParaApi = mesDaUrl ? chaveEscolhida : undefined;
  const anterior = mesVizinhoNaFaixa(mesEscolhido, -1);
  const proximo = mesVizinhoNaFaixa(mesEscolhido, 1);

  // `null` volta ao mês corrente, e o mês corrente se escreve SEM `?mes=`:
  // uma URL só para cada mês, e a do mês de hoje é a de sempre.
  const irParaMes = (destino) =>
    setSearchParams(paramsDoMes(searchParams, destino, corrente), { replace: false, preventScrollReset: true });

  // ── DEC-057 / Parte 5 — o painel lê o vencido DA MESMA FONTE que o sino ──
  // `GET /api/calendar/avisos` é a requisição que o sino já faz. O painel não
  // conta vencidas por conta própria: ver `utils/painel.js` para por que uma
  // fonte só, e para o defeito que o passo 135 pegou quando havia duas.
  const [avisos, setAvisos] = useState(null);

  // Blocos colapsáveis, com a escolha lembrada por navegador. O que exige
  // ATENÇÃO nasce aberto; o que é ESTATÍSTICA nasce fechado — a pergunta que
  // a advogada faz ao abrir o sistema é "o que eu preciso fazer hoje", e a
  // estatística responde outra.
  const [fechados, setFechados] = useState(lerBlocosFechados);

  // Alternar parte do estado À VISTA, e não do gravado: sem preferência
  // gravada, `!prev[chave]` dava `true` ("fechado") para um bloco que já nasce
  // fechado, e o primeiro clique não abria nada (achado da Fase 3.1, no
  // navegador). `PADRAO_FECHADO` é a mesma lista do segundo argumento de
  // `estaAberto` abaixo.
  const alternarBloco = (chave) => {
    setFechados((prev) => {
      const proximoEstado = { ...prev, [chave]: !(prev[chave] ?? PADRAO_FECHADO.has(chave)) };
      gravarBlocosFechados(proximoEstado);
      return proximoEstado;
    });
  };

  // `padraoFechado` é o estado inicial do bloco; a preferência gravada, quando
  // existe, manda. `?? padraoFechado` e não `||`: `false` gravado é escolha
  // deliberada de abrir, e `||` a descartaria.
  const estaAberto = (chave, padraoFechado = false) =>
    !(fechados[chave] ?? padraoFechado);

  // ── O resumo financeiro, com espelho por mês (F-5a + Fase 3.1) ──────────
  //
  // O mês entra na CHAVE do espelho: cada mês visitado tem a sua entrada, e um
  // mês nunca aberto com sinal diz isso (a frase da F-5a) em vez de mostrar o
  // número de outro mês. Sem `?mes=` a chave é a mesma da tela do Financeiro —
  // é a mesma resposta.
  //
  // Sem `toast` aqui: o hook põe o erro no bloco, e o toast global (DEC-084)
  // já fala do servidor fora.
  const {
    data: resumoFinanceiro,
    loading: carregandoResumo,
    error: erroResumo,
    updatedAt,
    fromCache,
  } = useCachedResource({
    resource: 'financeSummary',
    params: mesParaApi ? { mes: mesParaApi } : undefined,
    fetcher: () => financeiroService.getResumo(mesParaApi).then((res) => res.data),
    fallbackError: 'Não foi possível carregar os totais financeiros.',
  });

  // Os campos que NÃO seguem o mês (vencido, acumulado, próximos vencimentos)
  // ficam com a última resposta boa: sem sinal, abrir um mês nunca visitado
  // apaga os cartões do mês — que de fato não se sabe —, e não o acumulado,
  // que se sabe e não mudou.
  const [ultimoResumo, setUltimoResumo] = useState(null);
  if (resumoFinanceiro && resumoFinanceiro !== ultimoResumo) setUltimoResumo(resumoFinanceiro);
  const resumoFixo = resumoFinanceiro ?? ultimoResumo;

  useEffect(() => {
    dashboardService.getDashboardSummary()
      .then(res => setSummary(res.data))
      .catch(err => setError(getApiErrorMessage(err, 'Falha ao carregar o resumo.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    installmentService.listInstallments()
      .then(res => {
        const all = res.data.data ?? res.data;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);

        // **Só o que está POR VENCER.** As vencidas saíram daqui na F-4: elas
        // vêm do sino, que é a fonte única da contagem (ver `utils/painel.js`).
        // Deixá-las nos dois lugares era o segundo caminho para o mesmo número.
        const urgent = all
          .filter(inst => {
            if (inst.status !== 'pendente') return false;
            return new Date(inst.dataVencimento) <= in7Days;
          })
          .sort((a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento));

        setUpcoming(urgent);
      })
      .catch(err => { if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível carregar as parcelas urgentes.')); });
  }, []);

  // Os compromissos das Datas próximas: `GET /calendar`, a rota da Agenda, sem
  // rota nova. Falha aqui não derruba o bloco — os vencimentos continuam.
  useEffect(() => {
    calendarService.getCalendar(janelaDasDatas())
      .then(res => setAgenda(res.data))
      .catch(err => {
        setAgendaFalhou(true);
        if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível carregar os compromissos.'));
      });
  }, []);

  // Falhar aqui não derruba o painel: o bloco de atenção some, o resto fica.
  useEffect(() => {
    calendarService.getAvisos()
      .then(res => setAvisos(res.data))
      .catch(err => { if (!jaAvisadoPeloToastGlobal(err)) toast.error(getApiErrorMessage(err, 'Não foi possível carregar os avisos.')); });
  }, []);

  const rotuloMes = rotuloDoMes(chaveEscolhida);
  const rotuloMesDoServidor = resumoFinanceiro?.mesReferencia
    ? rotuloDoMes(resumoFinanceiro.mesReferencia)
    : rotuloMes;
  // Do sino, não do resumo financeiro — uma fonte só para este número.
  const vencidas = contarParcelasVencidas(avisos);
  const parcelasVencidas = parcelasVencidasDoAviso(avisos);
  const temAtencao = vencidas + upcoming.length > 0;

  const datas = datasProximas({
    vencimentos: resumoFixo?.proximosVencimentos ?? [],
    eventos: agenda?.itens ?? [],
    hoje: agenda?.hoje ?? null,
  });

  // ── A ordem dos blocos, e por que ela é esta ────────────────────────────
  // Ações rápidas e atenção primeiro, estatística depois. Os três primeiros
  // blocos nascem abertos porque respondem "o que eu preciso fazer hoje"; os
  // dois últimos nascem fechados porque respondem "como está o escritório" —
  // uma pergunta boa, só não é a da primeira olhada do dia.
  return (
    <div>
      <div className="dashboard-header">
        <div className="dashboard-header__titulo">
          <h1 className="dashboard-title">Início</h1>
          <p className="dashboard-date">{formatCurrentDate()}</p>
        </div>

        {/* O seletor do mês. Só os blocos que dizem o mês no título o seguem —
            ver a tabela da DEC-098. */}
        <div className="inicio-mes" role="group" aria-label="Mês do Início">
          <button
            type="button"
            className="inicio-mes__seta"
            aria-label="Mês anterior"
            disabled={!anterior}
            onClick={() => irParaMes(anterior)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className="inicio-mes__rotulo" aria-live="polite">{rotuloMes}</span>
          <button
            type="button"
            className="inicio-mes__seta"
            aria-label="Próximo mês"
            disabled={!proximo}
            onClick={() => irParaMes(proximo)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
          {!noMesCorrente && (
            <button type="button" className="inicio-mes__atual" onClick={() => irParaMes(null)}>
              Mês atual
            </button>
          )}
        </div>
      </div>

      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}

      {/* ══ AÇÕES RÁPIDAS ════════════════════════════════════════════════════
          Sem sinal, as três ficam desabilitadas com o motivo: criar cliente,
          processo ou parcela não está na fila offline (F-5b), e o padrão é o da
          DEC-053 — botão desabilitado com explicação, e não ausente. */}
      <section className="inicio-acoes" aria-labelledby="inicio-acoes-titulo">
        <h2 id="inicio-acoes-titulo" className="inicio-acoes__titulo">Ações rápidas</h2>
        <ul className="inicio-acoes__lista">
          {ACOES_RAPIDAS.map((acao) => (
            <li key={acao.para}>
              {online ? (
                <Link to={acao.para} className="inicio-acao">
                  <Icone nome={acao.icone} tamanho={24} />
                  <span className="inicio-acao__rotulo">{acao.rotulo}</span>
                </Link>
              ) : (
                <button
                  type="button"
                  className="inicio-acao"
                  aria-disabled="true"
                  aria-describedby="inicio-acoes-motivo"
                  onClick={(e) => e.preventDefault()}
                >
                  <Icone nome={acao.icone} tamanho={24} />
                  <span className="inicio-acao__rotulo">{acao.rotulo}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
        {!online && (
          <p id="inicio-acoes-motivo" className="inicio-acoes__motivo">{MENSAGEM_ESCRITA_OFFLINE}</p>
        )}
      </section>

      {/* ══ 1. PRECISA DE ATENÇÃO — só quando há algo ═══════════════════════
          As vencidas vêm do sino (`/calendar/avisos`), e é a MESMA fonte que
          o badge do cabeçalho conta. Os dois números da mesma coisa na mesma
          tela não podem divergir — ver `utils/painel.js`. */}
      {temAtencao && (
        <BlocoDoPainel
          chave="atencao"
          titulo="Precisa de atenção"
          Icone={AlertCircle}
          contagem={vencidas + upcoming.length}
          aberto={estaAberto('atencao')}
          aoAlternar={alternarBloco}
          acao={
            <Link to="/dashboard/pagamentos/novo" className="ui-btn ui-btn--primary ui-btn--sm">
              <HandCoins size={16} aria-hidden="true" />
              Registrar pagamento
            </Link>
          }
        >
          {vencidas > 0 && (
            <>
              <h3 className="bloco__subtitulo">{pluralParcelas(vencidas)}</h3>
              <ul className="upcoming-list">
                {parcelasVencidas.map((item) => {
                  const destino = destinoDoItem(item);
                  return (
                    <li key={`vencida-${item._id}`} className="upcoming-item">
                      <div className="upcoming-info">
                        <span className="upcoming-desc">
                          {destino ? (
                            <Link to={destino} className="link-interno">{item.titulo}</Link>
                          ) : (
                            item.titulo
                          )}
                        </span>
                        <span className="upcoming-due">{formatDate(item.data)}</span>
                      </div>
                      <div className="upcoming-right">
                        {item.valor != null && (
                          <span className="upcoming-value">{formatCurrency(item.valor)}</span>
                        )}
                        <StatusBadge status="vencido" />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {upcoming.length > 0 && (
            <>
              <h3 className="bloco__subtitulo">Vencem nos próximos 7 dias</h3>
              <ul className="upcoming-list">
                {upcoming.map(inst => (
                  <li key={inst._id} className="upcoming-item">
                    <div className="upcoming-info">
                      {/* O nome leva à cobrança, "Parcela N" leva à parcela. */}
                      <span className="upcoming-desc">
                        {inst.feeId?._id ? (
                          <Link to={`/dashboard/honorarios/${inst.feeId._id}`} className="link-interno">
                            {inst.feeId.descricao || 'Honorário'}
                          </Link>
                        ) : (
                          inst.feeId?.descricao || 'Honorário'
                        )}
                        {' — '}
                        <Link to={`/dashboard/parcelas/editar/${inst._id}`} className="upcoming-link">
                          {rotuloDaParcela({ numeroParcela: inst.numeroParcela, totalParcelas: inst.totalParcelas ?? null })}
                        </Link>
                      </span>
                      <span className="upcoming-due">{daysUntilLabel(inst.dataVencimento)}</span>
                    </div>
                    <div className="upcoming-right">
                      <span className="upcoming-value">{formatCurrency(emAbertoDaParcela(inst))}</span>
                      <StatusBadge status={inst.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </BlocoDoPainel>
      )}

      {/* ══ 2. DATAS PRÓXIMAS ═══════════════════════════════════════════════
          Vencimentos (`proximosVencimentos`) e compromissos (`GET /calendar`)
          numa lista só, por data. NÃO segue o mês escolhido: "próximo" é a
          partir de hoje. A linha inteira leva à origem, como na Agenda. */}
      <BlocoDoPainel
        chave="proximos"
        titulo="Datas próximas"
        Icone={ICONE_CALENDARIO}
        aberto={estaAberto('proximos')}
        aoAlternar={alternarBloco}
        acao={
          <Link to="/dashboard/agenda" className="ui-btn ui-btn--secondary ui-btn--sm">
            Ver agenda completa
          </Link>
        }
      >
        {!resumoFixo && !agenda && (carregandoResumo || !agendaFalhou) ? (
          <Loading />
        ) : !resumoFixo && !agenda ? (
          <p className="error-message">{erroResumo || 'Não foi possível carregar as datas próximas.'}</p>
        ) : datas.length === 0 ? (
          <EmptyState
            title="Nada nos próximos dias."
            description="Nenhum vencimento em aberto nem compromisso de hoje em diante."
          />
        ) : (
          <ul className="datas-lista">
            {datas.map((item) => <LinhaDeData key={item.chave} item={item} />)}
          </ul>
        )}
        {agendaFalhou && resumoFixo && (
          <p className="error-message">Os compromissos não carregaram; a lista mostra só os vencimentos.</p>
        )}
      </BlocoDoPainel>

      {/* ══ 3. NO MÊS — segue o mês escolhido ════════════════════════════════ */}
      <BlocoDoPainel
        chave="mes"
        titulo={`Em ${rotuloMes}`}
        Icone={ICONE_DINHEIRO}
        aberto={estaAberto('mes')}
        aoAlternar={alternarBloco}
      >
        {carregandoResumo && !resumoFinanceiro ? (
          <Loading />
        ) : erroResumo === MENSAGEM_LEITURA_SEM_CACHE ? (
          <EmptyState title="Sem dados guardados deste mês." description={erroResumo} />
        ) : erroResumo ? (
          <p className="error-message">{erroResumo}</p>
        ) : resumoFinanceiro && (
          <div className="summary-grid">
            {CARDS_DO_MES.map(({ key, label, icone, color, vazio }) => {
              const valor = resumoFinanceiro[key] ?? 0;
              // Zero REAL diz por extenso que é zero.
              return (
                <CartaoDeResumo key={key} rotulo={label(rotuloMesDoServidor)} icone={icone} cor={color}
                                valor={formatCurrency(valor)} nota={valor === 0 ? vazio : null} />
              );
            })}

            {/* Valor e contagem no MESMO cartão. O valor vem do resumo
                financeiro (o sino não expõe dinheiro); a CONTAGEM vem do sino,
                que é a fonte única deste número. É de HOJE, e não do mês
                escolhido — o rótulo diz isso. */}
            <CartaoDeResumo
              rotulo={CARTAO_VENCIDO_HOJE.label}
              cor={CARTAO_VENCIDO_HOJE.color}
              Icon={AlertCircle}
              valor={formatCurrency(resumoFinanceiro[CARTAO_VENCIDO_HOJE.key] ?? 0)}
              // Fase 3.7: sem a resposta do sino (sem sinal, falha), a nota
              // dizia "nenhuma parcela vencida" ao lado de um valor vencido —
              // contava zero de uma resposta que não chegou. Sem sino, sem nota.
              nota={avisos ? notaDasVencidas(vencidas) : null}
            />
          </div>
        )}
      </BlocoDoPainel>

      {/* ══ 4. ACUMULADO — estatística, nasce FECHADO; não segue o mês ═══════ */}
      {resumoFixo && (
        <BlocoDoPainel
          chave="acumulado"
          titulo="Acumulado do escritório"
          Icone={ICONE_DINHEIRO}
          aberto={estaAberto('acumulado', true)}
          aoAlternar={alternarBloco}
        >
          <div className="summary-grid">
            {CARTOES_DO_ACUMULADO.map(({ key, label, icone, color }) => (
              <CartaoDeResumo key={key} rotulo={label} icone={icone} cor={color}
                              valor={formatCurrency(resumoFixo[key] ?? 0)} />
            ))}
          </div>

          {/* O crédito do cliente, nomeado (DEC-040). A frase antiga dizia que
              ele "já está abatido do total em aberto", o que deixou de ser
              verdade na DEC-040 — ver `notaDoSaldoAdiantado`. */}
          {(resumoFixo.saldoAdiantado ?? 0) > 0 && (
            <p className="summary-nota">{notaDoSaldoAdiantado(resumoFixo.saldoAdiantado)}</p>
          )}
        </BlocoDoPainel>
      )}

      {/* ══ 5. RESUMO GERAL — estatística, nasce FECHADO ════════════════════ */}
      <BlocoDoPainel
        chave="resumo"
        titulo="Resumo Geral"
        Icone={ICONE_FOLDER}
        aberto={estaAberto('resumo', true)}
        aoAlternar={alternarBloco}
        acao={
          <Link to="/dashboard/processos" className="ui-btn ui-btn--secondary ui-btn--sm">
            Ver processos
          </Link>
        }
      >
        {loading && <Loading />}
        {error && <p className="error-message">{error}</p>}

        {summary && (
          <div className="summary-grid">
            {CARDS.map(({ key, label, icone, color }) => {
              const conteudo = (
                <>
                  <p className="card-label">
                    <IconeDoCartao icone={icone} />
                    {label}
                  </p>
                  <p className="card-value">
                    {summary[key] != null ? summary[key].toLocaleString('pt-BR') : '—'}
                  </p>
                </>
              );
              // Fase 3.2 (DEC-104): com UM processo, o cartão de confirmações
              // é o link para ele; com vários, abre a lista curta embaixo.
              if (key === 'confirmacoesNaoVistas' && confirmacoes.tipo === 'processo') {
                return (
                  <Link key={key} to={confirmacoes.destino} className={`summary-card summary-card--${color} summary-card--link`}>
                    {conteudo}
                    <span className="card-note">Abrir o processo</span>
                  </Link>
                );
              }
              if (key === 'confirmacoesNaoVistas' && confirmacoes.tipo === 'lista') {
                return (
                  <div key={key} className={`summary-card summary-card--${color}`}>
                    {conteudo}
                    <button
                      type="button"
                      className="summary-card__alternar"
                      aria-expanded={listaDeConfirmacoesAberta}
                      aria-controls="confirmacoes-por-processo"
                      onClick={() => setListaDeConfirmacoesAberta((v) => !v)}
                    >
                      {listaDeConfirmacoesAberta ? 'Fechar a lista' : `Ver os ${confirmacoes.itens.length} processos`}
                    </button>
                  </div>
                );
              }
              return (
                <div key={key} className={`summary-card summary-card--${color}`}>
                  {conteudo}
                </div>
              );
            })}

            {/* Fase 3.2 (DEC-104) e 3.3 (DEC-108): PROCESSOS com algum cliente
                de portal ainda não liberado. Com um só, o link abre o
                processo; com mais, a lista JÁ FILTRADA por
                `?portal=nao_liberado` (Fase 3.4, DEC-118), que conta o mesmo. */}
            <div className="summary-card summary-card--warning">
              <p className="card-label">
                <IconeDoCartao icone="folder" />
                Processos não liberados no portal
              </p>
              <p className="card-value">
                {summary.processosNaoLiberados != null ? summary.processosNaoLiberados.toLocaleString('pt-BR') : '—'}
              </p>
              <Link to={naoLiberados.destino} className="card-note card-note--link">
                {naoLiberados.rotulo}
              </Link>
            </div>
          </div>
        )}

        {summary && confirmacoes.tipo === 'lista' && listaDeConfirmacoesAberta && (
          <div className="confirmacoes-por-processo" id="confirmacoes-por-processo">
            <p className="confirmacoes-por-processo__titulo">Confirmações novas por processo</p>
            <ul>
              {confirmacoes.itens.map((c) => (
                <li key={c.processoId}>
                  <Link to={destinoDasConfirmacoesDoProcesso(c.processoId)} className="link-interno">
                    {rotuloDaConfirmacaoPorProcesso(c)}
                  </Link>
                  <span className="confirmacoes-por-processo__quantidade">
                    {pluralizar(c.quantidade, 'confirmação')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </BlocoDoPainel>

    </div>
  );
}

export default DashboardHomePage;
