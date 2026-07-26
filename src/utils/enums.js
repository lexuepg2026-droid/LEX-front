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

// Devolve o rótulo correspondente ao value, ou '—' quando vazio/desconhecido.
export const labelDe = (options, value) => {
  if (!value) return '—';
  const found = options.find((o) => o.value === value);
  return found ? found.label : '—';
};
