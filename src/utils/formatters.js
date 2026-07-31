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
