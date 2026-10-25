// ═══════════════════════════════════════════════════════════════════════════
// O TOAST — pub/sub sem dependência, e as três regras que o cercam (Fase 2b,
// DEC-083)
//
// Este arquivo continua não importando nada: a suíte (`node --test`, sem
// Vite) o carrega e EXECUTA. Por isso as regras moram aqui como funções puras,
// e o `ToastContainer` só as aplica.
//
//   1. **Duração por tipo.** Eram 3 s para tudo, e um erro de duas linhas não
//      se lê em 3 s. O erro fica o dobro; o info, no meio.
//   2. **Região por tipo.** Erro interrompe o leitor de tela (`role="alert"`,
//      assertivo); sucesso e info esperam a vez (`role="status"`, educado).
//   3. **Deduplicação.** O Início dispara vários GETs em paralelo; com o
//      servidor fora, todos falham juntos e o toast global da DEC-084 seria
//      repetido cinco vezes. A mesma mensagem com o mesmo tipo dentro de 4 s
//      sai uma vez só.
// ═══════════════════════════════════════════════════════════════════════════

export const DURACOES = Object.freeze({ success: 3000, info: 4000, error: 6000 });

export const JANELA_DEDUP = 4000;

// Tipo desconhecido fica com a duração do info: nem curto como o sucesso, nem
// insistente como o erro.
export const duracaoDe = (tipo) => DURACOES[tipo] ?? DURACOES.info;

export const regiaoDe = (tipo) => (tipo === 'error' ? 'alert' : 'status');

const chaveDe = (tipo, mensagem) => `${tipo}\u0000${mensagem}`;

// `registro` é um Map de chave → instante da última emissão. A janela conta da
// emissão que SAIU: uma rajada de cinco falhas em 200 ms vira um toast, e a
// sexta, 5 s depois, aparece de novo — o problema continua, e ela precisa saber.
export function deveEmitir(registro, tipo, mensagem, agora) {
  const chave = chaveDe(tipo, mensagem);
  const ultima = registro.get(chave);
  if (ultima !== undefined && agora - ultima < JANELA_DEDUP) return false;
  registro.set(chave, agora);
  // O registro não cresce sem fim: o que já saiu da janela não serve mais.
  for (const [k, t] of registro) {
    if (agora - t >= JANELA_DEDUP) registro.delete(k);
  }
  return true;
}

const subscribers = new Set();
const emitidos = new Map();
let _id = 0;

function notify(type, message) {
  if (!deveEmitir(emitidos, type, message, Date.now())) return;
  const id = ++_id;
  subscribers.forEach(fn => fn({ id, type, message }));
}

export const toast = {
  success: (message) => notify('success', message),
  error:   (message) => notify('error',   message),
  // Fase 0 (DEC-066): `info` era chamado em cinco telas e não existia — o
  // `TypeError` impedia a navegação da Agenda e a saída do formulário quando a
  // gravação ia para a fila. É o tom do "não é erro, mas você precisa saber".
  info:    (message) => notify('info',    message),
};

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

// Só para a suíte: zera a janela de deduplicação entre um teste e outro.
export function _limparDeduplicacao() {
  emitidos.clear();
}
