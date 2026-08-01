import React from 'react';
import { visualDoStatus } from '../../utils/statusVisual.js';
import './StatusBadge.css';

// O mapa de status saiu daqui na Fase 4.3 e virou `utils/statusVisual.js`.
//
// O motivo é o gráfico: os donuts do dashboard tinham um segundo mapa, escrito
// à mão, que já divergia deste (`ativo` era dourado lá e verde aqui). Cor de
// badge e cor de fatia precisam ser o mesmo dado, e não duas cópias que
// alguém se lembre de sincronizar.
//
// A classe continua montada por template string — `status-badge--${tom}` —, e
// a família de regras vive em `StatusBadge.css`.
function StatusBadge({ status }) {
  const { label, tom } = visualDoStatus(status);

  return (
    <span className={`status-badge status-badge--${tom}`}>
      {label}
    </span>
  );
}

export default StatusBadge;
