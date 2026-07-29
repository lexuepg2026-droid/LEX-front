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
