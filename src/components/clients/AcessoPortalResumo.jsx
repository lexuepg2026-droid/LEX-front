import React from 'react';
import { Link } from 'react-router-dom';
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
// Fase 3.5 (DEC-123): o bloco mora na aba "Portal", logo acima da lista dos
// processos com os interruptores, e passou a RECEBER o `acesso` da aba — que
// lê `GET /clients/:id/acesso-portal` uma vez para os dois. Sem espelho local,
// como antes: é metade de uma credencial.
// ═══════════════════════════════════════════════════════════════════════════
function AcessoPortalResumo({ clienteId, acesso }) {
  if (!acesso) return null;

  if (!acesso.temSenhaPortal) {
    return (
      <div className="acesso-portal">
        <p><strong>Sem acesso ao portal.</strong></p>
        <p>
          Para dar acesso, defina uma senha provisória no cadastro do cliente:
          o código pessoal é criado junto com ela.{' '}
          <Link to={`/dashboard/clientes/editar/${clienteId}`} className="link-interno">
            Definir a senha provisória
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="acesso-portal">
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
    </div>
  );
}

export default AcessoPortalResumo;
