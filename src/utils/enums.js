// Fonte única dos rótulos exibidos na UI. Cada opção é { value, label }.

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO'
].map((uf) => ({ value: uf, label: uf }));

export const SEXO_OPTIONS = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
];

// O rótulo "União estável (amasiado)" atende a apontamento da banca.
// "uniao_estavel" (termo do Código Civil) é o valor técnico persistido;
// "amasiado" aparece apenas no rótulo, por ser a mesma situação jurídica.
export const ESTADO_CIVIL_OPTIONS = [
  { value: 'solteiro', label: 'Solteiro(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'separado_judicialmente', label: 'Separado(a) judicialmente' },
  { value: 'divorciado', label: 'Divorciado(a)' },
  { value: 'viuvo', label: 'Viúvo(a)' },
  { value: 'uniao_estavel', label: 'União estável (amasiado)' },
];

export const TIPO_PESSOA_OPTIONS = [
  { value: 'fisica', label: 'Pessoa Física' },
  { value: 'juridica', label: 'Pessoa Jurídica' },
];

// Papel do cliente dentro do processo. Mesmos valores do enum de
// `processo_clientes` no backend — se divergirem, o POST volta 400.
export const PAPEL_PROCESSO_OPTIONS = [
  { value: 'autor', label: 'Autor' },
  { value: 'reu', label: 'Réu' },
  { value: 'terceiro_interessado', label: 'Terceiro interessado' },
  { value: 'litisconsorte', label: 'Litisconsorte' },
];

// Tipo da seção de documento. Mesmos 8 valores do enum TIPOS_SECAO do backend —
// se divergirem, o POST volta 400. Os rótulos seguem o vocabulário que a
// advogada usa ao montar a peça, na ordem em que as partes costumam aparecer
// no documento.
export const TIPO_SECAO_OPTIONS = [
  { value: 'qualificacao', label: 'Qualificação' },
  { value: 'objeto', label: 'Objeto' },
  { value: 'clausula', label: 'Cláusula' },
  { value: 'fundamentacao', label: 'Fundamentação' },
  { value: 'pedido', label: 'Pedido' },
  { value: 'encerramento', label: 'Encerramento' },
  { value: 'assinatura', label: 'Assinatura' },
  { value: 'outro', label: 'Outro' },
];

// Tipo do documento. Mesmos 10 valores do enum TIPOS_DOCUMENTO do backend — se
// divergirem, o POST volta 400. Os rótulos são o nome da peça como a advogada
// a chama ao pedir, não o identificador técnico.
export const TIPO_DOCUMENTO_OPTIONS = [
  { value: 'procuracao', label: 'Procuração' },
  { value: 'contrato_prestacao_servicos', label: 'Contrato de prestação de serviços' },
  { value: 'declaracao_isencao_ir', label: 'Declaração de isenção de IR' },
  { value: 'declaracao_autonomo', label: 'Declaração de autônomo' },
  { value: 'declaracao_hipossuficiencia', label: 'Declaração de hipossuficiência' },
  { value: 'declaracao_renuncia', label: 'Declaração de renúncia' },
  { value: 'peticao', label: 'Petição' },
  { value: 'sentenca', label: 'Sentença' },
  { value: 'comprovante', label: 'Comprovante' },
  { value: 'outro', label: 'Outro' },
];

// ── Financeiro (Fase 4.2) ──────────────────────────────────────────────────

// Tipo do honorário. Mesmos 3 valores de `TIPOS_HONORARIO` do backend
// (`models/Fee.js`) — se divergirem, o POST volta 400.
//
// ⚠️ O vocabulário está PENDENTE DE RATIFICAÇÃO da advogada: "custas" é despesa
// processual e pode não pertencer a este enum, e "êxito"/"sucumbência" podem
// estar faltando. Nada disso se decide aqui — os valores são os que o backend
// aceita hoje.
export const TIPO_HONORARIO_OPTIONS = [
  { value: 'fixo', label: 'Fixo' },
  { value: 'percentual', label: 'Percentual' },
  { value: 'custas', label: 'Custas processuais' },
];

// O único tipo que implica percentagem. Isolado em constante pela mesma razão
// que no backend: três lugares precisam da mesma resposta para "este tipo admite
// percentual?".
export const TIPO_PERCENTUAL = 'percentual';

// Status do honorário (`STATUS_HONORARIO`). Três dos quatro são DERIVADOS das
// parcelas pelo backend (DEC-028) e a tela só os EXIBE; `cancelado` é o único
// que ela escreve. Por isso não existe `<select>` de status no formulário — ver
// `utils/feeCalc.js`.
export const STATUS_HONORARIO_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'parcialmente_pago', label: 'Parcialmente pago' },
  { value: 'pago', label: 'Pago' },
  { value: 'cancelado', label: 'Cancelado' },
];

export const STATUS_CANCELADO = 'cancelado';

// Status da parcela, também derivado (do valor pago e do vencimento).
export const STATUS_PARCELA_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pago', label: 'Pago' },
  { value: 'vencido', label: 'Vencido' },
];

// Forma de pagamento, do enum do model `Payment`.
export const FORMA_PAGAMENTO_OPTIONS = [
  { value: 'pix', label: 'Pix' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'cartao_credito', label: 'Cartão de Crédito' },
  { value: 'cartao_debito', label: 'Cartão de Débito' },
  { value: 'transferencia', label: 'Transferência' },
];

// Nome de exibição de um cliente, que depende do tipo de pessoa. Repetido em
// três telas antes desta função existir.
export const nomeDoCliente = (cliente) => {
  if (!cliente || typeof cliente !== 'object') return '—';
  const nome = cliente.tipoPessoa === 'fisica' ? cliente.nomeCompleto : cliente.razaoSocial;
  return nome || '—';
};

export const documentoDoCliente = (cliente) => {
  if (!cliente || typeof cliente !== 'object') return '';
  return cliente.tipoPessoa === 'fisica'
    ? (cliente.cpf ? `CPF: ${cliente.cpf}` : '')
    : (cliente.cnpj ? `CNPJ: ${cliente.cnpj}` : '');
};

// Devolve o rótulo correspondente ao value, ou '—' quando vazio/desconhecido.
export const labelDe = (options, value) => {
  if (!value) return '—';
  const found = options.find((o) => o.value === value);
  return found ? found.label : '—';
};
