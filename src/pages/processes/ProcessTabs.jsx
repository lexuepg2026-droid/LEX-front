import React from 'react';
import { Link } from 'react-router-dom';
import './ProcessTabs.css';

// ═══════════════════════════════════════════════════════════════════════════
// AS ABAS DO PROCESSO, EM PÍLULAS — Fase 3.3b (DEC-111), Figura 21
//
// O desenho das abas dela, no topo do detalhe. A primeira é a página em que se
// está ("Visão geral", `aria-current`); as outras são LINKS para as listas
// filtradas por `?processoId=`, como já eram — elas têm paginação, filtros e
// faixa de contexto próprios, e trazê-las para dentro da página seria refazer
// quatro telas.
// ═══════════════════════════════════════════════════════════════════════════
const LISTAS = [
  ['Honorários', 'honorarios'],
  ['Parcelas', 'parcelas'],
  ['Pagamentos', 'pagamentos'],
  ['Documentos', 'documentos'],
];

function ProcessoTabs({ processoId }) {
  return (
    <nav className="processo-abas" aria-label="Seções do processo">
      <ul className="processo-abas__lista">
        <li>
          <span className="processo-aba processo-aba--ativa" aria-current="page">Visão geral</span>
        </li>
        {LISTAS.map(([rotulo, rota]) => (
          <li key={rota}>
            <Link to={`/dashboard/${rota}?processoId=${processoId}`} className="processo-aba">{rotulo}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default ProcessoTabs;
