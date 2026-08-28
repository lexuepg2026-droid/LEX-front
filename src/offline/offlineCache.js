// ═══════════════════════════════════════════════════════════════════════════
// A FIAÇÃO — junta a política (pura) com o banco (fino). (F-5a, DEC-058)
//
// Não há decisão nova aqui: cada `if` deste arquivo delega para uma função
// pura de `cacheKey.js` ou de `cachePolicy.js`. O que ele acrescenta é ORDEM —
// escolher antes de gravar, limpar antes de escrever, apagar tudo ao sair.
//
// ── As três regras da fase, e onde cada uma mora ─────────────────────────
//   1. Todo dado guardado é escopado pelo id do usuário → `buildKey`, que
//      **lança** sem `userId`. Nenhuma leitura monta chave por conta própria:
//      as telas chamam `readCached`/`writeCached`, nunca `buildKey` direto, e
//      há varredura estática travando isso.
//   2. O logout apaga tudo → `clearAll`, chamado por `AuthContext.logout`.
//   3. Trocar de usuário apaga o do anterior → `startSession`, chamado no
//      login E no `checkAuth` (o recarregar de página, que não passa pelo
//      login), ANTES de qualquer escrita da sessão nova.
//
// ── Falha de banco nunca derruba a tela ──────────────────────────────────
// Todo caminho de leitura/escrita é `try/catch` que devolve "não há nada
// guardado". Um IndexedDB indisponível (navegação privativa, cota, banco em
// estado ruim) faz o app se comportar como se comportava antes desta fase:
// online, buscando do servidor. O único caminho que NÃO se resigna a falhar é
// a limpeza — ver `clearAll`.
// ═══════════════════════════════════════════════════════════════════════════

import { buildKey, keysOfOtherUsers } from './cacheKey.js';
import {
  isStorable,
  chooseEvictions,
  MAX_TOTAL_BYTES,
  MAX_ENTRIES,
} from './cachePolicy.js';
import * as store from './offlineStore.js';

// ── Leitura ──────────────────────────────────────────────────────────────
// Devolve `{ valor, atualizadoEm }` ou `null`. O `atualizadoEm` sai junto
// porque a tela é obrigada a dizer a idade do que exibe (Parte 3): um cache
// que devolvesse só o valor deixaria a tela sem como cumprir a regra.
export const readCached = async ({ userId, resource, params }) => {
  try {
    const registro = await store.get(buildKey({ userId, resource, params }));
    if (!registro) return null;
    return { valor: registro.valor, atualizadoEm: registro.atualizadoEm };
  } catch {
    return null;
  }
};

// ── Escrita ──────────────────────────────────────────────────────────────
// Guarda o que passou pela tela — nunca o banco inteiro baixado por precaução.
// Quem chama é o `useCachedResource`, depois de uma resposta do servidor.
export const writeCached = async ({ userId, resource, params, valor, agora = Date.now() }) => {
  try {
    const veredito = isStorable({ resource, value: valor });
    if (!veredito.ok) return false;

    const chave = buildKey({ userId, resource, params });
    const registro = { chave, valor, atualizadoEm: agora, bytes: veredito.bytes };

    await liberarEspaco({ chave, bytes: veredito.bytes });

    try {
      return await store.put(registro);
    } catch (erro) {
      // Cota estourada mesmo depois do nosso limite: o navegador tem menos
      // espaço do que supomos (disco cheio, cota compartilhada com outros
      // sites). Descarta pela METADE dos limites — pela mesma regra do mais
      // antigo primeiro — e tenta uma vez. Se ainda assim falhar, desiste em
      // silêncio: **não guardar é sempre aceitável; quebrar a tela, não.**
      if (erro?.name !== 'QuotaExceededError') return false;
      await liberarEspaco({
        chave,
        bytes: veredito.bytes,
        maxTotalBytes: Math.floor(MAX_TOTAL_BYTES / 2),
        maxEntries: Math.floor(MAX_ENTRIES / 2),
      });
      try {
        return await store.put(registro);
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
};

const liberarEspaco = async ({ chave, bytes, maxTotalBytes, maxEntries }) => {
  const indice = await store.listIndex();
  const descartar = chooseEvictions({
    entries: indice,
    incomingKey: chave,
    incomingBytes: bytes,
    ...(maxTotalBytes ? { maxTotalBytes } : {}),
    ...(maxEntries ? { maxEntries } : {}),
  });
  if (descartar.length > 0) await store.remove(descartar);
};

// ── Entrada de sessão: limpa o que não é deste usuário ───────────────────
//
// Roda ANTES da primeira escrita da sessão. `keysOfOtherUsers` também devolve
// as chaves ilegíveis (formato antigo, lixo): o lado seguro do erro é apagar o
// que não se consegue provar que é meu.
export const startSession = async (userId) => {
  try {
    const chaves = await store.listKeys();
    const alheias = keysOfOtherUsers(chaves, userId);
    if (alheias.length > 0) await store.remove(alheias);
    return alheias.length;
  } catch {
    return 0;
  }
};

// ── Saída de sessão: APAGA TUDO ──────────────────────────────────────────
//
// Não marca como inválido, não expira, não filtra na leitura: **apaga**. Sair
// da conta num computador emprestado precisa deixar o navegador limpo, e um
// dado "invalidado" que continua no disco continua sendo o dado.
//
// É o único caminho desta camada que não aceita falhar calado: se o `clear`
// não completar, o banco inteiro é destruído. As duas coisas falharem juntas
// significa um IndexedDB inoperante, onde não há terceira via — e é o que o
// passo manual do roteiro (entrar com outro usuário e olhar o DevTools) existe
// para pegar.
export const clearAll = async () => {
  try {
    return await store.clear();
  } catch {
    try {
      return await store.destroy();
    } catch {
      return false;
    }
  }
};
