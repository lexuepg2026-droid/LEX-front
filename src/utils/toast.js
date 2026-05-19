const subscribers = new Set();
let _id = 0;

function notify(type, message) {
  const id = ++_id;
  subscribers.forEach(fn => fn({ id, type, message }));
}

export const toast = {
  success: (message) => notify('success', message),
  error:   (message) => notify('error',   message),
};

export function subscribe(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
