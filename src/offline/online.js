// ═══════════════════════════════════════════════════════════════════════════
// "TEM SINAL?" — a leitura crua, sem React (F-5a)
//
// Mora fora do hook porque quem pergunta não é só a tela: o interceptor do
// axios (`api/axiosConfig.js`) pergunta antes de deixar uma escrita sair, e ele
// não é componente. O hook `hooks/useOnlineStatus.js` é a versão reativa desta
// mesma leitura.
//
// `navigator.onLine` é ASSIMÉTRICO e o app depende disso:
//   • `false` é confiável — não há interface de rede, nada vai sair daqui;
//   • `true` significa "há rede", não "há internet" (portal cativo de hotel,
//     Wi-Fi sem saída, servidor fora do ar são todos `true`).
//
// Por isso o app só AFIRMA "sem conexão" quando a resposta é `false`. Falha de
// rede com `onLine === true` continua sendo erro comum: dizer "sem conexão"
// para quem está conectado manda procurar o problema no lugar errado.
//
// Fora do navegador (a suíte roda em `node --test`) a resposta é "tem sinal" —
// o comportamento de antes desta fase.
// ═══════════════════════════════════════════════════════════════════════════

export const lerOnline = () =>
  typeof navigator === 'undefined' || navigator.onLine !== false;
