import { useCallback, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../api/authService';
import { getApiErrorMessage } from '../utils/apiError';
import { jaAvisadoPeloToastGlobal } from '../api/toastGlobal';
import { emailPendente, MENSAGEM_EMAIL_ENVIADO, MENSAGEM_JA_CONFIRMADO } from '../components/layout/confirmacaoEmail.js';

// ═══════════════════════════════════════════════════════════════════════════
// REENVIAR E "JÁ CONFIRMEI" — a mesma lógica para a faixa, o menu e o "Mais"
// (Fase 2b, DEC-088)
//
// Era o corpo do `EmailConfirmationBanner` (A-2), e saiu daqui sem mudar uma
// linha de comportamento: o mesmo POST, o mesmo `jaConfirmado` que relê a
// sessão, os mesmos textos de erro (o 429 "Aguarde um minuto…" e o 502 "Não
// foi possível enviar…" vêm do servidor, por `getApiErrorMessage`). Existe
// porque agora são TRÊS lugares que reenviam, e três cópias divergiriam.
//
// O resultado volta para quem chamou desenhar do seu jeito: a faixa em linha,
// o menu num toast (ele fecha ao clicar).
// ═══════════════════════════════════════════════════════════════════════════
export default function useConfirmacaoEmail() {
  const { user, checkAuth } = useAuth();
  const [enviando, setEnviando] = useState(false);

  const reenviar = useCallback(async () => {
    setEnviando(true);
    try {
      const res = await authService.resendConfirmation();
      if (res.data?.jaConfirmado) {
        await checkAuth();
        return { tipo: 'ok', texto: MENSAGEM_JA_CONFIRMADO };
      }
      return { tipo: 'ok', texto: MENSAGEM_EMAIL_ENVIADO };
    } catch (err) {
      return {
        tipo: 'erro',
        texto: getApiErrorMessage(err, 'Não foi possível enviar o e-mail agora.'),
        // O 429 e o 502 já saíram no toast global (DEC-084); quem desenha em
        // toast não repete, quem desenha em linha mostra onde.
        jaAvisado: jaAvisadoPeloToastGlobal(err),
      };
    } finally {
      setEnviando(false);
    }
  }, [checkAuth]);

  return { user, pendente: emailPendente(user), enviando, reenviar, checkAuth };
}
