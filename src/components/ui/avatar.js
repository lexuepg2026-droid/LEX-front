// ═══════════════════════════════════════════════════════════════════════════
// O AVATAR DO CLIENTE — as regras, em função pura (Fase 3.5, DEC-120)
//
// A inicial do nome (ou da razão social) num círculo colorido, como na
// Figura 19 da Raniele. A cor é DETERMINÍSTICA pelo `_id`: a mesma pessoa tem
// a mesma cor na lista, no detalhe e amanhã — e não pelo nome, que muda
// quando o cadastro é corrigido.
//
// Arquivo `.js`, e não dentro do `.jsx`: a suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

// Os oito fundos de `variables.css` (`--color-avatar-1` a `-8`).
export const TOTAL_DE_CORES = 8;

// 1 a 8. Soma com peso de posição sobre o id inteiro: a soma simples dos
// caracteres (a da Raniele) dá o mesmo resultado para ids que só trocam dois
// dígitos de lugar, e os ObjectIds criados em sequência diferem pouco.
export const indiceDaCor = (id) => {
  const texto = typeof id === 'string' ? id : String(id ?? '');
  if (!texto) return 1;
  let h = 0;
  for (let i = 0; i < texto.length; i += 1) h = (h * 31 + texto.charCodeAt(i)) % 1000003;
  return (h % TOTAL_DE_CORES) + 1;
};

// A primeira LETRA do nome, maiúscula, com o acento que tiver ("Ágata" → "Á").
// Pula o que não é letra ("3M Ltda" → "M"); sem letra nenhuma, "?".
export const inicialDoNome = (nome) => {
  const texto = typeof nome === 'string' ? nome.trim() : '';
  const letra = texto.match(/\p{L}/u);
  return letra ? letra[0].toLocaleUpperCase('pt-BR') : '?';
};

export default { TOTAL_DE_CORES, indiceDaCor, inicialDoNome };
