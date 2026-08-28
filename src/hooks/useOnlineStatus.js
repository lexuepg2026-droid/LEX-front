import { useEffect, useState } from 'react';
import { lerOnline } from '../offline/online';

// ═══════════════════════════════════════════════════════════════════════════
// TEM SINAL? — a pergunta que a Parte 3 e a Parte 4 da F-5a fazem o tempo todo
//
// `navigator.onLine` é **assimétrico**, e o app depende dessa assimetria:
//
//   • `false` é confiável — o sistema operacional não tem interface de rede
//     ativa, e nenhuma requisição vai sair daqui;
//   • `true` significa apenas "há rede", **não** "há internet". Portal cativo
//     de hotel, Wi-Fi sem saída e servidor fora do ar são todos `true`.
//
// Por isso a regra do app é: **só se afirma "sem conexão" quando `onLine` diz
// `false`.** Uma falha de rede com `onLine === true` continua sendo tratada
// como erro comum — dizer "sem conexão" para quem está conectado seria mandar
// procurar o problema no lugar errado.
//
// O limite conhecido disso: em portal cativo, a tela mostra o erro do servidor
// em vez do aviso de offline. Fica registrado, e sem gambiarra de "ping" — um
// teste de conectividade próprio é outra decisão, com custo de bateria e de
// requisição, e ninguém a pediu.
// ═══════════════════════════════════════════════════════════════════════════

// A leitura crua mora em `offline/online.js` — o interceptor do axios precisa
// dela e não é componente. Aqui fica só a parte reativa.
export default function useOnlineStatus() {
  const [online, setOnline] = useState(lerOnline);

  useEffect(() => {
    const subiu = () => setOnline(true);
    const caiu = () => setOnline(false);

    window.addEventListener('online', subiu);
    window.addEventListener('offline', caiu);

    // O sinal pode ter mudado entre o primeiro render e este efeito — e a
    // janela é justamente a de quem abre o app com o cabo já desconectado.
    setOnline(lerOnline());

    return () => {
      window.removeEventListener('online', subiu);
      window.removeEventListener('offline', caiu);
    };
  }, []);

  return online;
}
