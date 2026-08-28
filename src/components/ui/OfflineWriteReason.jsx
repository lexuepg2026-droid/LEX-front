import React from 'react';
import { MENSAGEM_ESCRITA_OFFLINE } from '../../offline/offlineMessages';
import './OfflineNotice.css';

// ═══════════════════════════════════════════════════════════════════════════
// O MOTIVO, quando o botão bloqueado não tem onde carregá-lo (F-5a, Parte 4)
//
// O `ActionMenu` e o `PageHeader` levam o motivo DENTRO do próprio item — é o
// melhor lugar, e é o que a DEC-053 decidiu. Nas telas onde a ação é um botão
// solto no cabeçalho da página, não há esse "dentro": o motivo vira uma linha
// logo abaixo, ao lado do botão que ele explica.
//
// A frase é a MESMA de todo o resto (`MENSAGEM_ESCRITA_OFFLINE`). Duas
// redações para o mesmo estado fariam a advogada achar que são dois estados.
// ═══════════════════════════════════════════════════════════════════════════

function OfflineWriteReason() {
  return <p className="offline-write-reason">{MENSAGEM_ESCRITA_OFFLINE}</p>;
}

export default OfflineWriteReason;
