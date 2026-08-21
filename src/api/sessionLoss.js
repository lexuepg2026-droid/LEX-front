// ═══════════════════════════════════════════════════════════════════════════
// A REGRA DE SESSÃO PERDIDA — DEC-050
//
// ── O defeito que originou isto (V-2) ────────────────────────────────────
// O interceptor de `axiosConfig.js` tratava QUALQUER 401 como sessão perdida.
// Errar a senha ATUAL na tela de troca de senha devolvia 401, e a advogada era
// EXPULSA do sistema por um erro de digitação.
//
// ── Por que a correção não foi no interceptor ────────────────────────────
// A tentação era acrescentar `/auth/alterar-senha` a uma lista de rotas
// ignoradas. Lista de exceção APODRECE: a próxima rota que devolvesse 401 por
// engano não estaria nela, e o defeito voltaria calado, num lugar diferente.
//
// A correção foi no BACKEND e é semântica (DEC-050): **o 401 é reservado
// exclusivamente para sessão ausente ou inválida; qualquer outra falha de
// credencial dentro de uma sessão válida é 422.** Com a regra de pé, o que
// sobra deste lado é uma pergunta de uma linha.
//
// ── Por que módulo separado, e não dentro de `axiosConfig.js` ────────────
// Duas razões, e a segunda é a que decidiu.
//
// 1. `axiosConfig.js` cria a instância e importa `utils/toast` — trabalho de
//    fiação. A REGRA não é fiação, e misturar as duas coisas foi o que fez o
//    401 e a decisão de deslogar morarem na mesma linha.
//
// 2. **A regra fica testável.** `axiosConfig.js` importa `'../utils/toast'` sem
//    extensão, que só o Vite resolve — a suíte roda em `node --test` e não
//    consegue importar aquele arquivo. Enquanto a decisão morasse lá, ela só
//    podia ser verificada lendo o código como texto, e teste que lê texto não
//    prova comportamento. Aqui ela é chamada de verdade, com 401 e com 422.
//
// É o mesmo motivo de `api/baseURL.js`: infraestrutura compartilhada que não
// pertence a nenhuma das duas instâncias.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A decisão inteira. Duas entradas, nenhuma URL:
 *
 *   401 + havia sessão  → a sessão CAIU. Desloga.
 *   401 + não havia     → estado normal de quem ainda não entrou (a sondagem de
 *                         `/auth/me` na subida, o login recusado). Não faz nada.
 *   qualquer outro      → não é assunto de sessão. Em especial o 422, que é
 *                         dado errado DENTRO de sessão válida (DEC-050) e quem
 *                         trata é a tela, que sabe o que perguntar.
 *
 * Repare no que ela NÃO recebe: a rota. É essa ausência que impede o defeito de
 * voltar — não há onde uma exceção por rota entrar.
 */
export const ehSessaoPerdida = (status, haviaSessao) =>
  status === 401 && haviaSessao === true;

// ── Quem sabe se há sessão ────────────────────────────────────────────────
// O `AuthContext` é a única coisa no app que sabe. Ele avisa aqui em toda
// transição — login, cadastro, sondagem da subida, logout —, e o interceptor
// lê. Sem isso, o interceptor teria de adivinhar pela URL, que é exatamente o
// que a DEC-050 tirou dele.
let sessaoEmPe = false;

export const registrarSessao = (ativa) => {
  sessaoEmPe = Boolean(ativa);
};

export const haviaSessao = () => sessaoEmPe;

export default { ehSessaoPerdida, registrarSessao, haviaSessao };
