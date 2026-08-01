export const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return 'Data inválida';
  }
};

export const formatCurrency = (value) => {
  if (value === undefined || value === null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Moeda compacta, para rótulo sobre barra e tick de eixo: "R$ 12,5 mil".
//
// `Intl` com `notation: "compact"` já sabe dizer "mil", "mi" e "bi" em
// português — não há tabela de sufixo escrita à mão, e nenhuma dependência
// nova. O que existia antes no gráfico era `R$${(v/1000).toFixed(0)}k`, com o
// "k" do inglês e sem separador decimal brasileiro.
//
// O valor por extenso continua saindo pelo `formatCurrency` no tooltip: o
// rótulo compacto é para caber sobre a barra, e nunca é a única forma de ler
// o número.
export const formatCurrencyCompact = (value) => {
  if (value === undefined || value === null) return '—';
  const numero = Number(value);
  if (!Number.isFinite(numero)) return '—';
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
  });
};

// "2026-07" → "julho/2026". O `mesReferencia` do resumo financeiro e o eixo do
// gráfico de honorários por mês usam a mesma chave `AAAA-MM`.
//
// A data é montada em UTC (`Date.UTC`) porque a chave não tem dia nem hora:
// `new Date("2026-07")` é interpretado como UTC pelo próprio parser, e um
// `new Date(2026, 6, 1)` local traria de volta o desencontro de fuso que o
// backend fecha ao recortar o mês em UTC.
export const formatMonthKey = (chave, { curto = false } = {}) => {
  if (typeof chave !== 'string') return '—';
  const [ano, mes] = chave.split('-').map(Number);
  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) return chave;

  const nome = new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString('pt-BR', {
    month: curto ? 'short' : 'long',
    timeZone: 'UTC',
  }).replace('.', '');

  return `${nome}/${ano}`;
};

// "10%", "12,5%", "33,33%" — o percentual contratado do honorário (Fase 4.1).
//
// Espelha `percentual` de `utils/templateFormatters.js` no backend, que é quem
// escreve o número dentro do contrato: vírgula decimal, no máximo duas casas,
// zeros à direita descartados e o símbolo COLADO no número, porque em português
// "%" não se separa do algarismo.
//
// Uma diferença deliberada em relação ao backend: lá o vazio sai como "" para o
// marcador virar pendência 422 no documento; aqui sai como "—", que é o que
// `formatCurrency` e `formatDate` já fazem nesta tela. Honorário fixo e custas
// chegam com `percentual: null` e é isso que a coluna deve mostrar.
export const formatPercent = (value) => {
  if (value === undefined || value === null || value === '') return '—';
  const numero = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numero) || numero <= 0) return '—';
  const formatado = numero.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatado}%`;
};

export const formatCPF = (cpf) => {
  if (!cpf) return '—';
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

export const formatCNPJ = (cnpj) => {
  if (!cnpj) return '—';
  const d = cnpj.replace(/\D/g, '');
  if (d.length !== 14) return cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

export const formatPhone = (phone) => {
  if (!phone) return '—';
  const d = phone.replace(/\D/g, '');
  if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return phone;
};

export const formatCEP = (cep) => {
  if (!cep) return '—';
  const d = cep.replace(/\D/g, '');
  if (d.length !== 8) return cep;
  return d.replace(/(\d{5})(\d{3})/, '$1-$2');
};
