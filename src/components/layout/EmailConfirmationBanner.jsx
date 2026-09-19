import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../api/authService';
import { getApiErrorMessage } from '../../utils/apiError';
import './EmailConfirmationBanner.css';

// ═══════════════════════════════════════════════════════════════════════════
// AVISO DE E-MAIL NÃO CONFIRMADO (A-2, DEC-064)
//
// Enquanto `emailConfirmadoEm` for `null`, este aviso aparece no topo do sistema
// — e SÓ isso: o login não é bloqueado, por decisão do Daniel (se o e-mail
// atrasar ou cair no spam durante a demonstração, ninguém fica de fora).
//
// Só aparece quando o valor é `null` de fato, e não quando é `undefined`: um
// servidor que ainda não conhece o campo não manda a chave, e nesse caso
// afirmar "seu e-mail não está confirmado" seria dizer o que ninguém verificou.
//
// "Já confirmei" existe porque a confirmação acontece em OUTRA aba (o link do
// e-mail), e este aviso, nesta aba, não tem como saber.
// ═══════════════════════════════════════════════════════════════════════════

function EmailConfirmationBanner() {
  const { user, checkAuth } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'erro', texto }

  if (!user || user.emailConfirmadoEm !== null) return null;

  const reenviar = async () => {
    setEnviando(true);
    setAviso(null);
    try {
      const res = await authService.resendConfirmation();
      if (res.data?.jaConfirmado) {
        await checkAuth();
        return;
      }
      setAviso({ tipo: 'ok', texto: 'E-mail enviado. Confira sua caixa de entrada e o spam.' });
    } catch (err) {
      setAviso({
        tipo: 'erro',
        texto: getApiErrorMessage(err, 'Não foi possível enviar o e-mail agora.'),
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="email-banner" role="status">
      <p className="email-banner__texto">
        <strong>Confirme seu e-mail.</strong> Enviamos um link para <strong>{user.email}</strong>.
        Sem confirmar, você não conseguirá recuperar a senha por e-mail caso esqueça.
      </p>

      <div className="email-banner__acoes">
        <button type="button" className="email-banner__botao" onClick={reenviar} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Reenviar e-mail'}
        </button>
        <button type="button" className="email-banner__botao" onClick={() => checkAuth()} disabled={enviando}>
          Já confirmei
        </button>
      </div>

      {aviso && (
        <p className={`email-banner__aviso email-banner__aviso--${aviso.tipo}`}>{aviso.texto}</p>
      )}
    </div>
  );
}

export default EmailConfirmationBanner;
