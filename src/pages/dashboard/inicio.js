// ═══════════════════════════════════════════════════════════════════════════
// O INÍCIO — funções puras da tela (Fase 3.1)
//
// O mês da URL, o rótulo dele, o selo das Datas próximas e a junção das duas
// fontes das Datas próximas. Tudo aqui é função pura, para a suíte provar a
// virada de ano, o mês inválido na URL e a ordem das datas sem montar a tela.
//
// Imports com `.js`: a suíte roda em `node --test`, sem o resolvedor do Vite.
// ═══════════════════════════════════════════════════════════════════════════

import { lerChaveDoMes, mesVizinho } from '../calendar/monthGrid.js';
import { destinoDoItem } from '../../utils/calendarLabels.js';
import { rotuloDaParcela } from '../../components/financeiro/installmentLabel.js';
import { formatCurrency } from '../../utils/formatters.js';

// A mesma faixa que o backend aceita em `?mes=` (DEC-098). Fora dela o backend
// responde 400; a tela nem pede — trata como "sem mês" e mostra o corrente.
export const ANO_MINIMO = 2000;
export const ANO_MAXIMO = 2100;

export const chaveDoMes = ({ ano, mes }) => `${ano}-${String(mes).padStart(2, '0')}`;

// O mês corrente, em UTC: é o mesmo relógio que o backend usa para o mês sem
// `?mes=`, e o mesmo que a Agenda usa para abrir. Num fuso diferente, a tela e
// o servidor discordariam do mês justamente na virada.
export const mesCorrente = (agora = new Date()) => ({
  ano: agora.getUTCFullYear(),
  mes: agora.getUTCMonth() + 1,
});

// `?mes=` da URL → `{ ano, mes }`, ou `null` quando ausente ou inválido. Quem
// chama cai no mês corrente: uma URL velha ou digitada errada abre a tela, não
// uma mensagem de erro.
export const lerMesDaUrl = (valor) => {
  const lido = lerChaveDoMes(valor);
  if (!lido) return null;
  if (lido.ano < ANO_MINIMO || lido.ano > ANO_MAXIMO) return null;
  return lido;
};

export const mesesIguais = (a, b) => Boolean(a && b) && a.ano === b.ano && a.mes === b.mes;

// O vizinho, ou `null` quando sairia da faixa — a seta fica desabilitada.
export const mesVizinhoNaFaixa = ({ ano, mes }, passo) => {
  const vizinho = mesVizinho(ano, mes, passo);
  if (vizinho.ano < ANO_MINIMO || vizinho.ano > ANO_MAXIMO) return null;
  return vizinho;
};

// Os parâmetros da URL depois de ir para `destino`. `null` (ou o próprio mês
// corrente) TIRA o `?mes=`: uma URL só para cada mês, e a do mês de hoje é a
// de sempre. Os outros parâmetros ficam como estavam.
export const paramsDoMes = (atuais, destino, corrente) => {
  const params = new URLSearchParams(atuais);
  if (!destino || mesesIguais(destino, corrente)) params.delete('mes');
  else params.set('mes', chaveDoMes(destino));
  return params;
};

// `"2026-10"` → `"outubro de 2026"`. Por extenso, com "de": é a frase do
// título ("Em outubro de 2026") e dos cartões ("Recebido em outubro de 2026").
// `formatMonthKey` dá "outubro/2026", que serve ao eixo do gráfico e não à
// frase.
export const rotuloDoMes = (chave) => {
  const lido = lerChaveDoMes(chave);
  if (!lido) return '—';
  const nome = new Date(Date.UTC(lido.ano, lido.mes - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    timeZone: 'UTC',
  });
  return `${nome} de ${lido.ano}`;
};

// A data de calendário de um valor que pode vir como `"2026-10-27"` (evento)
// ou como instante ISO de meia-noite UTC (`dataVencimento`). Os dez primeiros
// caracteres são a data nos dois casos, e cortar a string não tem fuso para
// errar.
export const dataDeCalendario = (valor) => {
  if (typeof valor !== 'string') return null;
  const data = valor.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : null;
};

const MESES_ABREVIADOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

// O selo da linha: o dia grande e o mês abreviado. `null` sem data válida.
export const seloDaData = (valor) => {
  const data = dataDeCalendario(valor);
  if (!data) return null;
  const mes = Number(data.slice(5, 7));
  return { dia: String(Number(data.slice(8, 10))), mes: MESES_ABREVIADOS[mes - 1] };
};

export const LIMITE_DE_DATAS = 8;

export const TIPOS_DE_DATA = Object.freeze({
  vencimento: { valor: 'vencimento', rotulo: 'Vencimento' },
  compromisso: { valor: 'compromisso', rotulo: 'Compromisso' },
});

// "{processo} · {cliente}" (Fase 3.2, DEC-105, apontamentos 3 e 4): as duas
// fontes passaram a trazer o nome do cliente principal — `clientePrincipalNome`
// no vencimento e dentro do `processo` do compromisso. Sem cliente, só o
// processo; sem processo (compromisso solto), nada.
export const contextoDoProcesso = (processo, numeroProcesso, cliente = null) => {
  let rotulo = null;
  if (processo && typeof processo === 'object') {
    const partes = [processo.numeroProcesso, processo.titulo].filter(Boolean);
    rotulo = partes.length ? partes.join(' — ') : null;
  } else {
    rotulo = numeroProcesso || null;
  }
  if (!rotulo) return null;
  const nome = (cliente || '').trim();
  return nome ? `${rotulo} · ${nome}` : rotulo;
};

const deVencimento = (parcela) => ({
  chave: `vencimento-${parcela._id}`,
  data: dataDeCalendario(parcela.dataVencimento),
  hora: null,
  tipo: TIPOS_DE_DATA.vencimento.valor,
  titulo: `${parcela.descricaoHonorario || 'Honorário'} — ${rotuloDaParcela({
    numeroParcela: parcela.numeroParcela,
    totalParcelas: parcela.totalParcelas ?? null,
  })}`,
  // O EM ABERTO, e não o valor da parcela: é o que falta receber.
  subtitulo: `${formatCurrency(parcela.emAberto ?? 0)} em aberto`,
  contexto: contextoDoProcesso(null, parcela.numeroProcesso, parcela.clientePrincipalNome),
  // O mesmo destino que a Agenda dá a uma derivada de parcela.
  destino: destinoDoItem({ natureza: 'derivada', origem: 'parcela', _id: parcela._id }),
});

const deCompromisso = (evento) => ({
  chave: `compromisso-${evento._id}`,
  data: dataDeCalendario(evento.data),
  hora: evento.hora || null,
  tipo: TIPOS_DE_DATA.compromisso.valor,
  titulo: evento.titulo || 'Compromisso',
  subtitulo: [evento.subtitulo, evento.hora].filter(Boolean).join(' · ') || null,
  contexto: contextoDoProcesso(evento.processo, null, evento.processo?.clientePrincipalNome),
  destino: destinoDoItem(evento),
});

// ── As Datas próximas ────────────────────────────────────────────────────
//
// Duas fontes, as duas de rotas que já existiam:
// - `vencimentos`: `proximosVencimentos` do resumo financeiro (até 8 desde
//   a Fase 3.2 — eram 5 —, em
//   aberto, de hoje em diante — DEC-068);
// - `eventos`: os itens de `GET /calendar` — só os compromissos (`natureza:
//   'evento'`) não concluídos, de `hoje` em diante. As derivadas do calendário
//   ficam de fora: elas são os mesmos vencimentos da outra fonte, e entrariam
//   em dobro.
//
// `hoje` é o do servidor (`GET /calendar` devolve), quando houver. Ordenadas
// por data e, no mesmo dia, pela hora — o vencimento, que não tem hora, vem
// primeiro.
export const datasProximas = ({ vencimentos = [], eventos = [], hoje = null, limite = LIMITE_DE_DATAS } = {}) => {
  const compromissos = (Array.isArray(eventos) ? eventos : [])
    .filter((e) => e && e.natureza === 'evento' && !e.concluido)
    .map(deCompromisso);
  const parcelas = (Array.isArray(vencimentos) ? vencimentos : []).filter(Boolean).map(deVencimento);

  return [...parcelas, ...compromissos]
    .filter((item) => item.data && (!hoje || item.data >= hoje))
    .sort((a, b) => {
      if (a.data !== b.data) return a.data < b.data ? -1 : 1;
      const ha = a.hora ?? '';
      const hb = b.hora ?? '';
      if (ha !== hb) return ha < hb ? -1 : 1;
      return a.chave < b.chave ? -1 : 1;
    })
    .slice(0, limite);
};

// A janela pedida a `GET /calendar`: de ontem a daqui a 30 dias, pelo relógio
// do navegador. Um dia a mais para trás porque o "hoje" que vale é o do
// servidor, que chega na resposta e corta o que sobrar (`datasProximas`).
export const JANELA_DE_DIAS = 30;

export const janelaDasDatas = (agora = new Date()) => {
  const base = Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate());
  const dia = 24 * 60 * 60 * 1000;
  const chave = (ms) => new Date(ms).toISOString().slice(0, 10);
  return { de: chave(base - dia), ate: chave(base + JANELA_DE_DIAS * dia) };
};

// ── "Confirmações novas" leva ao processo (Fase 3.2, DEC-104) ─────────────
//
// O cartão dizia quantas confirmações e não de quem. `GET /dashboard` passou a
// mandar `confirmacoesNovasPorProcesso` (até 10, pela mais recente). Com UM
// processo, o cartão é o link para ele — direto no balão das confirmações
// (`#confirmacoes`, Fase 3.4, DEC-118). Elas são marcadas como vistas quando a
// advogada abre a lista e ela aparece, não ao chegar no balão (passo 97,
// DEC-112). Com vários, uma lista curta abre embaixo do cartão,
// com cada processo e quantas confirmações. Sem nenhuma, o cartão é número.
// O balão das confirmações do detalhe (`id="confirmacoes"`). Usado também
// pela lista curta, com vários processos (DEC-118).
export const destinoDasConfirmacoesDoProcesso = (processoId) =>
  `/dashboard/processos/detalhe/${processoId}#confirmacoes`;

export const destinoDasConfirmacoes = (lista) => {
  const itens = (Array.isArray(lista) ? lista : []).filter((c) => c && c.processoId);
  if (itens.length === 0) return { tipo: 'nenhum', itens: [] };
  if (itens.length === 1) {
    return { tipo: 'processo', destino: destinoDasConfirmacoesDoProcesso(itens[0].processoId), itens };
  }
  return { tipo: 'lista', itens };
};

// "número — título", como a faixa de contexto (DEC-085).
export const rotuloDaConfirmacaoPorProcesso = (item) => {
  const partes = [(item?.numeroProcesso || '').trim(), (item?.titulo || '').trim()].filter(Boolean);
  return partes.length ? partes.join(' — ') : 'Processo';
};

// ── "Processos não liberados no portal" (Fase 3.3, DEC-108) ──────────────
// `processosNaoLiberados` passou a contar PROCESSOS distintos, e
// `processoNaoLiberadoId` vem preenchido quando há exatamente um. Com um, o
// cartão abre o processo — onde mora o interruptor —, como o de confirmações
// (DEC-104); com mais de um, a lista de processos JÁ FILTRADA pelo portal
// (Fase 3.4, DEC-118: `?portal=nao_liberado`, a mesma regra do número, DEC-115);
// com nenhum, a lista comum. Back antigo sem o id, com 1, também cai na lista
// filtrada: a tela não inventa destino.
export const destinoDosNaoLiberados = (resumo) => {
  const id = resumo?.processoNaoLiberadoId;
  const quantos = resumo?.processosNaoLiberados;
  if (quantos === 1 && id) {
    return { tipo: 'processo', destino: `/dashboard/processos/detalhe/${id}`, rotulo: 'Abrir o processo' };
  }
  if (typeof quantos === 'number' && quantos > 0) {
    return { tipo: 'lista', destino: '/dashboard/processos?portal=nao_liberado', rotulo: 'Ver os processos não liberados' };
  }
  return { tipo: 'lista', destino: '/dashboard/processos', rotulo: 'Ver a lista de processos' };
};
