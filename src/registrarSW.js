// ═══════════════════════════════════════════════════════════════════════════
// REGISTRO DO SERVICE WORKER — só em produção (Fase 4.5)
//
// `import.meta.env.PROD` é a guarda, e ela não é conveniência: em
// desenvolvimento o Vite serve os módulos sem hash e recarrega por HMR, e um SW
// cacheando aquilo produz o pior modo de falha possível — a tela para de
// refletir o código, sem erro nenhum, e o desenvolvedor procura o defeito no
// lugar errado. É o mesmo tipo de armadilha silenciosa que o `<StrictMode>` da
// Fase 4.4 produziu com a sentinela de montagem.
//
// Também não faz sentido no `<React.StrictMode>`: o registro é idempotente, mas
// o SW passaria a interceptar as requisições de HMR.
//
// `load` e não import direto: registrar durante o parse concorre com o download
// dos assets da primeira pintura, que é exatamente o momento que o SW existe
// para melhorar — nas visitas seguintes.
// ═══════════════════════════════════════════════════════════════════════════

export default function registrarSW() {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Falhar aqui não pode derrubar o app: sem SW, o LEX continua sendo o
      // mesmo aplicativo online de sempre. É degradação, não erro do usuário —
      // e por isso não há toast: não existe ação que ele possa tomar.
    });
  });
}
