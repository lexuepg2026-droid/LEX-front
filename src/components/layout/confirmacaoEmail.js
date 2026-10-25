// ═══════════════════════════════════════════════════════════════════════════
// O AVISO DE E-MAIL NÃO CONFIRMADO — as regras (Fase 2b, DEC-088)
//
// Desde a A-2 (DEC-064) o aviso só INFORMA: ninguém é barrado por e-mail não
// confirmado, e há teste travando que nenhum portão olha o campo. Esta é a
// ÚNICA leitura de `emailConfirmadoEm` no front — a faixa, o ponto no avatar
// e o item do menu perguntam por aqui, e a varredura de `a2.test.js` continua
// sabendo exatamente quem pergunta.
//
// Só `null` é "não confirmado". `undefined` é um servidor que não conhece o
// campo, e afirmar "seu e-mail não está confirmado" seria dizer o que ninguém
// verificou (A-2).
// ═══════════════════════════════════════════════════════════════════════════

export const emailPendente = (user) => Boolean(user) && user.emailConfirmadoEm === null;

// ── "Dispensar" esconde a FAIXA até o próximo login ───────────────────────
// Por `sessionStorage`, com a chave do usuário: some ao fechar a aba e é
// apagada no login (`limparDispensaDoAviso`, chamada pelo `AuthContext`). O
// ponto no avatar e o item do menu NÃO são dispensáveis — são a indicação
// permanente, e somem só quando o e-mail é confirmado.
//
// Todo acesso em `try/catch`: navegação privada e armazenamento bloqueado
// lançam no acesso. Sem `sessionStorage`, a faixa continua aparecendo — o
// pior caso é o comportamento de antes desta fase, e não um aviso perdido.
const PREFIXO = 'lex:aviso-email-dispensado:';

const armazenamento = () => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
};

export function avisoDispensado(userId, store = armazenamento()) {
  if (!userId || !store) return false;
  try {
    return store.getItem(`${PREFIXO}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function dispensarAviso(userId, store = armazenamento()) {
  if (!userId || !store) return false;
  try {
    store.setItem(`${PREFIXO}${userId}`, '1');
    return true;
  } catch {
    return false;
  }
}

export function limparDispensaDoAviso(store = armazenamento()) {
  if (!store) return;
  try {
    const chaves = [];
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k && k.startsWith(PREFIXO)) chaves.push(k);
    }
    chaves.forEach((k) => store.removeItem(k));
  } catch {
    // Sem armazenamento, não há dispensa para limpar.
  }
}

export const MENSAGEM_EMAIL_ENVIADO = 'E-mail enviado. Confira sua caixa de entrada e o spam.';
export const MENSAGEM_JA_CONFIRMADO = 'Seu e-mail já está confirmado.';
