import { nomeDoCliente } from './enums.js';

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

// ── O honorário no seletor dos formulários (Fase 2b, DEC-086; Fase 3.2) ──
// Era "descrição — valor": dois honorários "Honorários contratuais" de R$ 5.000
// de clientes diferentes eram a mesma linha. A 2b pôs o processo; a 3.2
// (DEC-101, decisão 3) fechou o rótulo como
//
//   "{descrição} — Processo nº {número} — {cliente principal}"
//
// — o cliente é o que a advogada lembra primeiro (apontamentos 3 e 4 da
// banca). O valor saiu: o seletor agora é uma lista de sugestões, com espaço
// para a linha inteira, e o valor não distingue cobrança nenhuma. O número e o
// cliente vêm do `processoId` populado de `GET /fees` (com o cliente dentro
// desde a 2.5); sem número, o título do processo.
export const rotuloDoHonorarioNoSeletor = (fee) => {
  if (!fee || typeof fee !== 'object') return '';
  const processo = fee.processoId && typeof fee.processoId === 'object' ? fee.processoId : null;
  const numero = (processo?.numeroProcesso || '').trim();
  const titulo = (processo?.titulo || '').trim();
  const partes = [fee.descricao || 'Honorário'];
  if (numero) partes.push(`Processo nº ${numero}`);
  else if (titulo) partes.push(`Processo: ${titulo}`);
  const cliente = nomeDoClienteOuNada(processo?.clientePrincipalId);
  if (cliente) partes.push(cliente);
  return partes.join(' — ');
};

// O processo no seletor do formulário de honorário (Fase 3.2, decisão 3):
// "{número} — {título} — {cliente principal}". `GET /processes` popula o
// cliente principal na listagem.
export const rotuloDoProcessoNoSeletor = (processo) => {
  if (!processo || typeof processo !== 'object') return '';
  const partes = [
    (processo.numeroProcesso || '').trim(),
    (processo.titulo || '').trim(),
    nomeDoClienteOuNada(processo.clientePrincipalId),
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' — ') : 'Processo';
};

// `nomeDoCliente` devolve "—" sem nome; num rótulo composto o traço viraria
// "… — —", então aqui a ausência é string vazia e a parte simplesmente sai.
const nomeDoClienteOuNada = (cliente) => {
  if (!cliente || typeof cliente !== 'object') return '';
  const nome = nomeDoCliente(cliente);
  return nome === '—' ? '' : nome;
};

export default { trechoDistintivo, rotuloCurtoDoHonorario, rotuloDoHonorarioNoSeletor, rotuloDoProcessoNoSeletor };
