// ═══════════════════════════════════════════════════════════════════════════
// O TOM DE CADA DATA — Fase 3.8 (DEC-134): uma regra só, em todas as telas
//
// Antes da 3.8 a mesma coisa tinha cor diferente em duas telas: na Agenda o
// vencimento era azul listrado e o compromisso verde; no Início e na Visão
// geral (`LinhaDeData`) o vencimento era âmbar e o compromisso azul. Agora a
// regra é esta, e a Agenda e a `LinhaDeData` leem DAQUI:
//
//   vencimento (parcela a vencer) → âmbar,    `--color-warning-*`
//   vencida                       → vermelho, `--color-danger-*`
//   compromisso                   → azul,     `--color-info-*`
//
// O tom vira classe (`tom-data--warning`…), e a classe põe três variáveis
// locais (`--tom-fundo`, `--tom-texto`, `--tom-forte`) em `styles/tomDaData.css`.
// As folhas que pintam pílula, marca ou legenda usam as variáveis e nunca
// nomeiam o token semântico: trocar o tom de uma natureza é trocar uma linha.
//
// A cor nunca é a única informação: a pílula da linha diz a natureza por
// escrito, e na grade o vencimento é LISTRADO (derivado, DEC-055) e o item
// leva o rótulo acessível completo.
// ═══════════════════════════════════════════════════════════════════════════

// As chaves são as de `TIPOS_DE_DATA` (`pages/dashboard/inicio.js`), que dá
// os rótulos. Há teste conferindo que as duas listas têm as mesmas chaves.
export const TOM_DA_DATA = Object.freeze({
  vencimento: 'warning',
  vencida: 'danger',
  compromisso: 'info',
});

export const classeDoTom = (tipo) => `tom-data--${TOM_DA_DATA[tipo] ?? TOM_DA_DATA.compromisso}`;

// Um item de `GET /calendar` → o tipo de data. O evento é compromisso; a
// derivada é vencimento, ou vencida quando o servidor já diz `vencido` (o
// status é derivado pelo `paymentService`, DEC-028 — a tela não recalcula).
export const tipoDaDataDoItem = (item) => {
  if (item?.natureza !== 'derivada') return 'compromisso';
  return item.status === 'vencido' ? 'vencida' : 'vencimento';
};

export default { TOM_DA_DATA, classeDoTom, tipoDaDataDoItem };
