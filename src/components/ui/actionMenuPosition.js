// ═══════════════════════════════════════════════════════════════════════════
// ONDE O PAINEL DO MENU CAI NA TELA — Fase F-1b.3.1 (DEC-046)
//
// Módulo `.js` separado, e não uma função dentro do `ActionMenu.jsx`, pela
// razão de sempre neste projeto: a suíte é `node --test` sem DOM e sem
// transformação de JSX (Fase 2E.2). Arquivo `.jsx` só se testa por varredura
// de TEXTO — que prova que a linha existe, não que a conta acerta. Aqui há
// conta de verdade, com quatro casos que erram calados: o alinhamento pela
// direita, a virada horizontal de 360 px, a virada vertical da última linha
// visível e o painel maior que o próprio viewport.
//
// A função é pura: recebe dois retângulos (do gatilho e do painel, ambos já
// medidos por `getBoundingClientRect()`) e o tamanho do viewport, devolve
// `{ top, left }`. Ela não toca no DOM e não sabe o que é um menu.
// ═══════════════════════════════════════════════════════════════════════════

// Respiro entre o gatilho e o painel, e entre o painel e a borda da tela. O
// segundo existe para o painel nunca encostar no limite do viewport: colado na
// borda ele se lê como cortado, que é justamente o defeito que esta fase veio
// corrigir.
const FOLGA_GATILHO = 4;
const MARGEM_TELA = 8;

// A conta do posicionamento, fora do componente e pura: recebe dois retângulos
// e o tamanho do viewport, devolve `{ top, left }`. É a única parte disto que
// dá para testar sem DOM — e é a parte onde os erros moram.
export const posicaoDoPainel = (gatilho, painel, viewport) => {
  const { width: larguraTela, height: alturaTela } = viewport;

  // ── Horizontal: alinhado à DIREITA do gatilho ──────────────────────────
  // A coluna de ações é a última da tabela; abrir para a esquerda é o que
  // mantém o painel sobre a tabela em vez de sobre a margem.
  let left = gatilho.right - painel.width;

  // A virada horizontal. Em 360 px o painel (180 px) é mais largo que o espaço
  // à esquerda do gatilho, e o alinhamento pela direita daria `left` negativo
  // — metade do menu fora da tela. Aí ele alinha pela ESQUERDA do gatilho.
  if (left < MARGEM_TELA) left = gatilho.left;

  // E se nem assim couber (viewport mais estreito que o painel), ele encosta
  // na margem. `Math.max` por último: a coordenada NUNCA sai do viewport, que
  // é a regra desta fase.
  if (left + painel.width > larguraTela - MARGEM_TELA) {
    left = larguraTela - MARGEM_TELA - painel.width;
  }
  left = Math.max(MARGEM_TELA, left);

  // ── Vertical: abaixo do gatilho, e acima se não couber ─────────────────
  // A última linha visível da tabela é o caso real: é a linha em que o menu
  // aberto para baixo cairia inteiro fora da tela.
  let top = gatilho.bottom + FOLGA_GATILHO;

  if (top + painel.height > alturaTela - MARGEM_TELA) {
    const acima = gatilho.top - painel.height - FOLGA_GATILHO;
    // Só vira para cima se lá couber DE VERDADE. Um painel mais alto que a
    // tela não cabe em lugar nenhum: nesse caso ele fica preso à margem de
    // baixo, ainda dentro do viewport.
    top = acima >= MARGEM_TELA ? acima : Math.max(MARGEM_TELA, alturaTela - MARGEM_TELA - painel.height);
  }

  return { top, left };
};

export default { posicaoDoPainel };
