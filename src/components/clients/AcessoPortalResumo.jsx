import React, { useEffect, useState } from 'react';
import clientService from '../../api/clientService';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatDate } from '../../utils/formatters';
import { pluralizar } from '../ui/plural.js';
import '../../pages/clients/ClientPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// "ACESSO AO PORTAL" NO DETALHE DO CLIENTE (Fase 2.5, DEC-097)
//
// O login do portal é da pessoa (DEC-089): um código pessoal e uma senha. Este
// bloco mostra o ESTADO dela — o código, a situação da senha e quantos dos
// processos ativos estão liberados —, e nunca a senha, que é hash.
//
// A lista completa por processo, com os interruptores, é da subfase 3.5
// (Clientes); hoje cada processo se libera no detalhe dele. A revogação
// continua onde estava, no formulário do cliente.
//
// Sem espelho local de propósito: é metade de uma credencial, e não fica
// guardada no navegador. Sem sinal, o bloco diz que não pôde consultar.
// ═══════════════════════════════════════════════════════════════════════════
function AcessoPortalResumo({ clienteId }) {
  const [acesso, setAcesso] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    clientService
      .getAcessoPortal(clienteId)
      .then((res) => { if (ativo) setAcesso(res.data); })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Não foi possível consultar o acesso ao portal.'));
      });
    return () => { ativo = false; };
  }, [clienteId]);

  return (
    <div className="detail-section">
      <h3>Acesso ao portal</h3>
      {erro && <p className="error-message">{erro}</p>}
      {!erro && !acesso && <p>Consultando…</p>}

      {acesso && !acesso.temSenhaPortal && (
        <p>
          Sem acesso ao portal. Para dar acesso, defina uma senha provisória em
          <strong> Editar</strong>: o código pessoal é criado junto com ela.
        </p>
      )}

      {acesso?.temSenhaPortal && (
        <>
          <p>
            <strong>Código de acesso pessoal:</strong>{' '}
            <span className="acesso-portal__codigo">{acesso.codigoAcessoPessoal}</span>
          </p>
          <p>
            <strong>Senha:</strong>{' '}
            {acesso.senhaPortalProvisoria
              ? 'provisória — o portal pede a troca no primeiro acesso'
              : `definida pelo cliente${acesso.senhaPortalDefinidaEm ? ` em ${formatDate(acesso.senhaPortalDefinidaEm)}` : ''}`}
          </p>
          <p>
            <strong>Processos no portal:</strong>{' '}
            {/* "N de M processos liberados" — concordando com M: "0 de 1
                processo liberado", "2 de 3 processos liberados". */}
            {acesso.processosLiberados} de {acesso.processosAtivos}{' '}
            {pluralizar(acesso.processosAtivos, 'processo')}{' '}
            {pluralizar(acesso.processosAtivos, 'liberado')}
          </p>
          <p className="acesso-portal__nota">
            Cada processo se libera no detalhe dele, em "Clientes do processo".
          </p>
        </>
      )}
    </div>
  );
}

export default AcessoPortalResumo;
