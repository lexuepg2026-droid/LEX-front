import React from 'react';
import Icone from '../ui/Icone';
import './CartaoDeResumo.css';

// ═══════════════════════════════════════════════════════════════════════════
// O CARTÃO DE RESUMO — Fase 3.7 (DEC-131)
//
// O cartão do Início (valor em cima, rótulo embaixo, nota de rodapé), saído da
// tela para a Visão geral do Financeiro usar o MESMO desenho — e não uma
// cópia que divergiria na primeira fase que mexesse num dos dois.
//
// `icone` é o nome de um ícone da Raniele (`Icone`); `Icon`, um componente do
// lucide para quando ela não tem equivalente (o alerta). `valor` chega já
// formatado: quem decide se é dinheiro ou contagem é a tela.
// ═══════════════════════════════════════════════════════════════════════════
function CartaoDeResumo({ rotulo, valor, cor = 'neutral', icone, Icon, nota }) {
  return (
    <div className={`summary-card summary-card--${cor}`}>
      <p className="card-label">
        <span className="card-icon">
          {icone ? <Icone nome={icone} tamanho={16} /> : Icon ? <Icon size={16} aria-hidden="true" /> : null}
        </span>
        {rotulo}
      </p>
      <p className="card-value">{valor}</p>
      {nota && <p className="card-note">{nota}</p>}
    </div>
  );
}

export default CartaoDeResumo;
