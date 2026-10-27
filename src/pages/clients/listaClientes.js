import { ORDEM_CLIENTE_PADRAO, ORDENS_CLIENTE } from '../../utils/ordemCliente.js';
import { labelDe, nomeDoCliente } from '../../utils/enums.js';
import { formatCPF, formatCNPJ, formatPhone } from '../../utils/formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE CLIENTES — as regras que a tela só exibe (Fase 3.5, DEC-121)
//
// Funções puras, pela razão de sempre: a suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

// Os filtros da lista, como chaves do estado e da URL (`useListFilters` com
// `naUrl`, DEC-103).
//
// ── `situacao` aqui é o PRÓPRIO filtro, e o risco anotado na 3.4 ─────────
// `filtrosNaUrl` escreve a chave `status` do estado como `?situacao=` (o nome
// das listas financeiras). Na lista de processos isso obrigou o status
// jurídico a se chamar `andamento`. Aqui não há status jurídico: a única
// situação é a do REGISTRO (DEC-052), e ela mora na chave `situacao`, que vai
// à URL com o mesmo nome. Por isso esta lista NÃO pode ter uma chave `status`
// — ela iria para `?situacao=` e brigaria com esta. Há teste.
export const FILTROS_DA_LISTA = Object.freeze({
  situacao: '',
  tipoPessoa: '',
  portal: '',
  ordem: '',
});

// Os filtros que RECORTAM. A ordem não recorta (DEC-062): não entra em
// "Filtros aplicados" e não faz a lista parecer curta.
export const CHAVES_DE_RECORTE = Object.freeze(['situacao', 'tipoPessoa', 'portal']);

// DEC-052: "" é "Somente ativos" — o padrão do back sem `situacao`.
export const SITUACAO_OPTIONS = Object.freeze([
  { value: '', label: 'Somente ativos' },
  { value: 'inativos', label: 'Somente desativados' },
  { value: 'todos', label: 'Ativos e desativados' },
]);

export const TIPO_PESSOA_OPTIONS_FILTRO = Object.freeze([
  { value: '', label: 'Todos os tipos' },
  { value: 'PF', label: 'Pessoa física' },
  { value: 'PJ', label: 'Pessoa jurídica' },
]);

// DEC-119: "Com processo não liberado" é a regra do cartão do Início
// (DEC-108), contada por cliente.
export const PORTAL_OPTIONS = Object.freeze([
  { value: '', label: 'Portal: todos' },
  { value: 'com_acesso', label: 'Com acesso' },
  { value: 'sem_acesso', label: 'Sem acesso' },
  { value: 'nao_liberado', label: 'Com processo não liberado' },
]);

// DEC-062: o padrão (A–Z) é o valor vazio, fora da URL de quem não mexeu.
export const ORDEM_OPTIONS = Object.freeze(
  ORDENS_CLIENTE.map((o) => ({ value: o.valor === ORDEM_CLIENTE_PADRAO ? '' : o.valor, label: o.rotulo }))
);

export const temRecorte = (filtros = {}, busca = '') =>
  Boolean((busca ?? '').trim()) || CHAVES_DE_RECORTE.some((c) => Boolean(filtros[c]));

// O estado da tela → os parâmetros de `GET /clients`. Vazio não vai; a ordem
// vai SEMPRE, explícita (a razão está em `api/clientService.js`).
export const consultaDaLista = (filtros, { page, limit, busca }) => {
  const consulta = { page, limit, ordem: filtros.ordem || ORDEM_CLIENTE_PADRAO };
  if (busca) consulta.busca = busca;
  if (filtros.situacao) consulta.situacao = filtros.situacao;
  if (filtros.tipoPessoa) consulta.tipoPessoa = filtros.tipoPessoa;
  if (filtros.portal) consulta.portal = filtros.portal;
  return consulta;
};

// "Filtros aplicados: …" em português, como a das outras listas.
export const descricaoDoRecorteDeClientes = ({ filtros = {}, busca = '' } = {}) => {
  const trechos = [];
  const termo = (busca ?? '').trim();
  if (termo) trechos.push(`com "${termo}"`);
  if (filtros.tipoPessoa) trechos.push(labelDe(TIPO_PESSOA_OPTIONS_FILTRO, filtros.tipoPessoa).toLowerCase());
  if (filtros.portal === 'com_acesso') trechos.push('com acesso ao portal');
  if (filtros.portal === 'sem_acesso') trechos.push('sem acesso ao portal');
  if (filtros.portal === 'nao_liberado') trechos.push('com processo não liberado no portal');
  if (filtros.situacao === 'inativos') trechos.push('somente desativados');
  if (filtros.situacao === 'todos') trechos.push('ativos e desativados');

  if (trechos.length === 0) return '';
  if (trechos.length === 1) return trechos[0];
  return `${trechos.slice(0, -1).join(', ')} e ${trechos[trechos.length - 1]}`;
};

// Para onde a linha leva. Cliente desativado não tem detalhe (o back responde
// 404 a `GET /clients/:id` de registro inativo): a linha não é clicável, e o
// caminho é o "Reativar" do ⋮ — como na lista de processos (DEC-116).
export const destinoDaLinha = (cliente) =>
  cliente && cliente.ativo !== false ? `/dashboard/clientes/detalhe/${cliente._id}` : null;

export const tipoDoCliente = (cliente) =>
  (cliente?.tipoPessoa === 'juridica' ? 'Pessoa jurídica' : 'Pessoa física');

// O documento formatado, sem o prefixo "CPF:" — a coluna já diz o que é.
export const documentoNaLista = (cliente) => {
  if (!cliente) return '—';
  const doc = cliente.tipoPessoa === 'juridica' ? formatCNPJ(cliente.cnpj) : formatCPF(cliente.cpf);
  return doc && doc !== '—' ? doc : '—';
};

export const telefoneNaLista = (cliente) => (cliente?.telefone ? formatPhone(cliente.telefone) : '—');

export { nomeDoCliente };

export default {
  FILTROS_DA_LISTA,
  CHAVES_DE_RECORTE,
  SITUACAO_OPTIONS,
  TIPO_PESSOA_OPTIONS_FILTRO,
  PORTAL_OPTIONS,
  ORDEM_OPTIONS,
  temRecorte,
  consultaDaLista,
  descricaoDoRecorteDeClientes,
  destinoDaLinha,
  tipoDoCliente,
  documentoNaLista,
  telefoneNaLista,
};
