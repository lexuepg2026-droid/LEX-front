const subscribers = new Set();
let _id = 0;

function notify(type, message) {
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
