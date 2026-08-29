import api from './axiosConfig';
import { CABECALHO_VERSAO } from '../offline/versionHeader';

// ═══════════════════════════════════════════════════════════════════════════
// QUEM FALA COM O SERVIDOR PELA FILA (F-5b)
//
// A fila (`offline/outbox.js`) não conhece o axios: ela **recebe** esta função.
// É o que permite provar a ordem do reenvio e a parada na primeira falha numa
// suíte sem rede — e é a mesma separação que mantém a decisão fora da camada
// de transporte no resto do projeto.
//
// Dois cabeçalhos, e cada um resolve um problema diferente:
//
//   • `Idempotency-Key` — a chave nasceu no clique e é a MESMA em todo
//     reenvio. Se a gravação anterior chegou e só a resposta se perdeu, o
//     servidor devolve o resultado dela em vez de criar um segundo registro
//     (DEC-059);
//   • `X-If-Unmodified-Since` — o `updatedAt` que a advogada viu. Se o
//     registro mudou desde então, o servidor recusa com 409 e manda o que
//     está gravado, para ela escolher (DEC-060).
//
// `daFila: true` é o que impede o laço: sem essa marca, uma falha de rede no
// meio do reenvio faria o interceptor enfileirar a entrada **de novo**, e a
// fila cresceria sozinha com cópias da mesma gravação.
// ═══════════════════════════════════════════════════════════════════════════

export const enviarEntrada = (entrada) =>
  api.request({
    method: entrada.method,
    url: entrada.url,
    data: entrada.body ?? undefined,
    daFila: true,
    headers: {
      'Idempotency-Key': entrada.chaveIdempotencia,
      ...(entrada.versaoVista ? { [CABECALHO_VERSAO]: entrada.versaoVista } : {})
    }
  });

export default { enviarEntrada };
