import React, { useState } from 'react';
import clientService from '../../api/clientService';
import { toast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { blockReason } from '../../offline/offlineMessages';
import '../../pages/clients/ClientPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// REVOGAR O ACESSO AO PORTAL — confirmação em dois passos (Fase 3.2)
//
// Saiu de dentro de `ClientFormPage` na Fase 3.5 (DEC-123) para a aba
// "Portal" do detalhe usar a MESMA revogação, com o mesmo texto: duas cópias
// da frase que diz o que se perde divergiriam na primeira revisão.
//
// Rota própria (`DELETE /clients/:id/senha-portal`), e não um campo
// esvaziado: tirar o acesso de uma pessoa é ação deliberada, com efeito
// imediato. As confirmações que ela registrou NÃO são apagadas (DEC-029).
// ═══════════════════════════════════════════════════════════════════════════
function RevogacaoPortal({ clienteId, online = true, onRevogado }) {
  const [confirmando, setConfirmando] = useState(false);
  const [revogando, setRevogando] = useState(false);
  const [erro, setErro] = useState('');
  const motivo = blockReason(null, { online });

  const revogar = async () => {
    if (!online || revogando) return;
    setRevogando(true);
    setErro('');
    try {
      await clientService.revogarSenhaPortal(clienteId);
      setConfirmando(false);
      toast.success('Acesso ao portal revogado. O cliente não consegue mais entrar.');
      onRevogado?.();
    } catch (err) {
      setErro(getApiErrorMessage(err, 'Não foi possível revogar o acesso ao portal.'));
    } finally {
      setRevogando(false);
    }
  };

  return (
    <div className="portal-revogar">
      {confirmando ? (
        <div className="portal-revogar-confirma">
          <p className="cep-hint">
            O cliente perde o acesso ao portal imediatamente. As
            confirmações que ele já registrou <strong>não</strong> são
            apagadas.
          </p>
          <button
            type="button"
            className="btn-portal-revogar"
            onClick={revogar}
            aria-disabled={online && !revogando ? undefined : 'true'}
          >
            {revogando ? 'Revogando…' : 'Confirmar revogação'}
          </button>
          <button
            type="button"
            className="btn-portal-cancelar"
            onClick={() => setConfirmando(false)}
            disabled={revogando}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="btn-portal-revogar"
          aria-disabled={online ? undefined : 'true'}
          onClick={() => { if (online) setConfirmando(true); }}
        >
          Revogar acesso ao portal
        </button>
      )}
      {motivo && <p className="cep-hint">{motivo}</p>}
      {erro && <p className="error-message">{erro}</p>}
    </div>
  );
}

export default RevogacaoPortal;
