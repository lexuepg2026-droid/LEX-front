import { PRESETS_PERIODO, descricaoDoPeriodo } from '../../components/ui/periodo.js';
import { FASE_PROCESSO_OPTIONS, FILTRO_LIMINAR_OPTIONS, labelDe } from '../../utils/enums.js';
import { rotuloDoStatus } from '../../utils/statusVisual.js';

// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE PROCESSOS — as regras que a tela só exibe (Fase 3.4, DEC-116)
//
// Funções puras, pela razão de sempre: a suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

// Os filtros da lista, como chaves do estado e da URL (`useListFilters` com
// `naUrl`, DEC-103). O status jurídico do processo é `andamento`, e não
// `status`: `filtrosNaUrl` escreve `status` como `?situacao=` (o nome das
// listas financeiras), e aqui `situacao` já é outra coisa — se o REGISTRO está
// ativo (DEC-052). Os dois eixos precisam de nomes diferentes também na URL.
export const FILTROS_DA_LISTA = Object.freeze({
  andamento: '',
  fase: '',
  liminar: '',
  situacao: '',
  tipoAcao: '',
  portal: '',
});

export const STATUS_PROCESSO = Object.freeze(['ativo', 'encerrado', 'suspenso']);

// DEC-052: "" é "Somente ativos" — o padrão do back sem `situacao` —, e por
// isso não aparece na URL de quem não mexeu.
export const SITUACAO_OPTIONS = Object.freeze([
  { value: '', label: 'Somente ativos' },
  { value: 'inativos', label: 'Somente desativados' },
  { value: 'todos', label: 'Ativos e desativados' },
]);

// DEC-115: a mesma regra do cartão do Início (DEC-108).
export const PORTAL_OPTIONS = Object.freeze([
  { value: '', label: 'Portal: todos' },
  { value: 'nao_liberado', label: 'Com cliente não liberado' },
  { value: 'liberado', label: 'Liberado' },
]);

// Período por DISTRIBUIÇÃO: os três da decisão 3. "Últimos 6 meses" fica de
// fora — processo não é lançamento recente, e a pílula ficaria mais longa
// sem ninguém ter pedido.
export const PRESETS_DA_LISTA = Object.freeze([
  PRESETS_PERIODO.TODOS,
  PRESETS_PERIODO.MES_ATUAL,
  PRESETS_PERIODO.PERSONALIZADO,
]);

export const AJUDA_DO_PERIODO =
  'O período é pela data de distribuição. Processo sem essa data só aparece em “Qualquer período”.';

// O estado da tela → os parâmetros de `GET /processes`. Vazio não vai.
export const consultaDaLista = (filtros, { page, limit, busca }) => {
  const consulta = { page, limit };
  if (busca) consulta.busca = busca;
  if (filtros.andamento) consulta.status = filtros.andamento;
  if (filtros.fase) consulta.fase = filtros.fase;
  if (filtros.liminar) consulta.liminar = filtros.liminar;
  if (filtros.situacao) consulta.situacao = filtros.situacao;
  if (filtros.tipoAcao) consulta.tipoAcao = filtros.tipoAcao;
  if (filtros.portal) consulta.portal = filtros.portal;
  if (filtros.de) consulta.de = filtros.de;
  if (filtros.ate) consulta.ate = filtros.ate;
  return consulta;
};

// As opções da pílula de tipo, com o valor da URL garantido: um link copiado
// com `?tipoAcao=X` não pode abrir com a pílula dizendo "Todos os tipos" só
// porque as opções ainda não chegaram (ou não chegam, sem sinal).
export const opcoesDeTipo = (tipos, atual) => {
  const lista = Array.isArray(tipos) ? tipos.filter((t) => typeof t === 'string' && t.trim() !== '') : [];
  const valor = (atual ?? '').trim();
  if (valor && !lista.some((t) => t.localeCompare(valor, 'pt', { sensitivity: 'base' }) === 0)) {
    return [valor, ...lista];
  }
  return lista;
};

// "Filtros aplicados: …" em português, como a das listas financeiras.
export const descricaoDoRecorteDeProcessos = ({ filtros = {}, busca = '' } = {}) => {
  const trechos = [];
  const termo = (busca ?? '').trim();
  if (termo) trechos.push(`com "${termo}"`);
  if (filtros.andamento) trechos.push(`com status "${rotuloDoStatus(filtros.andamento)}"`);
  if (filtros.fase) trechos.push(`na fase "${labelDe(FASE_PROCESSO_OPTIONS, filtros.fase)}"`);
  if (filtros.liminar) trechos.push(labelDe(FILTRO_LIMINAR_OPTIONS, filtros.liminar).toLowerCase());
  if (filtros.tipoAcao) trechos.push(`do tipo "${filtros.tipoAcao}"`);
  if (filtros.portal === 'nao_liberado') trechos.push('com cliente não liberado no portal');
  if (filtros.portal === 'liberado') trechos.push('liberados no portal');
  if (filtros.situacao === 'inativos') trechos.push('somente desativados');
  if (filtros.situacao === 'todos') trechos.push('ativos e desativados');
  const periodo = descricaoDoPeriodo(filtros.preset, { de: filtros.de, ate: filtros.ate });
  if (periodo) trechos.push(`distribuídos ${periodo}`);

  if (trechos.length === 0) return '';
  if (trechos.length === 1) return trechos[0];
  return `${trechos.slice(0, -1).join(', ')} e ${trechos[trechos.length - 1]}`;
};

// Para onde a linha leva. Processo desativado não tem detalhe (o back responde
// 404 a `GET /processes/:id` de registro inativo): a linha dele não é
// clicável, e o caminho é o "Reativar" do ⋮.
export const destinoDaLinha = (processo) =>
  processo && processo.ativo !== false ? `/dashboard/processos/detalhe/${processo._id}` : null;

export default {
  FILTROS_DA_LISTA,
  STATUS_PROCESSO,
  SITUACAO_OPTIONS,
  PORTAL_OPTIONS,
  PRESETS_DA_LISTA,
  AJUDA_DO_PERIODO,
  consultaDaLista,
  opcoesDeTipo,
  descricaoDoRecorteDeProcessos,
  destinoDaLinha,
};
