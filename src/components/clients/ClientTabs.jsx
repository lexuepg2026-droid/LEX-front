import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ABAS, queryDaAba } from '../../pages/clients/detalheCliente.js';
import '../../pages/processes/ProcessTabs.css';

// ═══════════════════════════════════════════════════════════════════════════
// AS ABAS DO CLIENTE, EM PÍLULAS — Fase 3.5 (DEC-123), Figura 21
//
// O molde de `ProcessTabs` (DEC-111): as mesmas pílulas e a mesma folha. A
// diferença é que aqui as três abas são DESTA página, e a escolhida mora na
// URL (`?aba=`): cada troca é uma entrada do histórico, então o "voltar" do
// navegador volta à aba anterior, e o link copiado abre na mesma aba. A
// atual é texto com `aria-current`; as outras, links — como no processo.
// ═══════════════════════════════════════════════════════════════════════════
function ClientTabs({ aba }) {
  const location = useLocation();
  return (
    <nav className="processo-abas" aria-label="Seções do cliente">
      <ul className="processo-abas__lista">
        {ABAS.map(({ id, rotulo }) => (
          <li key={id}>
            {id === aba ? (
              <span className="processo-aba processo-aba--ativa" aria-current="page">{rotulo}</span>
            ) : (
              <Link
                to={{ search: queryDaAba(location.search, id) }}
                className="processo-aba"
                preventScrollReset
              >
                {rotulo}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default ClientTabs;
