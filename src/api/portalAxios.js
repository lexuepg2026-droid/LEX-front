import axios from 'axios';

import { BASE_URL } from './baseURL';

// ═══════════════════════════════════════════════════════════════════════════
// INSTÂNCIA DE HTTP DO PORTAL DO CLIENTE — separada da da advogada
//
// ── Por que não reaproveitar `axiosConfig.js` ──────────────────────────────
// Aquela instância tem um interceptor de resposta que, diante de um 401 recebido
// com sessão de advogada em pé, dispara `window.location.href = '/login'` — a
// tela de login da ADVOGADA — e mostra "Sessão expirada".
//
// (Até a DEC-050 a condição de lá era por ROTA: "qualquer 401 que não seja de
// `/auth/me` e fora de `/login`". Virou uma pergunta sobre estado — só desloga
// quem estava logado —, mas o motivo desta separação não mudou nem um pouco.)
//
// O portal responde 401 em dois casos normais e esperados: `credenciaisInvalidas`
// (o cliente errou o código ou a senha) e `sessaoPortalInvalida`. Com a
// instância compartilhada, um cliente que digitasse a senha errada seria
// arremessado para a tela de login da advogada, no meio de uma navegação de
// página inteira, sem nunca ver a mensagem de erro do próprio portal.
//
// Interceptor no axios é POR INSTÂNCIA. Como o portal nunca importa
// `axiosConfig.js`, o interceptor de lá não enxerga resposta nenhuma daqui — e
// o daqui não enxerga nenhuma de lá. A separação não depende de nenhum dos
// dois se comportar bem; depende de serem objetos diferentes. Há teste
// travando a ausência do import cruzado.
//
// `withCredentials` é obrigatório do mesmo jeito: a sessão do portal é o
// cookie httpOnly `lex-portal-token`, que o navegador só envia com ele ligado.
//
// A URL base vem de `api/baseURL.js` — módulo de infraestrutura compartilhada,
// como `utils/apiError` e `utils/toast`. Não é a instância da advogada nem
// carrega decisão dela: as duas superfícies falam com a MESMA API, e ter dois
// jeitos de descobrir o endereço dela é o que faz um deles ficar para trás.
// ═══════════════════════════════════════════════════════════════════════════

const portalApi = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Códigos de erro estáveis do portal (`src/config/portalErrors.js` no backend).
// O roteamento da interface se faz por ELES, nunca pelo texto da mensagem — foi
// assim que a Fase 1.3 quebrou, quando um ajuste de redação derrubou uma tela
// que dependia de `/mail/i` bater na string.
export const ERRO_PORTAL = Object.freeze({
  CREDENCIAIS_INVALIDAS: 'credenciaisInvalidas',
  SESSAO_INVALIDA: 'sessaoPortalInvalida',
  SENHA_PROVISORIA: 'senhaPortalProvisoria',
  CONFIRMACAO_EXIGE_SENHA_PROPRIA: 'confirmacaoExigeSenhaPropria',
});

export const codigoDoErro = (err) => err?.response?.data?.codigo ?? null;

// O login é a única rota em que 401 é resposta ESPERADA de uso normal: o
// cliente digitou algo errado. Tratá-la como sessão perdida faria a tela se
// redesenhar em vez de mostrar a mensagem.
const ROTAS_SEM_SESSAO = ['/portal/login', '/portal/logout'];

// Quem quiser reagir à perda de sessão se inscreve aqui. O interceptor NÃO
// mexe em `window.location`: navegação de página inteira recarrega o bundle e
// descarta o estado do React. Quem navega é o `PortalAuthContext`, por
// `useNavigate`, dentro do roteador — e sempre para `/portal`, nunca para a
// tela da advogada.
let aoPerderSessao = null;
export const registrarPerdaDeSessao = (callback) => {
  aoPerderSessao = callback;
};

portalApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const ehRotaSemSessao = ROTAS_SEM_SESSAO.some((rota) => url.startsWith(rota));

    if (
      error.response?.status === 401 &&
      codigoDoErro(error) === ERRO_PORTAL.SESSAO_INVALIDA &&
      !ehRotaSemSessao
    ) {
      aoPerderSessao?.();
    }

    return Promise.reject(error);
  }
);

export default portalApi;
