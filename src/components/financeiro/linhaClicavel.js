// ═══════════════════════════════════════════════════════════════════════════
// A LINHA INTEIRA CLICÁVEL — Fase 3.2 (DEC-102), padrão da Figura 19
//
// A Raniele faz a linha toda abrir o registro. Aqui também, com três cuidados
// que a lista dela não precisava ter:
//
//  1. **O menu ⋮ não dispara a linha.** O painel é portal (DEC-046): no DOM ele
//     está fora da `<tr>`, mas o React propaga o clique pela ÁRVORE de
//     componentes, e o clique num item do menu chegaria ao `onClick` da linha.
//     `currentTarget.contains(target)` é a pergunta do DOM real — o que está no
//     portal não é contido pela linha. E qualquer elemento interativo DENTRO
//     da linha (o link do nome, o gatilho ⋮) resolve o próprio clique.
//  2. **A linha não vira um alvo de Tab a mais.** Sem `tabIndex`, sem `role`:
//     quem usa teclado chega pelo link do nome, que continua sendo o caminho.
//     O clique na linha é atalho de mouse, não segunda porta.
//  3. **Selecionar texto não navega**, e clique com modificador (Ctrl, ⌘,
//     Shift, botão do meio) fica com o navegador — quem quer abrir em outra
//     aba usa o link do nome.
// ═══════════════════════════════════════════════════════════════════════════

export const INTERATIVOS = 'a, button, input, select, textarea, label, [role="menu"], [role="menuitem"]';

export const deveSeguirOCliqueDaLinha = (evento, textoSelecionado = '') => {
  if (!evento || evento.defaultPrevented) return false;
  if (typeof evento.button === 'number' && evento.button !== 0) return false;
  if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return false;
  if (String(textoSelecionado ?? '').trim() !== '') return false;
  const alvo = evento.target;
  const linha = evento.currentTarget;
  if (!linha || typeof linha.contains !== 'function' || !linha.contains(alvo)) return false;
  if (alvo && typeof alvo.closest === 'function' && alvo.closest(INTERATIVOS)) return false;
  return true;
};

export default { INTERATIVOS, deveSeguirOCliqueDaLinha };
