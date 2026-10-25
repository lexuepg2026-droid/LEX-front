import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LogoLex from '../ui/LogoLex.jsx';
import './LayoutAutenticacao.css';

// ═══════════════════════════════════════════════════════════════════════════
// O LAYOUT DAS TELAS DE AUTENTICAÇÃO (Fase 2a, DEC-081 — Figuras 14 e 16)
//
// Tela dividida: à esquerda o painel #01261F com a logo grande, à direita o
// verde #174034 com o conteúdo. Abaixo de 768 px, uma coluna só, com a logo
// menor no topo — tela dividida em 360 px seria meia tela de logo.
//
// Cores da MARCA, iguais nos dois modos (DEC-078): quem chega ao login pode
// ter deixado o tema claro gravado, e o desenho dela não tem versão clara.
//
// Do CSS dela não vem nada além dos valores: a regra global `a { width:
// 24rem }` de `LayoutAutenticacao.css` não entra, e tudo aqui é escopado pela
// classe `.auth-layout`.
//
// `voltarPara` mostra o "Voltar" no topo esquerdo (Figura 16). A tela continua
// sendo dona do próprio conteúdo: o layout só emoldura.
// ═══════════════════════════════════════════════════════════════════════════
function LayoutAutenticacao({ voltarPara, children }) {
  return (
    <div className="auth-layout">
      {voltarPara && (
        <Link to={voltarPara} className="auth-layout__voltar">
          <span className="auth-layout__voltar-icone" aria-hidden="true">
            <ArrowLeft size={18} />
          </span>
          Voltar
        </Link>
      )}

      <div className="auth-layout__marca">
        <LogoLex className="auth-layout__logo" />
      </div>

      <main className="auth-layout__conteudo">
        {children}
      </main>
    </div>
  );
}

export default LayoutAutenticacao;
