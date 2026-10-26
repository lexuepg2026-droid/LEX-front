import React from 'react';
import { Link } from 'react-router-dom';
import Icone from '../ui/Icone';
import './CabecalhoDeLista.css';

// ═══════════════════════════════════════════════════════════════════════════
// O TOPO DO BALÃO DAS LISTAS FINANCEIRAS — Fase 3.2 (DEC-102), Figura 19
//
// O desenho da lista de clientes da Raniele: o título com o total entre
// parênteses, a busca larga em pílula e o "+" à direita. Os filtros da F-1b.3
// ficam numa linha abaixo, em pílulas (`FinancialFilters`, `pilulas`).
//
// - **A busca NÃO desmonta** quando a lista atualiza: este componente é de
//   módulo e a tela o renderiza sempre, inclusive no carregamento (a causa do
//   passo 155, travada desde a F-1a.1).
// - **O total** só aparece quando há resposta (do servidor ou do espelho):
//   "(0)" enquanto carrega seria uma afirmação falsa.
// - **O "+" é só ícone**, então leva `aria-label` ("Novo honorário"…). Sem
//   sinal, vira `<button aria-disabled>` com o motivo ao lado — a regra do
//   `PageHeader` (F-5a): botão que some faz procurar.
// ═══════════════════════════════════════════════════════════════════════════

function CabecalhoDeLista({
  id,
  titulo,
  total = null,
  busca,
  onBusca,
  placeholderBusca,
  rotuloBusca,
  novoRotulo,
  novoDestino,
  novoMotivo = null,
}) {
  return (
    <div className="lista-balao__topo">
      <h1 className="lista-balao__titulo" id={id}>
        {titulo}
        {typeof total === 'number' && <span className="lista-balao__total"> ({total})</span>}
      </h1>

      <div className="lista-balao__busca">
        <Icone nome="lupa" tamanho={16} className="lista-balao__lupa" />
        <input
          type="search"
          value={busca}
          onChange={(e) => onBusca(e.target.value)}
          placeholder={placeholderBusca}
          aria-label={rotuloBusca}
          maxLength={80}
        />
      </div>

      {novoMotivo ? (
        <div className="lista-balao__novo-bloqueado">
          <button
            type="button"
            className="lista-balao__novo"
            aria-label={novoRotulo}
            aria-disabled="true"
            onClick={(e) => e.preventDefault()}
          >
            <span aria-hidden="true">+</span>
          </button>
          <span className="lista-balao__motivo">{novoMotivo}</span>
        </div>
      ) : (
        <Link to={novoDestino} className="lista-balao__novo" aria-label={novoRotulo} title={novoRotulo}>
          <span aria-hidden="true">+</span>
        </Link>
      )}
    </div>
  );
}

export default CabecalhoDeLista;
