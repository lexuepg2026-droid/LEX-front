// ═══════════════════════════════════════════════════════════════════════════
// QUEM ESTÁ LOGADO — para quem não é componente (F-5b)
//
// O interceptor de `api/axiosConfig.js` precisa saber de quem é a gravação que
// vai para a fila: **entrada de fila é escopada por usuário**, como todo o
// resto do espelho local (DEC-058). Ele não é componente e não pode chamar
// `useAuth`.
//
// É o mesmo desenho de `api/sessionLoss.js`, e pela mesma razão: o
// `AuthContext` é a única coisa no app que sabe, e ele avisa aqui em toda
// transição de sessão. Sem isto, o interceptor teria de adivinhar o dono —
// e "adivinhar o dono" é o começo do vazamento que a F-5a fechou.
//
// Guarda só o **id**. Nome, e-mail e o resto do usuário não têm o que fazer
// num módulo que existe para carimbar uma chave.
// ═══════════════════════════════════════════════════════════════════════════

let idAtual = null;

export const registrarUsuarioAtual = (id) => {
  idAtual = typeof id === 'string' && id.trim() !== '' ? id.trim() : null;
};

export const usuarioAtual = () => idAtual;
