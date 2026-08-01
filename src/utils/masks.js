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

// ═══════════════════════════════════════════════════════════════════════════
// MOEDA — a exceção à regra de ouro deste arquivo (Fase 4.3)
//
// As quatro máscaras acima entregam **só dígitos** ao payload: CPF, CNPJ, CEP
// e telefone são cadeias de caracteres, e a pontuação é enfeite de tela.
//
// Dinheiro não é. `valor`, `valorBase` e `valorPago` viajam como **Number em
// reais** desde a Fase 1, e a 4.2 fixou isso por escrito no contrato dos três
// formulários financeiros. A máscara de moeda formata o que se digita e
// devolve um NÚMERO, não uma string de dígitos — mandar "123456" onde o
// backend espera 1234.56 seria multiplicar a cobrança por cem.
//
// Escrita à mão, no padrão do arquivo, porque a fase não autoriza dependência
// nova — e porque uma biblioteca de máscara de moeda traz junto o próprio
// modelo de estado do input, que brigaria com o dos quatro que já existem.
// ═══════════════════════════════════════════════════════════════════════════

// Quantas casas decimais o real tem. Constante porque três funções abaixo
// precisam concordar sobre o número.
const CASAS_DECIMAIS = 2;

// Agrupa o milhar com ponto: "1234567" → "1.234.567".
const agruparMilhar = (inteiro) => inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ── `maskMoney` — o que aparece enquanto se digita ─────────────────────────
//
// A advogada digita a VÍRGULA. Não é a única convenção possível (há inputs que
// preenchem os centavos da direita para a esquerda e dispensam a vírgula), mas
// é a que corresponde ao que ela escreveria num papel — e a maioria dos
// honorários é valor redondo, em que o acumulador de centavos obrigaria a
// digitar "300000" para dizer três mil.
//
// ── O ponto é SEMPRE separador de milhar aqui, e isso não é descuido ───────
// Esta função é reaplicada sobre a própria saída a cada tecla: com "1.500" na
// tela, digitar mais um zero entrega "1.5000" a ela. Qualquer regra que
// tentasse adivinhar se aquele ponto é decimal erra em algum caminho real —
// apagar o último dígito de "1.500" entrega "1.50", que por "ponto seguido de
// duas casas" viraria R$ 1,50 em vez de R$ 150,00.
//
// Por isso o ponto digitado NÃO é tratado aqui: quem o converte em vírgula é
// o `onKeyDown` de `MoneyInput`, que sabe a diferença entre "a pessoa apertou
// a tecla de ponto" e "o ponto está na string porque esta função o pôs lá".
// A colagem de "1234.56" é outro caminho ainda, e quem a resolve é
// `parseMoney`.
export const maskMoney = (value) => {
  if (value == null) return '';

  const bruto = String(value).replace(/[^\d,]/g, '');

  // Só a PRIMEIRA vírgula separa; as demais somem. Duas vírgulas não descrevem
  // valor nenhum, e apagar a segunda é menos surpreendente que recusar a tecla.
  const primeira = bruto.indexOf(',');
  const inteiroBruto = primeira === -1 ? bruto : bruto.slice(0, primeira);
  const decimalBruto = primeira === -1 ? null : bruto.slice(primeira + 1).replace(/,/g, '');

  // Zeros à esquerda somem, mas "0," e "0,5" continuam possíveis — apagar o
  // zero de "0,50" deixaria a vírgula órfã.
  const inteiro = inteiroBruto.replace(/^0+(?=\d)/, '');

  if (decimalBruto === null) return agruparMilhar(inteiro);
  return `${agruparMilhar(inteiro || '0')},${decimalBruto.slice(0, CASAS_DECIMAIS)}`;
};

// ── `parseMoney` — texto → Number em reais, ou `null` ──────────────────────
//
// Aceita os dois formatos que aparecem numa colagem real:
//
//   "1.234,56"  planilha/sistema em pt-BR  → 1234.56
//   "1234.56"   extrato, CSV, API          → 1234.56
//
// A ambiguidade é o ponto sem vírgula. A regra é explícita:
//
//   tem vírgula          → a vírgula decide; todo ponto é milhar
//   um ponto só, com 1–2 dígitos depois → o ponto é decimal ("1234.5")
//   qualquer outro caso  → todo ponto é milhar ("1.234" = mil duzentos e
//                          trinta e quatro, que é o que a advogada quis dizer)
//
// Sem essa regra, "1.234" colado de uma planilha brasileira viraria R$ 1,23.
//
// Campo esvaziado devolve `null`, e não 0: são coisas diferentes. Zero é uma
// cobrança de zero real; `null` é "não informado", e é o que a convenção do
// projeto grava para campo apagado.
export const parseMoney = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const texto = String(value).trim();
  if (texto === '') return null;

  const negativo = /^-/.test(texto);
  const corpo = texto.replace(/[^\d.,]/g, '');
  if (corpo === '') return null;

  let normalizado;
  if (corpo.includes(',')) {
    normalizado = corpo.replace(/\./g, '').replace(',', '.');
  } else {
    const partes = corpo.split('.');
    const ultima = partes[partes.length - 1];
    normalizado = partes.length === 2 && ultima.length <= CASAS_DECIMAIS && ultima.length > 0
      ? corpo
      : partes.join('');
  }

  const numero = Number(normalizado);
  if (!Number.isFinite(numero)) return null;
  return negativo ? -numero : numero;
};

// ── `formatMoneyInput` — Number → o texto do input ─────────────────────────
//
// Usado quando o valor vem de FORA (edição de um honorário já gravado), não a
// cada tecla. Duas casas sempre: um valor gravado é valor fechado, e "R$ 3.000"
// e "R$ 3.000,00" na mesma tela, em momentos diferentes, parecem campos
// diferentes.
//
// Sem o símbolo: o "R$" é adorno do input, fora do campo editável, para o
// cursor nunca disputar espaço com ele.
export const formatMoneyInput = (value) => {
  const numero = typeof value === 'number' ? value : parseMoney(value);
  if (numero == null) return '';
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: CASAS_DECIMAIS,
    maximumFractionDigits: CASAS_DECIMAIS,
  });
};
