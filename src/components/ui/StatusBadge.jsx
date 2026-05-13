import React from 'react';
import './StatusBadge.css';

const STATUS_MAP = {
  // Processos
  ativo:     { label: 'Ativo',     color: 'success' },
  encerrado: { label: 'Encerrado', color: 'neutral' },
  suspenso:  { label: 'Suspenso',  color: 'warning' },
  // Honorários / Parcelas / Pagamentos
  pendente:  { label: 'Pendente',  color: 'warning' },
  pago:      { label: 'Pago',      color: 'success' },
  cancelado: { label: 'Cancelado', color: 'danger'  },
  vencido:   { label: 'Vencido',   color: 'danger'  },
  recebido:  { label: 'Recebido',  color: 'success' },
  parcial:   { label: 'Parcial',   color: 'info'    },
};

function StatusBadge({ status }) {
  const normalized = status?.toLowerCase().trim();
  const config = STATUS_MAP[normalized] ?? { label: status ?? '—', color: 'neutral' };

  return (
    <span className={`status-badge status-badge--${config.color}`}>
      {config.label}
    </span>
  );
}

export default StatusBadge;
