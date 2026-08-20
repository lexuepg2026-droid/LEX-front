// ═══════════════════════════════════════════════════════════════════════════
// SINGULAR E PLURAL — Fase F-1b.3.1
//
// ── O defeito que originou isto ──────────────────────────────────────────
// O rodapé de Parcelas filtradas por honorário dizia "1 parcelas". O rótulo
// chegava ao paginador já no plural (`rotulo="parcelas"`), porque as três
// listagens e o extrato passam o nome da coleção, não o do item. Com um
// resultado só, a frase mente sobre a própria contagem — e é justamente com
// UM resultado que a advogada está conferindo se o filtro achou o lançamento
// certo.
//
// ── Por que uma função pura, e não um `if` no componente ─────────────────
// Mesma razão de `paginacao.js`: a suíte é `node --test` sem DOM (Fase 2E.2).
// Regra de plural dentro do JSX só se testaria por varredura de texto, que
// prova que a linha existe e não que ela conjuga certo. Aqui as quatro
// palavras do sistema são fixadas por teste, com 0, 1, 2 e um número grande.
//
// ── O escopo: as regras que as nossas palavras exigem ────────────────────
// NÃO é um pluralizador de português. Português tem plural irregular
// suficiente para encher um pacote npm, e o projeto não ganha dependência
// (regra do projeto) nem inventa requisito. As regras abaixo cobrem as quatro
// palavras que os rodapés usam hoje — "parcela", "pagamento", "honorário",
// "movimentação" — mais as terminações vizinhas que a próxima listagem
// provavelmente traz ("cliente", "processo", "documento", "seção").
//
// Quem precisar de um plural que estas regras erram passa o par explícito em
// `PLURAIS_IRREGULARES`, e o erro fica registrado no lugar onde se procura.
// ═══════════════════════════════════════════════════════════════════════════

// Onde a regra não alcança. Vazio de propósito: nenhuma palavra do sistema
// precisa dele hoje, e uma tabela pré-preenchida "por precaução" seria uma
// lista de plurais que ninguém usa e ninguém revisa.
const PLURAIS_IRREGULARES = {};

// A palavra no plural. Recebe o SINGULAR — é ele que o chamador conhece, e é
// dele que se deriva o plural, nunca o contrário: "pagamentos" → "pagamento"
// exigiria saber que a palavra não termina em "s" no singular.
export const pluralDe = (singular) => {
  if (typeof singular !== 'string' || singular === '') return singular;

  const irregular = PLURAIS_IRREGULARES[singular];
  if (irregular) return irregular;

  // "movimentação" → "movimentações", "seção" → "seções". Precisa vir ANTES da
  // regra de vogal: "ão" termina em vogal e viraria "movimentaçãos".
  if (singular.endsWith('ão')) return `${singular.slice(0, -2)}ões`;

  // "papel" → "papéis", "contratual" → "contratuais". A troca do "e" por "é" é
  // o que separa "papéis" de "papeis".
  if (singular.endsWith('el')) return `${singular.slice(0, -2)}éis`;
  if (singular.endsWith('l')) return `${singular.slice(0, -1)}is`;

  // "homem" → "homens".
  if (singular.endsWith('m')) return `${singular.slice(0, -1)}ns`;

  // "valor" → "valores", "juiz" → "juízes" (o acento é irregular; "z" simples
  // basta para o que temos).
  if (singular.endsWith('r') || singular.endsWith('z')) return `${singular}es`;

  // Já plural, ou invariável ("lápis"): não recebe um segundo "s".
  if (singular.endsWith('s')) return singular;

  // O caso comum, e o das nossas quatro palavras: vogal + "s".
  // "parcela" → "parcelas", "pagamento" → "pagamentos",
  // "honorário" → "honorários".
  return `${singular}s`;
};

// A palavra concordando com a quantidade. É esta que os rodapés chamam.
//
// ZERO vai para o PLURAL — "0 parcelas", e não "0 parcela". É a concordância
// do português e é o que se lê em qualquer lista vazia; o singular é só o 1.
// (Um rodapé de conjunto vazio raramente aparece, porque o `EmptyState` toma a
// tela antes; mas `frasePosicao` decide sozinha o que fazer com o zero, e a
// função não pode depender de quem a chama ter tratado o caso.)
export const pluralizar = (quantidade, singular) => {
  const n = Number(quantidade);
  return Math.abs(n) === 1 ? singular : pluralDe(singular);
};

export default { pluralDe, pluralizar };
