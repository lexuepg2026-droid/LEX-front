import { PRESETS_PERIODO, descricaoDoPeriodo } from '../../components/ui/periodo.js';
import { trechoDoProcessoFiltrado } from '../../utils/processoFiltrado.js';

// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE DOCUMENTOS — as regras que a tela só exibe (Fase 3.9a, DEC-139)
//
// Funções puras, pela razão de sempre: a suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

// Os filtros próprios da lista. A busca e o período (`de`/`ate`/`preset`)
// vêm de `useListFilters`; não há filtro de status — a "situação" do
// documento (editado à mão, no portal) são selos, não um eixo que o back
// filtre, e a decisão 2 da fase pediu busca e período.
export const FILTROS_DA_LISTA = Object.freeze({});

// O `?processoId=` da aba do processo (DEC-070): o "Limpar filtros" o tira
// junto, na mesma escrita (DEC-103).
export const EXTRAS_DA_LISTA = Object.freeze(['processoId']);

// Período pela data de GERAÇÃO. "Últimos 6 meses" entra: documento é
// produção recente, e "o que eu gerei neste semestre" é pergunta comum.
export const PRESETS_DA_LISTA = Object.freeze([
  PRESETS_PERIODO.TODOS,
  PRESETS_PERIODO.MES_ATUAL,
  PRESETS_PERIODO.ULTIMOS_6_MESES,
  PRESETS_PERIODO.PERSONALIZADO,
]);

export const AJUDA_DO_PERIODO = 'O período é pela data em que o documento foi gerado.';

// O estado da tela → os parâmetros de `GET /documents`. Vazio não vai.
// `ehModelo: 'false'` sempre: modelo é peça interna da montagem, e misturá-lo
// faria a advogada baixar um modelo achando que era o documento do cliente. Até
// a 3.9a o filtro era feito NA TELA, sobre os 100 primeiros — com paginação o
// total e as páginas só fecham se o servidor filtrar (DEC-138).
export const consultaDaLista = (filtros, { page, limit, busca, processoId }) => {
  const consulta = { page, limit, ehModelo: 'false' };
  if (busca) consulta.busca = busca;
  if (processoId) consulta.processoId = processoId;
  if (filtros.de) consulta.de = filtros.de;
  if (filtros.ate) consulta.ate = filtros.ate;
  return consulta;
};

// O que vai para o espelho local (DEC-058/139): o ENVELOPE, sem o conteúdo
// do documento gerado. A lista não lê `textoResolvido` nem
// `variaveisResolvidas` — e o texto da peça (com CPF, endereço, valores) é o
// "documento gerado" que a F-5a decidiu não guardar no aparelho. Fica o que a
// linha mostra: nome, tipo, processo, cliente, data e selos.
export const CAMPOS_FORA_DO_ESPELHO = Object.freeze(['textoResolvido', 'variaveisResolvidas']);

export const envelopeParaOEspelho = (envelope) => {
  if (!envelope || !Array.isArray(envelope.data)) return envelope;
  return {
    ...envelope,
    data: envelope.data.map((documento) => {
      const linha = { ...documento };
      for (const campo of CAMPOS_FORA_DO_ESPELHO) delete linha[campo];
      return linha;
    }),
  };
};

// "Filtros aplicados: …".
export const descricaoDoRecorteDeDocumentos = ({ filtros = {}, busca = '', processo = null } = {}) => {
  const trechos = [];
  const termo = (busca ?? '').trim();
  if (termo) trechos.push(`com "${termo}"`);
  if (processo) trechos.push(trechoDoProcessoFiltrado(processo.rotulo));
  const periodo = descricaoDoPeriodo(filtros.preset, { de: filtros.de, ate: filtros.ate });
  if (periodo) trechos.push(`gerados ${periodo}`);

  if (trechos.length === 0) return '';
  if (trechos.length === 1) return trechos[0];
  return `${trechos.slice(0, -1).join(', ')} e ${trechos[trechos.length - 1]}`;
};

// A linha abre o texto final do documento — o mesmo destino do link do nome.
export const destinoDaLinha = (documento) =>
  documento?._id ? `/dashboard/documentos/${documento._id}/texto` : null;

// O "+" (e o "Gerar o primeiro documento"). Com o filtro de processo, a
// geração abre com ESSE processo escolhido (DEC-086/140) — quem está na aba do
// processo e pede um documento novo quer um documento dele.
export const destinoDoNovo = (processoId) => {
  const base = '/dashboard/documentos/montar?modo=documento';
  return processoId ? `${base}&processoId=${encodeURIComponent(processoId)}` : base;
};

// O texto da célula do processo: o número (o que se procura) e o título.
export const rotuloDoProcessoNaLinha = (processo) => {
  if (!processo || typeof processo !== 'object') return '—';
  const partes = [processo.numeroProcesso, processo.titulo].filter(Boolean);
  return partes.length ? partes.join(' — ') : '—';
};

export default {
  FILTROS_DA_LISTA,
  EXTRAS_DA_LISTA,
  PRESETS_DA_LISTA,
  AJUDA_DO_PERIODO,
  consultaDaLista,
  CAMPOS_FORA_DO_ESPELHO,
  envelopeParaOEspelho,
  descricaoDoRecorteDeDocumentos,
  destinoDaLinha,
  destinoDoNovo,
  rotuloDoProcessoNaLinha,
};
