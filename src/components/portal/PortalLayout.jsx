import React from 'react';
import { Outlet } from 'react-router-dom';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import LogoLex from '../ui/LogoLex.jsx';
import './Portal.css';

// ═══════════════════════════════════════════════════════════════════════════
// MOLDURA DO PORTAL DO CLIENTE
//
// SEM `Sidebar` e SEM `Header` da advogada, e não por economia: aquelas duas
// peças são o menu de um sistema de gestão — Clientes, Processos, Financeiro,
// Perfil. Nenhum daqueles destinos existe para o cliente, e exibir a moldura
// de um sistema que ele não pode operar só sugere que há mais coisa atrás.
//
// O portal tem UMA barra, com a logo, o botão de sair, e nada mais. Há teste
// travando a ausência dos dois imports.
//
// Fase 2.5 (DEC-096): a pele é a da Figura 15, com os tokens fixos da marca
// (DEC-078). A barra só aparece com sessão: no login a logo fica embaixo do
// cartão, como no desenho, e uma barra em cima a repetiria.
//
// Mobile-first: o cliente abre isto no celular, com um código que recebeu por
// WhatsApp ou num papel. Uma coluna, alvo de toque grande, fonte legível.
// ═══════════════════════════════════════════════════════════════════════════

function PortalLayout() {
  const { autenticado, sair } = usePortalAuth();

  return (
    <div className="portal">
      {autenticado && (
        <header className="portal__barra">
          <span className="portal__marca">
            <LogoLex className="portal__logo" />
          </span>
          <span className="portal__subtitulo">Portal do cliente</span>

          {/* Sair fica visível SEMPRE que há sessão, inclusive na tela de troca
              de senha. O aparelho pode ser emprestado, e uma saída escondida
              atrás de um menu é uma saída que ninguém usa. */}
          <button type="button" className="portal__sair" onClick={sair}>
            Sair
          </button>
        </header>
      )}

      <main className="portal__conteudo">
        <Outlet />
      </main>

      <footer className="portal__rodape">
        <p className="portal__rodape-texto">
          Esta área mostra apenas os processos e os documentos que a advogada
          liberou para você.
        </p>
      </footer>
    </div>
  );
}

export default PortalLayout;
