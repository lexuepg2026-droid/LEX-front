// ═══════════════════════════════════════════════════════════════════════════
// A POLÍTICA — o que se guarda, quanto cabe, o que sai primeiro (F-5a)
//
// Este arquivo é TODA a decisão do armazenamento offline, e não tem uma linha
// de IndexedDB dentro. É de propósito: `node --test` não tem navegador, e a
// fase decidiu que a camada que fala com o banco é fina e sem decisão, para
// que tudo que decide caiba em função pura e possa ser provado de verdade.
// Ver `offline/offlineStore.js` (a camada fina) e `offline/offlineCache.js`
// (a fiação entre as duas).
// ═══════════════════════════════════════════════════════════════════════════

import { isCacheableResource } from './cacheKey.js';

// ── Os limites, e o porquê de cada número ────────────────────────────────
//
// IndexedDB tem cota, e estourar cota **sem tratamento** dá `QuotaExceededError`
// no meio de uma navegação — que a advogada lê como "o sistema quebrou", sem
// nenhuma relação com o que ela estava fazendo. Ter limite próprio, menor que o
// do navegador, é o que mantém o descarte sendo uma DECISÃO nossa (o mais
// antigo sai) em vez de um erro do navegador na hora errada.
//
// **5 MB no total.** É folgado para texto: as listagens do LEX são páginas de
// no máximo algumas dezenas de registros, e o resumo do financeiro é um punhado
// de números. 5 MB de JSON é a ordem de milhares de registros — mais do que a
// advogada abre entre um sinal e outro. E é modesto perto da cota real de um
// navegador de mesa (centenas de MB), então o limite que vale é sempre o nosso.
//
// **120 entradas.** Uma entrada é uma consulta (uma listagem com um filtro, um
// detalhe). 120 cobre um dia de trabalho com sobra; passar disso é sinal de
// filtro variando muito — e nesse caso as combinações velhas não têm valor.
//
// **256 KB por entrada.** Acima disso a resposta não é uma tela: é um download
// ou uma listagem sem teto, e nenhum dos dois entra aqui.
export const MAX_TOTAL_BYTES = 5 * 1024 * 1024;
export const MAX_ENTRIES = 120;
export const MAX_ENTRY_BYTES = 256 * 1024;

const encoder = new TextEncoder();

// Tamanho em bytes UTF-8 do JSON. `TextEncoder` existe no navegador e no Node,
// então a mesma conta que o app usa é a que a suíte confere — um `.length` de
// string contaria "ç" como 1 byte e subestimaria justamente os nomes próprios
// e os títulos de processo, que são o grosso do que se guarda.
export const estimateBytes = (value) => {
  if (value === undefined) return 0;
  try {
    return encoder.encode(JSON.stringify(value)).length;
  } catch {
    // Ciclo, `BigInt`, coisa que não serializa: não cabe no banco de qualquer
    // forma, e devolver Infinity faz `isStorable` recusar sem caso especial.
    return Infinity;
  }
};

// Binário NÃO se guarda (Parte 2 da fase): PDF e DOCX gerados são grandes e o
// valor de tê-los offline é baixo perto do custo. A recusa está aqui, e não só
// na allowlist de recursos, porque as duas erram de formas diferentes — a
// allowlist erra por esquecimento ao acrescentar recurso, esta erra só se
// alguém passar um blob de propósito.
const ehBinario = (value) =>
  (typeof Blob !== 'undefined' && value instanceof Blob) ||
  (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) ||
  ArrayBuffer.isView?.(value) === true;

// "Isto pode ser guardado?" — e, quando não, POR QUÊ. O motivo não vai para a
// tela (a advogada não precisa saber de cota), mas vai para quem depurar: um
// `return false` mudo obrigaria a reconstruir o raciocínio no console.
export const isStorable = ({ resource, value } = {}) => {
  if (!isCacheableResource(resource)) {
    return { ok: false, motivo: `recurso "${resource}" fora da lista do que se guarda` };
  }
  if (value === undefined || value === null) {
    return { ok: false, motivo: 'não há valor a guardar' };
  }
  if (ehBinario(value)) {
    return { ok: false, motivo: 'binário não se guarda — PDF e DOCX ficam de fora' };
  }
  const bytes = estimateBytes(value);
  if (bytes > MAX_ENTRY_BYTES) {
    return { ok: false, motivo: `entrada de ${bytes} bytes acima do teto de ${MAX_ENTRY_BYTES}` };
  }
  return { ok: true, motivo: null, bytes };
};

// ── O descarte: o mais ANTIGO sai primeiro ───────────────────────────────
//
// "Antigo" é pelo `atualizadoEm` — o instante em que o dado veio do servidor —,
// e não pelo último acesso. Os dois critérios são defensáveis, e este é o que
// combina com a Parte 3 da fase: o que se exibe é a IDADE do dado, e o dado
// mais velho é o que teria o aviso mais desconfortável. Descartar por acesso
// guardaria para sempre a tela que ela abre todo dia, com o número do mês
// passado dentro.
//
// A entrada que está CHEGANDO nunca é candidata: descartá-la para caber ela
// mesma seria trabalho pelo trabalho.
export const chooseEvictions = ({
  entries = [],
  incomingKey = null,
  incomingBytes = 0,
  maxTotalBytes = MAX_TOTAL_BYTES,
  maxEntries = MAX_ENTRIES,
} = {}) => {
  // A chave que chega, se já existia, é substituída — o espaço dela volta.
  const outras = entries.filter((e) => e && e.chave !== incomingKey);

  let bytes = outras.reduce((soma, e) => soma + (Number(e.bytes) || 0), 0) + incomingBytes;
  let quantidade = outras.length + 1;

  const candidatas = [...outras].sort((a, b) => {
    const x = Number(a.atualizadoEm) || 0;
    const y = Number(b.atualizadoEm) || 0;
    if (x !== y) return x - y;
    // Empate no instante (duas telas carregadas no mesmo milissegundo): a
    // ordem passa a ser a da chave, para o descarte ser determinístico e o
    // teste não depender da ordem em que o banco devolveu as entradas.
    return String(a.chave).localeCompare(String(b.chave));
  });

  const descartar = [];
  for (const entrada of candidatas) {
    if (bytes <= maxTotalBytes && quantidade <= maxEntries) break;
    descartar.push(entrada.chave);
    bytes -= Number(entrada.bytes) || 0;
    quantidade -= 1;
  }
  return descartar;
};

// ── Servir da rede ou do cache ───────────────────────────────────────────
//
// A regra é curta e a fase inteira depende dela ser curta: **com sinal, a rede
// manda.** Cache-first com dado autenticado é como se serve um saldo do mês
// passado sem ninguém pedir — o mesmo defeito que o `sw.js` evita ao não
// cachear `/api/`, escrito em outra API.
//
// `'unavailable'` não é erro de rede: é "esta tela você não abriu ainda". A
// diferença aparece na mensagem (ver `offline/offlineMessages.js`).
export const decideSource = ({ online, hasCache } = {}) => {
  if (online) return 'network';
  return hasCache ? 'cache' : 'unavailable';
};
