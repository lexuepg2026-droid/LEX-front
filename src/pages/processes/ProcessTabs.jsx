import React from 'react';
import { Link } from 'react-router-dom';
import './ProcessTabs.css';

const disabledStyle = { opacity: 0.35, cursor: 'not-allowed', pointerEvents: 'none' };

function ProcessoTabs({ processoId }) {
  return (
    <div className="tabs-container">
      <h3 className="modulos-nav-title">Módulos Relacionados</h3>
      <div className="modulos-nav">
        <Link to={`/dashboard/honorarios?processoId=${processoId}`} className="btn-primary">Honorários</Link>
        <span className="btn-primary" style={disabledStyle} aria-disabled="true" title="Filtragem por processo ainda não disponível">Parcelas</span>
        <Link to={`/dashboard/documentos?processoId=${processoId}`} className="btn-primary">Documentos</Link>
        <span className="btn-primary" style={disabledStyle} aria-disabled="true" title="Filtragem por processo ainda não disponível">Pagamentos</span>
      </div>
    </div>
  );
}

export default ProcessoTabs;
