// ═══════════════════════════════════════════════════════════════════════════
// A CHAVE ESCOPADA POR USUÁRIO — a peça que impede o vazamento (F-5a, DEC-058)
//
// ── O problema, e por que ele já tem precedente neste repo ────────────────
// O `tests/pwa/pwa.test.js` trava uma regra desde a Fase 4.5: **nenhuma
// entrada de `/api/` no Cache Storage**. A razão está escrita lá e é uma só —
// toda resposta da API é autenticada e pertence a UMA advogada; um cache dela
// é vazamento esperando o segundo usuário no mesmo navegador. O computador do
// escritório, a advogada e a estagiária.
//
// **IndexedDB tem exatamente o mesmo problema, e aquele teste não o cobre**,
// porque é outra API. Guardar resposta autenticada num banco do navegador sem
// dono é a mesma falha, escrita duas vezes.
//
// ── A decisão ────────────────────────────────────────────────────────────
// **Não existe leitura nem escrita sem `userId`.** Ele não é sufixo, não é
// filtro aplicado depois e não é campo do valor guardado: ele é parte da
// CHAVE, montada aqui e em nenhum outro lugar. Uma leitura só encontra o que
// ela mesma escreveu, sob o mesmo usuário, porque a chave não existe fora
// desse escopo.
//
// `buildKey` **lança** quando o `userId` falta. Não devolve `null`, não usa
// `'anonimo'`, não cai num escopo padrão: um escopo padrão é onde os dados de
// duas pessoas se encontram. Quem chamar sem usuário quebra alto e na hora.
//
// ── Formato ──────────────────────────────────────────────────────────────
//   lex-offline|u:<userId>|r:<recurso>|p:<parâmetros>
//
// O `|` é o separador e por isso é proibido dentro dos campos — os valores dos
// parâmetros passam por `encodeURIComponent`, e `userId` e recurso são
// validados. Sem isso, um filtro de busca com `|` digitado pela advogada
// montaria uma chave que `parseKey` leria como sendo de outro usuário.
// ═══════════════════════════════════════════════════════════════════════════

export const KEY_PREFIX = 'lex-offline';

// ── O que se guarda (Parte 2 da fase) ─────────────────────────────────────
//
// A lista é uma ALLOWLIST, e não uma denylist, porque o custo dos dois erros
// não é o mesmo: esquecer de acrescentar um recurso deixa uma tela sem cache
// (ela funciona, só não offline); esquecer de excluir um recurso novo põe algo
// no banco do navegador que ninguém decidiu pôr.
//
// **Não estão aqui, e é decisão:** os downloads de PDF e DOCX (binário grande,
// valor baixo offline — a tela diz que o download precisa do servidor), o
// `/auth/me` (identidade de sessão não é dado de tela) e qualquer coisa do
// **portal do cliente**, que roda no aparelho do cliente e cuja política de
// privacidade ninguém tomou (passo 93).
export const CACHEABLE_RESOURCES = Object.freeze([
  'clients',        // listagem de clientes
  'client',         // um cliente
  'processes',      // listagem de processos
  'process',        // um processo
  'fees',           // honorários
  'fee',            // um honorário
  'installments',   // parcelas
  'payments',       // pagamentos
  'events',         // agenda
  'financeSummary', // o resumo do financeiro
]);

export const isCacheableResource = (resource) =>
  typeof resource === 'string' && CACHEABLE_RESOURCES.includes(resource);

// Serialização ESTÁVEL dos parâmetros. `{ situacao: 'ativos', busca: 'ana' }` e
// `{ busca: 'ana', situacao: 'ativos' }` são a mesma consulta e precisam da
// mesma chave — a ordem em que a tela monta o objeto não é informação.
//
// Vazio, `null` e `undefined` SAEM (não entram como `busca=`), pelo mesmo
// motivo: `getAllClients({ busca: undefined })` e `getAllClients({})` mandam a
// mesma requisição, e duas chaves para uma requisição só é cache duplicado que
// envelhece separado.
export const serializeParams = (params) => {
  if (params === undefined || params === null) return '';
  if (typeof params !== 'object' || Array.isArray(params)) {
    throw new Error('offline: os parâmetros da chave precisam ser um objeto simples');
  }

  return Object.keys(params)
    .sort()
    .filter((k) => {
      const v = params[k];
      return v !== undefined && v !== null && v !== '';
    })
    .map((k) => {
      const v = params[k];
      if (typeof v === 'object') {
        throw new Error(`offline: o parâmetro "${k}" precisa ser texto, número ou booleano`);
      }
      return `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`;
    })
    .join('&');
};

// O `userId` chega do `user.id` do `AuthContext` — o campo que o `sanitizeUser`
// do backend expõe, o `_id` do Mongo em texto. **Só texto não vazio serve.**
// Aceitar número por tolerância abriria a porta para o `0`, que é falso em
// JavaScript e quase sempre é um id que não chegou — e um id que não chegou
// virando escopo é o vazamento por outro caminho.
const normalizeUserId = (userId) => (typeof userId === 'string' ? userId.trim() : '');

export const buildKey = ({ userId, resource, params } = {}) => {
  const dono = normalizeUserId(userId);

  // ⚠️ A GUARDA DA FASE. Sem dono não há chave, e sem chave não há escrita.
  if (!dono) {
    throw new Error(
      'offline: chave sem usuário. Todo dado guardado é escopado pelo id de quem o buscou.'
    );
  }
  if (dono.includes('|')) {
    throw new Error('offline: o id do usuário não pode conter "|", que é o separador da chave');
  }
  if (!isCacheableResource(resource)) {
    throw new Error(`offline: recurso "${resource}" não está na lista do que se guarda`);
  }

  return `${KEY_PREFIX}|u:${dono}|r:${resource}|p:${serializeParams(params)}`;
};

// Volta da chave para as partes. Devolve `null` para o que não for uma chave
// desta versão — inclusive lixo de uma versão anterior do formato, que a troca
// de sessão trata como "não é meu" e apaga.
export const parseKey = (key) => {
  if (typeof key !== 'string') return null;
  const partes = key.split('|');
  if (partes.length !== 4) return null;
  const [prefixo, u, r, p] = partes;
  if (prefixo !== KEY_PREFIX) return null;
  if (!u.startsWith('u:') || !r.startsWith('r:') || !p.startsWith('p:')) return null;

  const userId = u.slice(2);
  if (!userId) return null;

  return { userId, resource: r.slice(2), params: p.slice(2) };
};

// "Esta chave é do usuário X?" — a pergunta que a limpeza de troca de conta
// faz para cada chave do banco. Chave ilegível responde **não**: o lado seguro
// do erro é apagar o que não se consegue provar que é meu.
export const belongsToUser = (key, userId) => {
  const dono = normalizeUserId(userId);
  if (!dono) return false;
  const partes = parseKey(key);
  return partes !== null && partes.userId === dono;
};

// As chaves a apagar quando ENTRA um usuário: tudo que não é dele. É a regra 3
// da fase — "trocar de usuário no mesmo navegador apaga o do anterior" — e ela
// é uma função pura justamente para poder ser provada sem navegador.
export const keysOfOtherUsers = (keys, userId) => {
  if (!Array.isArray(keys)) return [];
  return keys.filter((k) => !belongsToUser(k, userId));
};
