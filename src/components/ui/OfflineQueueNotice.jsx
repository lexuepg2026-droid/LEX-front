import React from 'react';
import { CloudUpload } from 'lucide-react';
import './OfflineNotice.css';

// ═══════════════════════════════════════════════════════════════════════════
// "SEM SINAL, MAS PODE SALVAR" — o aviso das duas telas da fila (F-5b)
//
// O contrário do `OfflineWriteReason` da F-5a, e é por isso que são dois
// componentes: aquele diz *"você pode consultar, mas não registrar"*; este diz
// que **pode registrar**, e o que vai acontecer com o que ela registrar.
//
// Aparece só nas duas telas que a Parte 0 da F-5b autorizou — compromisso da
// agenda e mudança de fase. Em todo o resto, o aviso continua sendo o da F-5a,
// porque a regra continua sendo a da F-5a.
// ═══════════════════════════════════════════════════════════════════════════

function OfflineQueueNotice() {
  return (
    <p className="offline-queue-notice" role="status">
      <CloudUpload size={16} aria-hidden="true" />
      <span>
        Sem conexão — você pode salvar assim mesmo. A alteração fica na fila
        deste aparelho e é enviada sozinha quando o sinal voltar.
      </span>
    </p>
  );
}

export default OfflineQueueNotice;
