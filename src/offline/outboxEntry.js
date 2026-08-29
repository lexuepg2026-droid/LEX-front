// ═══════════════════════════════════════════════════════════════════════════
// A ENTRADA DA FILA — o que se guarda de uma gravação adiada (F-5b)
//
// A fila é **append-only**: uma entrada não se edita e não se reordena. O que
// muda nela é o **estado** — `pendente` → `enviada` (e aí ela sai) ou
// `pendente` → `falhou` (e aí ela fica, com o motivo, até a advogada decidir).
//
// Cada entrada carrega o que é preciso para reenviar sem o servidor precisar
// adivinhar nada:
//
//   • a **operação** e a requisição inteira (método, caminho, corpo);
//   • a **chave de idempotência**, gerada no clique — é ela que impede o
//     reenvio de criar um segundo compromisso (DEC-059);
//   • o **`updatedAt` que a advogada viu**, para o servidor recusar a gravação
//     atrasada em vez de atropelar a de outro aparelho (DEC-060);
//   • **quando foi enfileirada** — a tela precisa dizer de quando é.
//
// A chave de idempotência é também o **id da entrada**: são a mesma coisa (um
// UUID por gravação), e dois campos com o mesmo valor divergiriam no dia em
// que alguém regerasse um deles.
// ═══════════════════════════════════════════════════════════════════════════

import { identificarOperacao } from './outboxOperations.js';

// UUID v4. `crypto.randomUUID` existe no navegador (contexto seguro) e no Node
// moderno; o caminho de reserva usa `getRandomValues`, que existe nos dois há
// muito mais tempo. **Nenhuma dependência nova** — e a chave precisa ser
// aleatória de verdade: uma sequência previsível colidiria entre aparelhos da
// mesma advogada, e a colisão faria uma gravação devolver a resposta da outra.
export const novaChaveDeIdempotencia = () => {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();

  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // versão 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-` +
    `${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export const ESTADOS = Object.freeze(['pendente', 'falhou']);

// `seq` é o desempate: duas gravações no mesmo milissegundo precisam de uma
// ordem determinística, e "criar depois editar" fora de ordem faz a segunda
// falhar. Quem o fornece é a fila (o tamanho dela no momento), e não um
// contador de módulo — contador de módulo zera ao recarregar a página, e a
// fila sobrevive a isso.
export const montarEntrada = ({
  method,
  url,
  body = null,
  versaoVista = null,
  titulo = null,
  agora = Date.now(),
  chave = novaChaveDeIdempotencia(),
  seq = 0
} = {}) => {
  const operacao = identificarOperacao({ method, url });

  // Quem chega aqui com operação fora da lista é defeito de fiação, não de
  // uso: o interceptor pergunta antes. Lançar é o que impede uma operação
  // financeira de entrar na fila por um caminho que ninguém revisou.
  if (!operacao) {
    throw new Error(`fila: operação não enfileirável — ${String(method).toUpperCase()} ${url}`);
  }

  return {
    id: chave,
    chaveIdempotencia: chave,
    operacao: operacao.id,
    method: String(method).toLowerCase(),
    url,
    body,
    versaoVista,
    // O que a advogada digitou, para a tela de pendências poder nomear a
    // entrada sem ir buscar nada. Sem isto, uma pendência de um compromisso
    // que nunca chegou ao servidor não teria como se identificar.
    titulo,
    criadoEm: agora,
    seq,
    estado: 'pendente',
    tentativas: 0,
    falha: null
  };
};

// A entrada que falhou GUARDA o motivo — ela não sai da fila e não muda de
// conteúdo. `falha` traz a classificação (para a tela decidir o que oferecer),
// a frase em português e o estado do servidor, quando houver (o 409 da
// DEC-060 manda o registro como está).
export const marcarFalha = (entrada, falha) => ({
  ...entrada,
  estado: 'falhou',
  tentativas: (entrada.tentativas ?? 0) + 1,
  falha
});

// Voltar para `pendente` é o "tentar de novo" da tela. A chave de
// idempotência é a MESMA de propósito: se a gravação anterior tiver chegado ao
// servidor sem que a resposta voltasse, o reenvio devolve o resultado dela em
// vez de criar um segundo registro.
export const marcarPendente = (entrada) => ({
  ...entrada,
  estado: 'pendente',
  falha: null
});
