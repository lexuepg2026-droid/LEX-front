// ═══════════════════════════════════════════════════════════════════════════
// FORMATO DE E-MAIL NA TELA — espelho de `src/utils/email.js` do backend
// (DEC-063)
//
// **A mesma regra, a mesma frase.** A tela valida para poupar uma viagem; o
// servidor valida porque é a autoridade (passo 102). Quando os dois recusam o
// mesmo endereço, eles precisam dizer a mesma coisa — duas redações para a
// mesma regra fariam a advogada achar que são dois problemas diferentes.
//
// ── Por que espelho, e não uma rota ──────────────────────────────────────
// É constante, não dado. Mesma escolha de `ORDENS_CLIENTE`, de
// `FASE_PROCESSO_OPTIONS` e dos tipos de evento, e com a mesma proteção: **há
// teste nos dois repos** conferindo que as duas implementações concordam, caso
// a caso, sobre a tabela inteira da fase.
//
// ── O que esta cópia NÃO pode virar ──────────────────────────────────────
// Uma regra mais rígida que a do servidor. "A tela nunca é mais rígida que a
// API" é regra geral do projeto desde a F-3.2, nascida do código de acesso do
// portal — e recusar aqui um endereço que o servidor aceitaria deixaria a
// pessoa de fora do sistema sem ter como descobrir o motivo.
// ═══════════════════════════════════════════════════════════════════════════

export const normalizarEmail = (valor) =>
  typeof valor === 'string' ? valor.trim().toLowerCase() : '';

// A proibição de ponto duplo fica FORA da expressão, como no backend:
// `[^\s@]+\.[^\s@]+` aceita `lex..dev` porque o primeiro grupo engole o
// primeiro ponto. Foi exatamente esse o furo da expressão que vivia dentro do
// `RegisterPage.jsx` até a A-1 — ela reprovava os dez outros casos da tabela e
// deixava passar só este.
const FORMA = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailValido = (valor) => {
  const email = normalizarEmail(valor);
  if (email === '') return false;
  if (email.includes('..')) return false;
  return FORMA.test(email);
};

// A frase é a MESMA do backend, literalmente. Ver a nota no topo.
export const MENSAGEM_EMAIL_INVALIDO = 'E-mail inválido';

export default { emailValido, normalizarEmail, MENSAGEM_EMAIL_INVALIDO };
