import React from 'react';
import { Outlet } from 'react-router-dom';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import './Portal.css';

// ═══════════════════════════════════════════════════════════════════════════
// MOLDURA DO PORTAL DO CLIENTE
//
// SEM `Sidebar` e SEM `Header` da advogada, e não por economia: aquelas duas
// peças são o menu de um sistema de gestão — Clientes, Processos, Financeiro,
// Perfil. Nenhum daqueles destinos existe para o cliente, e exibir a moldura
// de um sistema que ele não pode operar só sugere que há mais coisa atrás.
//
// O portal tem UMA barra, com o nome do escritório, o botão de sair, e nada
// mais. Há teste travando a ausência dos dois imports.
//
// Mobile-first: o cliente abre isto no celular, com um código que recebeu por
// WhatsApp ou num papel. Uma coluna, alvo de toque grande, fonte legível.
// ═══════════════════════════════════════════════════════════════════════════

function PortalLayout() {
  const { autenticado, sair } = usePortalAuth();

  return (
    <div className="portal">
      <header className="portal__barra">
        <span className="portal__marca">LEX</span>
        <span className="portal__subtitulo">Portal do cliente</span>

        {/* Sair fica visível SEMPRE que há sessão, inclusive na tela de troca
            de senha. O aparelho pode ser emprestado, e uma saída escondida
            atrás de um menu é uma saída que ninguém usa. */}
        {autenticado && (
          <button type="button" className="portal__sair" onClick={sair}>
            Sair
          </button>
        )}
      </header>

      <main className="portal__conteudo">
        <Outlet />
      </main>

      <footer className="portal__rodape">
        <p className="portal__rodape-texto">
          Esta área mostra apenas o seu processo e os documentos que a advogada
          liberou para você.
        </p>
      </footer>
    </div>
  );
}

export default PortalLayout;
