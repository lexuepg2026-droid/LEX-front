// ═══════════════════════════════════════════════════════════════════════════
// A CAMADA FINA — abrir, ler, escrever, apagar. NENHUMA decisão. (F-5a)
//
// ── Por que ela é fina, e por que isso é a arquitetura da fase ───────────
// `node --test` não tem IndexedDB nem navegador, e a fase proíbe dependência
// nova — inclusive wrapper de IndexedDB e biblioteca de sincronização. Não há
// como exercitar o banco de verdade na suíte, e inventar um teste frágil aqui
// seria pior que o passo manual honesto (é a mesma decisão registrada na Fase
// 2E.2 sobre `jsdom`).
//
// A saída não é testar menos: é **deslocar o que decide**. Tudo que escolhe
// mora em função pura — a chave escopada (`cacheKey.js`), o limite e o
// descarte (`cachePolicy.js`), a idade do dado (`dataAge.js`) —, e o que sobra
// aqui é mecânica de banco, que o passo manual do DevTools confere.
//
// **Regra para quem mexer:** se você precisar escrever um `if` sobre o
// CONTEÚDO neste arquivo, ele está no arquivo errado. As únicas condições
// permitidas aqui são sobre a disponibilidade do próprio IndexedDB.
//
// ── Duas object stores, e por quê ───────────────────────────────────────
//   `entradas` — { chave, valor, atualizadoEm, bytes }: o dado.
//   `indice`   — { chave, bytes, atualizadoEm }: o mesmo, SEM o valor.
//
// O descarte precisa saber o tamanho e a idade de TODAS as entradas a cada
// gravação. Com uma store só, isso significaria carregar o banco inteiro na
// memória (megabytes de JSON) para decidir apagar 20 KB. O índice é o mesmo
// dado sem o peso; as duas stores são escritas na MESMA transação, então elas
// não têm como divergir.
// ═══════════════════════════════════════════════════════════════════════════

const DB_NAME = 'lex-offline';
const DB_VERSION = 1;
const STORE_ENTRADAS = 'entradas';
const STORE_INDICE = 'indice';

// IndexedDB pode não existir: navegação privativa de alguns navegadores, modo
// restrito, ou o próprio `node --test` importando este módulo por engano. Sem
// banco, tudo aqui vira "não há nada guardado" — e o app segue online, que é o
// comportamento de antes desta fase.
export const isAvailable = () =>
  typeof indexedDB !== 'undefined' && indexedDB !== null;

let conexao = null;

const promessa = (requisicao) =>
  new Promise((resolve, reject) => {
    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () => reject(requisicao.error);
  });

export const open = () => {
  if (!isAvailable()) return Promise.resolve(null);
  if (conexao) return Promise.resolve(conexao);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_ENTRADAS)) {
        db.createObjectStore(STORE_ENTRADAS, { keyPath: 'chave' });
      }
      if (!db.objectStoreNames.contains(STORE_INDICE)) {
        db.createObjectStore(STORE_INDICE, { keyPath: 'chave' });
      }
    };

    // ⚠️ AVISO PARA A F-5b: ela vai subir a versão do banco (a outbox é outra
    // object store), e é **só** com uma versão nova que `onblocked` deixa de
    // ser teórico — ele dispara quando outra aba segura a conexão antiga. Sem
    // este ramo, a promessa nunca resolveria e o `startSession` do login
    // ficaria pendurado: a advogada veria a tela de login não responder, sem
    // erro nenhum. Rejeitar aqui faz o `catch` do `offlineCache` valer, e o
    // app segue online — que é sempre melhor do que não seguir.
    req.onblocked = () => reject(new Error('offline: banco bloqueado por outra aba'));

    req.onsuccess = () => {
      conexao = req.result;
      // Outra aba pediu uma versão nova do banco: fechar aqui é o que a deixa
      // seguir. Segurar a conexão travaria a outra aba em silêncio.
      conexao.onversionchange = () => { conexao.close(); conexao = null; };
      resolve(conexao);
    };
    req.onerror = () => reject(req.error);
  });
};

const transacao = async (modo, stores) => {
  const db = await open();
  if (!db) return null;
  return db.transaction(stores, modo);
};

export const get = async (chave) => {
  const tx = await transacao('readonly', [STORE_ENTRADAS]);
  if (!tx) return null;
  return (await promessa(tx.objectStore(STORE_ENTRADAS).get(chave))) ?? null;
};

// Grava o registro nas duas stores, na mesma transação.
export const put = async (registro) => {
  const tx = await transacao('readwrite', [STORE_ENTRADAS, STORE_INDICE]);
  if (!tx) return false;
  tx.objectStore(STORE_ENTRADAS).put(registro);
  tx.objectStore(STORE_INDICE).put({
    chave: registro.chave,
    bytes: registro.bytes,
    atualizadoEm: registro.atualizadoEm,
  });
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return true;
};

// O índice inteiro — chave, tamanho e instante, sem os valores.
export const listIndex = async () => {
  const tx = await transacao('readonly', [STORE_INDICE]);
  if (!tx) return [];
  return (await promessa(tx.objectStore(STORE_INDICE).getAll())) ?? [];
};

export const listKeys = async () => {
  const tx = await transacao('readonly', [STORE_INDICE]);
  if (!tx) return [];
  return (await promessa(tx.objectStore(STORE_INDICE).getAllKeys())) ?? [];
};

export const remove = async (chaves) => {
  const lista = Array.isArray(chaves) ? chaves : [chaves];
  if (lista.length === 0) return true;
  const tx = await transacao('readwrite', [STORE_ENTRADAS, STORE_INDICE]);
  if (!tx) return false;
  for (const chave of lista) {
    tx.objectStore(STORE_ENTRADAS).delete(chave);
    tx.objectStore(STORE_INDICE).delete(chave);
  }
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return true;
};

// APAGA TUDO. É o que o logout chama, e é `clear()` de verdade — não marca
// como inválido, não expira, não filtra na leitura: sair da conta num
// computador emprestado precisa deixar o navegador limpo.
export const clear = async () => {
  const tx = await transacao('readwrite', [STORE_ENTRADAS, STORE_INDICE]);
  if (!tx) return false;
  tx.objectStore(STORE_ENTRADAS).clear();
  tx.objectStore(STORE_INDICE).clear();
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return true;
};

// Apaga o BANCO, e não o conteúdo dele. É a retaguarda do `clear()`: se a
// limpeza do logout falhar por qualquer motivo (transação abortada, banco em
// estado ruim), a alternativa não pode ser deixar o dado da advogada anterior
// no navegador. Fechar a conexão antes é obrigatório — com ela aberta, o
// `deleteDatabase` fica bloqueado esperando, sem erro e sem apagar.
export const destroy = () => {
  if (!isAvailable()) return Promise.resolve(false);
  if (conexao) { conexao.close(); conexao = null; }
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve(true);
    req.onblocked = () => resolve(false);
    req.onerror = () => reject(req.error);
  });
};
