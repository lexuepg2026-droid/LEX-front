import React, { useState } from 'react';
import useConfirmacaoEmail from '../../hooks/useConfirmacaoEmail';
import { avisoDispensado, dispensarAviso, emailPendente } from './confirmacaoEmail.js';
import './EmailConfirmationBanner.css';

// ═══════════════════════════════════════════════════════════════════════════
// AVISO DE E-MAIL NÃO CONFIRMADO (A-2, DEC-064; compacto desde a Fase 2b,
// DEC-088)
//
// Enquanto o e-mail não for confirmado (`emailPendente`), este aviso aparece no topo do sistema
// — e SÓ isso: o login não é bloqueado, por decisão do Daniel (se o e-mail
// atrasar ou cair no spam durante a demonstração, ninguém fica de fora).
//
// Fase 2b: era uma faixa de largura total com duas linhas de texto, fixa até
// confirmar. Virou UMA linha, com "Reenviar", "Já confirmei" e um × que a
// dispensa até o próximo login. A indicação que NÃO se dispensa é o ponto no
// avatar e o item "Confirmar e-mail" do menu do usuário (e do "Mais"). A
// pergunta aos professores — aviso fixo ou efêmero — continua aberta, e este
// desenho atende às duas leituras: tirar o × devolve o fixo.
//
// "Já confirmei" existe porque a confirmação acontece em OUTRA aba (o link do
// e-mail), e este aviso, nesta aba, não tem como saber.
// ═══════════════════════════════════════════════════════════════════════════

function EmailConfirmationBanner() {
  const { user, enviando, reenviar, checkAuth } = useConfirmacaoEmail();
  const [aviso, setAviso] = useState(null); // { tipo: 'ok' | 'erro', texto }
  const [dispensadoAgora, setDispensadoAgora] = useState(false);

  if (!emailPendente(user)) return null;
  if (dispensadoAgora || avisoDispensado(user.id)) return null;

  const aoReenviar = async () => {
    setAviso(null);
    const resultado = await reenviar();
    setAviso({ tipo: resultado.tipo, texto: resultado.texto });
  };

  const dispensar = () => {
    // Sem `sessionStorage`, a dispensa vale só enquanto esta tela estiver
    // montada; ao recarregar, a faixa volta — é o pior caso aceitável.
    dispensarAviso(user.id);
    setDispensadoAgora(true);
  };

  return (
    <div className="email-banner" role="status">
      {/* Fase 0: a frase não promete consequência que o sistema não aplica (o
          backend não exige e-mail confirmado para recuperar a senha). Fase 2b:
          encurtada para caber numa linha; o texto inteiro fica no `title`. */}
      <p
        className="email-banner__texto"
        title={`Confirme seu e-mail (${user.email}) para receber os avisos e o link de recuperação de senha.`}
      >
        <strong>Confirme seu e-mail</strong> ({user.email}) para receber os avisos e o link de recuperação de senha.
      </p>

      <div className="email-banner__acoes">
        <button type="button" className="email-banner__botao" onClick={aoReenviar} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Reenviar'}
        </button>
        <button type="button" className="email-banner__botao" onClick={() => checkAuth()} disabled={enviando}>
          Já confirmei
        </button>
        <button
          type="button"
          className="email-banner__dispensar"
          onClick={dispensar}
          aria-label="Dispensar o aviso até o próximo login"
          title="Dispensar até o próximo login"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      {aviso && (
        <p className={`email-banner__aviso email-banner__aviso--${aviso.tipo}`}>{aviso.texto}</p>
      )}
    </div>
  );
}

export default EmailConfirmationBanner;
