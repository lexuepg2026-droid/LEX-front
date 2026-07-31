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
  // Estado do participante no portal (Fase 3.2), de `config/portalEstados.js`.
  //
  // Entram AQUI, no mapa que já existe, em vez de virar uma família de badge
  // nova: `status-badge--${config.color}` já é montado por template string e a
  // varredura de CSS o conhece. Uma família nova seria mais um prefixo para a
  // varredura aceitar, e mais um conjunto de cores para manter em sincronia.
  //
  // As cores são as que já existem em `StatusBadge.css` — nenhuma regra nova.
  // A distinção que importa é entre ACESSAR e CONFIRMAR: abrir a página é
  // automático e não notifica; confirmar é clique deliberado e é o recibo.
  // Por isso "acessou, não confirmou" é `warning` e não `success`.
  nunca_acessou:         { label: 'Nunca acessou',           color: 'neutral' },
  acessou_sem_confirmar: { label: 'Acessou, não confirmou',  color: 'warning' },
  confirmou:             { label: 'Confirmou a leitura',     color: 'success' },
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
