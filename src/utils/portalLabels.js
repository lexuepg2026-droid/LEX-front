// ═══════════════════════════════════════════════════════════════════════════
// RÓTULOS DO PORTAL — enum do backend em linguagem que um leigo entende
//
// O cliente não sabe o que é `em_andamento`, e "litisconsorte" não diz nada a
// quem não é do direito. Despejar o valor cru do enum na tela é o mesmo erro
// que a Fase 2D.1 corrigiu no catálogo de variáveis: derivar texto legível de
// identificador produz "Terceiro Interessado", que funciona e parece amador —
// ou pior, "reu", que parece defeito.
//
// ── Por que o mapa vive AQUI e não no backend ─────────────────────────────
// O enum é vocabulário de domínio e é o mesmo para as duas superfícies. O que
// muda é a AUDIÊNCIA: a advogada quer "Litisconsorte", que é o termo técnico
// correto e o que ela usa na petição; o cliente quer saber que ele está no
// processo junto com outra pessoa. São dois textos para um valor só, e é a
// tela que sabe para quem está falando.
//
// Toda função aqui devolve o valor cru quando não conhece a chave, em vez de
// devolver vazio: um rótulo faltando aparece como texto estranho na tela e
// alguém corrige; um campo vazio parece dado ausente e ninguém investiga.
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_PROCESSO = {
  ativo: {
    rotulo: 'Em andamento',
    explicacao: 'O processo está em curso.',
  },
  encerrado: {
    rotulo: 'Encerrado',
    explicacao: 'O processo foi finalizado.',
  },
  suspenso: {
    rotulo: 'Suspenso',
    explicacao: 'O processo está temporariamente parado.',
  },
};

// A explicação importa mais que o rótulo. "Autor" um leigo até adivinha;
// "terceiro interessado" e "litisconsorte", não — e é justamente o papel dele
// no processo, a informação que ele mais precisa entender.
const PAPEL = {
  autor: {
    rotulo: 'Autor',
    explicacao: 'Você é quem entrou com a ação.',
  },
  reu: {
    rotulo: 'Réu',
    explicacao: 'A ação foi movida contra você.',
  },
  terceiro_interessado: {
    rotulo: 'Terceiro interessado',
    explicacao:
      'Você não é o autor nem o réu, mas o resultado do processo afeta um direito seu.',
  },
  litisconsorte: {
    rotulo: 'Litisconsorte',
    explicacao:
      'Você participa do processo ao lado de outra pessoa, na mesma posição que ela.',
  },
};

const TIPO_DOCUMENTO = {
  procuracao: 'Procuração',
  contrato_prestacao_servicos: 'Contrato de prestação de serviços',
  declaracao_isencao_ir: 'Declaração de isenção de imposto de renda',
  declaracao_autonomo: 'Declaração de trabalhador autônomo',
  declaracao_hipossuficiencia: 'Declaração de hipossuficiência',
  declaracao_renuncia: 'Declaração de renúncia',
  peticao: 'Petição',
  sentenca: 'Sentença',
  comprovante: 'Comprovante',
  outro: 'Documento',
};

export const rotuloStatus = (status) => STATUS_PROCESSO[status]?.rotulo ?? status ?? '—';

export const explicacaoStatus = (status) => STATUS_PROCESSO[status]?.explicacao ?? '';

export const rotuloPapel = (papel) => PAPEL[papel]?.rotulo ?? papel ?? '—';

export const explicacaoPapel = (papel) => PAPEL[papel]?.explicacao ?? '';

export const rotuloTipoDocumento = (tipo) => TIPO_DOCUMENTO[tipo] ?? tipo ?? 'Documento';

// ── Datas ──────────────────────────────────────────────────────────────────
//
// Fuso e formato brasileiros, explícitos. Sem `timeZone`, o navegador usa o do
// aparelho: um recibo carimbado às 22h de Ponta Grossa apareceria como do dia
// seguinte para quem abrisse com o fuso errado, e a data do recibo é o dado
// que sustenta a prova. Não é detalhe cosmético.

const FUSO = 'America/Sao_Paulo';

export const formatarData = (iso) => {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR', { timeZone: FUSO });
};

export const formatarDataHora = (iso) => {
  if (!iso) return '—';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-BR', {
    timeZone: FUSO,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default {
  rotuloStatus,
  explicacaoStatus,
  rotuloPapel,
  explicacaoPapel,
  rotuloTipoDocumento,
  formatarData,
  formatarDataHora,
};
