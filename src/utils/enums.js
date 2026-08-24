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

// ── Processo: fase e encerramento (DEC-054, F-2d) ──────────────────────────

// Fase processual. Mesmos 4 valores de `FASES_PROCESSO` do backend
// (`config/fasesProcesso.js`) — se divergirem, o PATCH volta 400. Espelho sem
// endpoint, de propósito e pela mesma razão do tipo de honorário: é constante,
// não dado. Há teste nos dois repos travando que as listas não divergiram.
//
// **O vocabulário é da Laís**, dito em 23/08/2026: *"fase inicial (fase de
// conhecimento) / sentença / execução / recursos"*.
//
// ⚠️ O rótulo da primeira está **PENDENTE DE RATIFICAÇÃO**: ela deu duas
// palavras para a mesma fase. Adotado "Fase de conhecimento" porque "inicial" é
// posicional e deixa de valer quando o processo VOLTA — e ela disse que pode
// voltar. Trocar o rótulo aqui não migra nada: o valor gravado é
// `conhecimento`.
//
// ── A ordem é de EXIBIÇÃO, não de obrigação ───────────────────────────────
// É a ordem em que ela as disse. **Não existe transição proibida**: qualquer
// fase vai para qualquer fase, inclusive para trás. Nenhuma tela deste repo
// compara posições nesta lista — procure por um `indexOf` contra ela e não vai
// achar nenhum.
export const FASE_PROCESSO_OPTIONS = [
  { value: 'conhecimento', label: 'Fase de conhecimento' },
  { value: 'sentenca', label: 'Sentença' },
  { value: 'execucao', label: 'Execução' },
  { value: 'recursos', label: 'Recursos' },
];

// Rótulo da fase, pelo caminho único. Existe para que nenhuma tela monte o
// texto por conta própria — foi o que a tela de processos fazia com o `status`,
// capitalizando a string crua do enum, e é como "parcialmente_pago" chegou a
// aparecer com sublinhado na interface.
export const rotuloDaFase = (fase) => labelDe(FASE_PROCESSO_OPTIONS, fase);

// Filtro de liminar da listagem. Três estados, e o padrão é não filtrar — o
// backend ignora qualquer valor fora de `com`/`sem`.
export const FILTRO_LIMINAR_OPTIONS = [
  { value: '', label: 'Com e sem liminar' },
  { value: 'com', label: 'Somente com liminar' },
  { value: 'sem', label: 'Somente sem liminar' },
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

// Tipo de pagamento, do enum do model `Payment` (F-1a).
//
// A distinção é do PEDIDO, não do resultado: os dois passam pelo mesmo motor de
// alocação, e um pagamento `comum` que sobra também alimenta o saldo. O tipo
// diz o que a advogada quis fazer, e é isso que o extrato precisa mostrar meses
// depois.
export const TIPO_PAGAMENTO_OPTIONS = [
  { value: 'comum', label: 'Pagamento comum' },
  { value: 'adiantamento', label: 'Adiantamento' },
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
