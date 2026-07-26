// Máscaras para digitação ao vivo.
// Regra de ouro: o estado do input guarda o valor MASCARADO (o que o usuário vê);
// o payload enviado à API leva SÓ DÍGITOS, via unmask. O backend normaliza e valida
// dígitos verificadores — enviar máscara gera 400.

export const unmask = (value) => (value == null ? '' : String(value).replace(/\D/g, ''));

export const maskCPF = (value) => {
  const d = unmask(value).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const maskCNPJ = (value) => {
  const d = unmask(value).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

export const maskCEP = (value) => {
  const d = unmask(value).slice(0, 8);
  return d.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
};

export const maskPhone = (value) => {
  const d = unmask(value).slice(0, 11);
  if (d.length <= 10) {
    // (00) 0000-0000
    return d
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  // (00) 00000-0000
  return d
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
};
