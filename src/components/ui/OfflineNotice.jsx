import React from 'react';
import { WifiOff } from 'lucide-react';
import { offlineNoticeText } from '../../offline/dataAge';
import './OfflineNotice.css';

// ═══════════════════════════════════════════════════════════════════════════
// O AVISO DE IDADE — dado offline nunca se apresenta como dado ao vivo (F-5a)
//
// Fica no TOPO da tela que está sendo servida do espelho local, e diz a hora da
// **última atualização daquele dado** — nunca a hora atual. A redação inteira
// mora em `offline/dataAge.js`, que é função pura e testada: a tela não monta
// frase, ela exibe a que existe.
//
// `role="status"` e não `role="alert"`: alerta interrompe o leitor de tela, e
// isto não é uma emergência — é uma condição do que está na tela. Anunciar em
// `polite` é o que faz a informação chegar sem cortar o que a advogada estava
// lendo.
//
// Por que ele não é global no layout: a idade é **daquele dado**, não da
// sessão. Duas telas abertas no mesmo minuto podem ter dados de horas
// diferentes, e um aviso único no cabeçalho teria de escolher uma hora só —
// que é exatamente a mentira que a Parte 3 da fase existe para não contar.
// ═══════════════════════════════════════════════════════════════════════════

function OfflineNotice({ atualizadoEm }) {
  return (
    <div className="offline-notice" role="status">
      <WifiOff size={16} aria-hidden="true" />
      <span>{offlineNoticeText(atualizadoEm)}</span>
    </div>
  );
}

export default OfflineNotice;
