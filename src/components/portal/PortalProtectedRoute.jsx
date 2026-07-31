import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { usePortalAuth } from '../../contexts/PortalAuthContext';

// ═══════════════════════════════════════════════════════════════════════════
// PORTÃO DAS ROTAS DO PORTAL
//
// Duas condições, nesta ordem:
//
//   1. sem sessão  → login DO PORTAL (`/portal`), nunca o da advogada;
//   2. senha ainda provisória → tela de troca (`/portal/senha`), e nenhuma
//      outra.
//
// A segunda é o espelho do 403 `senhaPortalProvisoria` do backend. Ela existe
// na tela para o cliente não bater numa mensagem de erro em cada porta que
// tentar: o servidor recusaria de qualquer forma, e a recusa sem caminho é
// beco sem saída.
//
// Ela NÃO é a segurança — a segurança é o 403 do servidor. Guarda de rota vive
// no navegador, e navegador é do cliente.
// ═══════════════════════════════════════════════════════════════════════════

function PortalProtectedRoute({ permitirSenhaProvisoria = false }) {
  const { autenticado, senhaProvisoria, carregando } = usePortalAuth();

  if (carregando) {
    return (
      <div className="portal-carregando" role="status" aria-live="polite">
        Carregando…
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/portal" replace />;
  }

  if (senhaProvisoria && !permitirSenhaProvisoria) {
    return <Navigate to="/portal/senha" replace />;
  }

  // Já trocou a senha e voltou à tela de troca pela URL: não há o que trocar
  // obrigatoriamente, segue para o processo. A troca voluntária é outra coisa
  // e não existe nesta fase.
  if (!senhaProvisoria && permitirSenhaProvisoria) {
    return <Navigate to="/portal/processo" replace />;
  }

  return <Outlet />;
}

export default PortalProtectedRoute;
