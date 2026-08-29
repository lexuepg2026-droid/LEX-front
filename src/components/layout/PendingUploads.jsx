import React from 'react';
import { Link } from 'react-router-dom';
import { CloudUpload } from 'lucide-react';

import { useOutbox } from '../../contexts/OutboxContext';
import './PendingUploads.css';

// ═══════════════════════════════════════════════════════════════════════════
// O CONTADOR DA FILA — ao lado do sino, e sem discordar dele (F-5b, Parte 4)
//
// **Sempre visível quando houver.** Uma fila que só aparece quando a advogada
// vai procurá-la é uma fila que ninguém olha — e uma entrada falhada que
// ninguém olha é trabalho perdido em silêncio.
//
// ── Por que não é o sino ────────────────────────────────────────────────
// O sino conta o que EXIGE ATENÇÃO no mundo: prazo de hoje, parcela vencida.
// Este conta o que ainda não SAIU DAQUI. São duas perguntas diferentes, e
// somá-las num número só faria "3" significar coisas diferentes conforme o
// dia. Ícone diferente, cor diferente, destino diferente — e, por isso, nunca
// discordam.
//
// ── Zero não aparece ────────────────────────────────────────────────────
// Mesma regra do sino (F-3): um badge com zero é ruído permanente no canto do
// olho, e a pessoa aprende a ignorar os dois.
//
// ── A cor muda quando alguma falhou ─────────────────────────────────────
// Pendente é normal — a fila sobe sozinha. **Falhada é decisão parada**, e ela
// não sobe sem a advogada. As duas no mesmo tom fariam a segunda parecer a
// primeira, e ela ficaria lá.
// ═══════════════════════════════════════════════════════════════════════════

function PendingUploads() {
  const { quantidade, falhas } = useOutbox();

  if (quantidade === 0) return null;

  const rotulo = falhas > 0
    ? `${quantidade} ${quantidade === 1 ? 'alteração não enviada' : 'alterações não enviadas'}, ` +
      `${falhas} ${falhas === 1 ? 'com falha' : 'com falha'}`
    : `${quantidade} ${quantidade === 1 ? 'alteração não enviada' : 'alterações não enviadas'}`;

  return (
    <Link
      to="/dashboard/pendencias"
      className={`fila-badge${falhas > 0 ? ' fila-badge--falha' : ''}`}
      aria-label={rotulo}
      title={rotulo}
    >
      <CloudUpload size={18} aria-hidden="true" />
      <span className="fila-badge__contagem" aria-hidden="true">{quantidade}</span>
    </Link>
  );
}

export default PendingUploads;
