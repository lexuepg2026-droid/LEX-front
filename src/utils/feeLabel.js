// ═══════════════════════════════════════════════════════════════════════════
// O RÓTULO CURTO DO HONORÁRIO NAS LISTAGENS — Fase F-1b.2
//
// ── O defeito ──────────────────────────────────────────────────────────────
// Na listagem de pagamentos, a coluna "Honorário" dizia "Honorári…" em quase
// toda linha. A causa imediata era a largura (100 px, corrigida para
// `col-lg`), mas alargar sozinho não resolve: as descrições reais compartilham
// um prefixo longo.
//
//   Honorários advocatícios — divórcio litigioso
//   Honorários advocatícios — ação de cobrança
//   Honorários advocatícios — usucapião urbano
//   Honorários advocatícios — fase inicial
//
// São 23 caracteres iguais antes de o texto começar a distinguir alguma coisa.
// Numa coluna que comporta ~22, alargar só troca "Honorári…" por
// "Honorários advocatíci…" — que continua sem diferenciar linha nenhuma. Uma
// coluna larga o bastante para o prefixo inteiro MAIS o específico teria de
// passar de 400 px, e aí quem some é a coluna do processo.
//
// ── A saída escolhida, entre as três do enunciado ─────────────────────────
// Nem "largura maior" sozinha (não resolve, como acima), nem "outra saída":
// **o trecho distintivo**. A descrição segue, em 9 dos 12 honorários do seed,
// a forma "categoria — específico". O que a listagem precisa é do específico;
// a categoria é justamente a parte repetida.
//
// ── O que NÃO se perde ────────────────────────────────────────────────────
// A descrição inteira continua no `title` da célula (o padrão de toda coluna
// truncada desde a 4.3) e no texto integral da página do honorário, que é para
// onde o link leva. Nada aqui apaga informação: escolhe qual metade aparece
// primeiro nos 22 caracteres que existem.
//
// ── Por que a regra é UNIFORME ────────────────────────────────────────────
// Cortar o prefixo só quando a descrição passa de N caracteres faria linhas
// vizinhas exibirem partes diferentes da mesma estrutura — algumas com
// categoria, outras sem —, e uma coluna que muda de critério linha a linha é
// pior de varrer com o olho do que uma que corta sempre no mesmo lugar.
//
// ── Por que é função pura, e não JSX ──────────────────────────────────────
// Mesma razão de `statementEntry.js` e `allocationSummary.js`: a suíte é
// `node --test` sem DOM. Aqui há separador, ausência de separador, texto vazio
// e espaço em excesso — casos que se testam de verdade.
// ═══════════════════════════════════════════════════════════════════════════

// Travessão, meia-risca ou hífen, sempre CERCADO DE ESPAÇOS. A exigência do
// espaço é o que impede "usucapião extra-judicial" e "pré-pago" de serem
// partidos ao meio: ali o hífen liga a palavra, não separa a frase.
const SEPARADOR = /\s[—–-]\s/;

// O trecho que distingue este honorário dos outros da lista.
//
// Sem separador, devolve a descrição inteira: não há prefixo a descartar, e
// inventar um corte por contagem de caracteres seria truncar duas vezes.
export const trechoDistintivo = (descricao) => {
  if (typeof descricao !== 'string') return '';

  const texto = descricao.trim();
  if (texto === '') return '';

  const encontro = texto.match(SEPARADOR);
  if (!encontro) return texto;

  const depois = texto.slice(encontro.index + encontro[0].length).trim();

  // Separador no fim ("Honorários —") não deixa específico nenhum. Devolver
  // string vazia daria uma célula em branco onde havia texto — pior que o
  // prefixo repetido, que ao menos diz do que se trata.
  return depois === '' ? texto : depois;
};

// O rótulo pronto para a célula, com a retaguarda de quando o honorário não
// veio populado. "Honorário" sem nome é o que a listagem já exibia nesse caso.
export const rotuloCurtoDoHonorario = (descricao, retaguarda = 'Honorário') =>
  trechoDistintivo(descricao) || retaguarda;

export default { trechoDistintivo, rotuloCurtoDoHonorario };
