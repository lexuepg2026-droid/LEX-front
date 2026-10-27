import { formatCEP, formatCNPJ, formatCPF, formatDate, formatPhone } from '../../utils/formatters.js';
import { ESTADO_CIVIL_OPTIONS, PAPEL_PROCESSO_OPTIONS, SEXO_OPTIONS, labelDe, nomeDoCliente } from '../../utils/enums.js';

// ═══════════════════════════════════════════════════════════════════════════
// O DETALHE DO CLIENTE — as regras que a tela só exibe (Fase 3.5, DEC-123)
//
// Funções puras, pela razão de sempre: a suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

// ── As abas, na URL (`?aba=`) ──────────────────────────────────────────────
// "Detalhes", "Processos" e "Portal". A aba "Pagamentos" da Figura 21 NÃO
// entra (decisão 5): o financeiro é por processo, e a ficha do processo já o
// mostra inteiro. "Detalhes" é o padrão e se escreve SEM `?aba=` — uma URL só
// para cada aba, como o mês do Início (DEC-098).
export const ABAS = Object.freeze([
  { id: 'detalhes', rotulo: 'Detalhes' },
  { id: 'processos', rotulo: 'Processos' },
  { id: 'portal', rotulo: 'Portal' },
]);
export const ABA_PADRAO = 'detalhes';

// `?aba=` desconhecida (um link torto, uma aba que deixou de existir) abre a
// padrão, como o `?mes=` inválido do Início.
export const abaDaUrl = (search) => {
  const valor = new URLSearchParams(search || '').get('aba');
  return ABAS.some((a) => a.id === valor) ? valor : ABA_PADRAO;
};

// A query da aba, preservando o resto da query. A padrão tira o parâmetro.
export const queryDaAba = (search, aba) => {
  const params = new URLSearchParams(search || '');
  if (aba === ABA_PADRAO) params.delete('aba');
  else params.set('aba', aba);
  const texto = params.toString();
  return texto ? `?${texto}` : '';
};

// ── O cabeçalho ───────────────────────────────────────────────────────────
export const tipoPorExtenso = (cliente) =>
  (cliente?.tipoPessoa === 'juridica' ? 'Pessoa jurídica' : 'Pessoa física');

// O documento formatado e o que é ("CPF" / "CNPJ"), para o botão de copiar
// dizer o que copia. Sem documento, `null` — e o botão não aparece.
export const documentoDoCabecalho = (cliente) => {
  if (!cliente) return null;
  const pj = cliente.tipoPessoa === 'juridica';
  const bruto = pj ? cliente.cnpj : cliente.cpf;
  if (!bruto) return null;
  return { rotulo: pj ? 'CNPJ' : 'CPF', valor: pj ? formatCNPJ(bruto) : formatCPF(bruto) };
};

// ── A aba "Detalhes": os dados em balões por grupo ────────────────────────
// Os curtos aparecem sempre, com "—" quando vazios (como no desenho dela); os
// de texto livre, só quando existem. Um grupo sem nada a dizer sai inteiro:
// o PJ não tem "Dados profissionais", e o representante legal só aparece na PJ.
const valor = (v) => (typeof v === 'string' ? v.trim() : v) || '—';

const enderecoPorLinhas = (e) => {
  if (!e || !Object.values(e).some(Boolean)) return null;
  const logradouro = [e.logradouro, e.numero ? `nº ${e.numero}` : null].filter(Boolean).join(', ');
  return [
    ['Logradouro', logradouro],
    ['Complemento', e.complemento],
    ['Bairro', e.bairro],
    ['Cidade/UF', [e.cidade, e.estado].filter(Boolean).join('/')],
    ['CEP', e.cep ? formatCEP(e.cep) : null],
    ['País', e.pais],
  ].map(([r, v]) => [r, valor(v)]);
};

export const gruposDeDados = (cliente) => {
  if (!cliente) return [];
  const pj = cliente.tipoPessoa === 'juridica';
  const grupos = [];

  grupos.push({
    id: 'identificacao',
    titulo: 'Identificação',
    itens: pj
      ? [
          ['Razão social', valor(cliente.razaoSocial)],
          ['Nome fantasia', valor(cliente.nomeFantasia)],
          ['CNPJ', cliente.cnpj ? formatCNPJ(cliente.cnpj) : '—'],
        ]
      : [
          ['Nome completo', valor(cliente.nomeCompleto)],
          ['CPF', cliente.cpf ? formatCPF(cliente.cpf) : '—'],
          ['RG', valor(cliente.rg)],
          ['Data de nascimento', cliente.dataNascimento ? formatDate(cliente.dataNascimento) : '—'],
          ['Sexo', labelDe(SEXO_OPTIONS, cliente.sexo)],
          ['Estado civil', labelDe(ESTADO_CIVIL_OPTIONS, cliente.estadoCivil)],
        ],
  });

  grupos.push({
    id: 'contato',
    titulo: 'Contato',
    itens: [
      ['E-mail', valor(cliente.email)],
      ['Telefone', cliente.telefone ? formatPhone(cliente.telefone) : '—'],
    ],
  });

  const endereco = enderecoPorLinhas(cliente.endereco);
  grupos.push({ id: 'endereco', titulo: 'Endereço', itens: endereco ?? [['Endereço', '—']] });

  if (!pj) {
    grupos.push({
      id: 'profissional',
      titulo: 'Dados profissionais',
      itens: [
        ['Profissão', valor(cliente.profissao)],
        ['Nacionalidade', valor(cliente.nacionalidade)],
      ],
    });
  }

  const rep = cliente.representanteLegal;
  if (pj) {
    grupos.push({
      id: 'representante',
      titulo: 'Representante legal',
      itens: rep && (rep.nome || rep.cpf || rep.cargo)
        ? [
            ['Nome', valor(rep.nome)],
            ['CPF', rep.cpf ? formatCPF(rep.cpf) : '—'],
            ['Cargo', valor(rep.cargo)],
          ]
        : [['Representante', 'Não informado']],
    });
  }

  if (typeof cliente.observacoes === 'string' && cliente.observacoes.trim()) {
    grupos.push({ id: 'observacoes', titulo: 'Observações', itens: [['Observações', cliente.observacoes.trim()]], largo: true });
  }

  return grupos;
};

// ── A aba "Processos" ─────────────────────────────────────────────────────
// O papel DESTE cliente no processo, lido dos participantes da listagem
// (`anexarParticipantes`). Sem o vínculo na mão (contrato antigo), `null`: a
// tela diz "—" e não inventa "autor".
export const vinculoDoCliente = (processo, clienteId) => {
  const v = (processo?.participantes ?? []).find(
    (p) => String(p.clienteId?._id ?? p.clienteId) === String(clienteId)
  );
  if (!v) return null;
  return { papel: labelDe(PAPEL_PROCESSO_OPTIONS, v.papel), principal: v.principal === true };
};

export const destinoDoProcesso = (processoId) => `/dashboard/processos/detalhe/${processoId}`;
export const listaDeProcessosDoCliente = (clienteId) => `/dashboard/processos?clienteId=${encodeURIComponent(clienteId)}`;

// ── A aba "Portal" ────────────────────────────────────────────────────────
// A situação de cada processo do cliente, no vocabulário do detalhe do
// processo (`situacaoNoPortal`, DEC-111) mais os dois casos que só esta lista
// tem: o vínculo removido e o processo desativado, onde a liberação não
// alcança (DEC-091). O interruptor só existe quando ela alcança.
export const situacaoDoProcessoNoPortal = (item, { temSenhaPortal }) => {
  if (!item) return null;
  if (item.processoAtivo === false) return { status: null, texto: 'Processo desativado', interruptor: false };
  if (item.vinculoAtivo === false) return { status: null, texto: 'Removido do processo', interruptor: false };
  if (!temSenhaPortal) return { status: 'portal_sem_acesso', texto: null, interruptor: false };
  return {
    status: item.liberadoNoPortal ? 'portal_liberado' : 'portal_nao_liberado',
    texto: null,
    interruptor: true,
  };
};

export const rotuloDoProcesso = (item) => {
  const numero = typeof item?.numeroProcesso === 'string' ? item.numeroProcesso.trim() : '';
  const titulo = typeof item?.titulo === 'string' ? item.titulo.trim() : '';
  if (numero && titulo) return `${numero} — ${titulo}`;
  return numero || titulo || '(sem título)';
};

export { nomeDoCliente };

export default {
  ABAS,
  ABA_PADRAO,
  abaDaUrl,
  queryDaAba,
  tipoPorExtenso,
  documentoDoCabecalho,
  gruposDeDados,
  vinculoDoCliente,
  destinoDoProcesso,
  listaDeProcessosDoCliente,
  situacaoDoProcessoNoPortal,
  rotuloDoProcesso,
};
