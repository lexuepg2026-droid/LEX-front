import React from 'react';
import { Link } from 'react-router-dom';
import './Button.css';
import './PageHeader.css';

// ═══════════════════════════════════════════════════════════════════════════
// `actionMotivo` — o botão que não dá para usar, e a razão ao lado (F-5a)
//
// Mesmo padrão da **DEC-053**, agora no botão principal da tela: item ausente
// faz procurar; item desabilitado com explicação ensina. Sem sinal, "Novo
// cliente" continua onde sempre esteve, atenuado, com a frase ao lado —
// *"Sem conexão — você pode consultar, mas não registrar."* Escondê-lo faria a
// advogada procurar por um botão que o sistema não perdeu.
//
// **`aria-disabled`, e não `disabled`**, pela mesma razão registrada na
// DEC-053: `<button disabled>` não recebe foco, e o motivo — que é o ponto
// inteiro — ficaria invisível para quem depende de leitor de tela. O clique é
// barrado no handler, porque `aria-disabled` só anuncia.
//
// E é `<button>` mesmo quando a ação normal seria um `<Link>`: um link
// desabilitado não existe em HTML. Um `<a>` sem `href` não é focável, e com
// `href` continuaria navegando.
// ═══════════════════════════════════════════════════════════════════════════

function PageHeader({ title, actionLabel, actionTo, onAction, actionMotivo }) {
  const bloqueado = Boolean(actionMotivo);

  return (
    <div className="page-header-ui">
      <h1 className="page-header-ui__title">{title}</h1>

      {actionLabel && bloqueado && (
        <div className="page-header-ui__acao">
          <button
            type="button"
            className="ui-btn ui-btn--primary ui-btn--md"
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
          >
            {actionLabel}
          </button>
          <span className="page-header-ui__motivo">{actionMotivo}</span>
        </div>
      )}

      {actionLabel && actionTo && !bloqueado && (
        <Link to={actionTo} className="ui-btn ui-btn--primary ui-btn--md">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !bloqueado && (
        <button type="button" className="ui-btn ui-btn--primary ui-btn--md" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default PageHeader;
