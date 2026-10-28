import { TIPO_SECAO_OPTIONS, labelDe } from '../../utils/enums.js';

// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE SEÇÕES — as regras que a tela só exibe (Fase 3.9a, DEC-139)
//
// Funções puras, pela razão de sempre: a suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

// Os filtros da lista (decisão 2): a busca, e o TIPO, que o modelo tem
// (`Secao.tipo`, `TIPOS_SECAO`) e o back já filtra. Situação do registro NÃO
// entra: `GET /secoes` lista só as ativas e não tem parâmetro para as
// desativadas — inventar o filtro seria prometer um conjunto que a API não
// devolve.
export const FILTROS_DA_LISTA = Object.freeze({ tipo: '' });

// Trecho inicial do texto, para a lista dar ideia do conteúdo sem virar
// parede de texto. As quebras viram espaço: numa célula de tabela elas não
// ajudam a reconhecer a seção.
export const TAMANHO_TRECHO = 120;

export const trechoInicial = (texto) => {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim();
  if (limpo.length <= TAMANHO_TRECHO) return limpo;
  return `${limpo.slice(0, TAMANHO_TRECHO).trimEnd()}…`;
};

// O estado da tela → os parâmetros de `GET /secoes`. Vazio não vai. A busca do
// backend ignora caixa e acento — nada a normalizar aqui.
export const consultaDaLista = (filtros, { page, limit, busca }) => {
  const consulta = { page, limit };
  if (busca) consulta.busca = busca;
  if (filtros.tipo) consulta.tipo = filtros.tipo;
  return consulta;
};

// "Filtros aplicados: …".
export const descricaoDoRecorteDeSecoes = ({ filtros = {}, busca = '' } = {}) => {
  const trechos = [];
  const termo = (busca ?? '').trim();
  if (termo) trechos.push(`com "${termo}"`);
  if (filtros.tipo) trechos.push(`do tipo "${labelDe(TIPO_SECAO_OPTIONS, filtros.tipo)}"`);
  if (trechos.length === 0) return '';
  return trechos.join(' e ');
};

// A linha abre a edição — é o registro da seção. O "Ver" (prévia em modal)
// continua no ⋮.
export const destinoDaLinha = (secao) =>
  secao?._id ? `/dashboard/secoes/editar/${secao._id}` : null;

export default {
  FILTROS_DA_LISTA,
  TAMANHO_TRECHO,
  trechoInicial,
  consultaDaLista,
  descricaoDoRecorteDeSecoes,
  destinoDaLinha,
};
