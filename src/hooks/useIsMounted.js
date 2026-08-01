import { useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SENTINELA DE MONTAGEM — e o bug que ela existe para não repetir (Fase 4.4)
//
// ── O defeito ──────────────────────────────────────────────────────────────
// A tela de montagem guardava a sentinela assim:
//
//     const montado = useRef(true);
//     useEffect(() => () => { montado.current = false; }, []);
//
// O corpo do efeito é VAZIO — ele só devolve a limpeza. Parece correto e é
// correto em produção. **Em desenvolvimento, com `<React.StrictMode>`, não é.**
//
// O StrictMode monta, desmonta e monta de novo cada componente, de propósito,
// para expor efeitos que não sabem se limpar. A sequência que sai disso é:
//
//     1. render            → useRef(true)          montado.current = true
//     2. efeito            → (corpo vazio)         montado.current = true
//     3. desmonte SIMULADO → limpeza roda          montado.current = FALSE
//     4. efeito de novo    → (corpo vazio)         montado.current = FALSE  ←
//
// A partir do passo 4 a sentinela fica **presa em `false` para sempre**, com o
// componente vivo na tela. Todo `if (montado.current) setX(...)` vira um no-op
// silencioso: sem erro, sem aviso, sem nada no console.
//
// ── O sintoma que isso produziu ────────────────────────────────────────────
// Na montagem, adicionar uma seção gravava no banco (201), a releitura trazia
// a lista nova do servidor — e o `setVinculos` era descartado. A folha A4
// continuava mostrando o estado do carregamento inicial. Para a advogada:
// "cliquei em Adicionar, não deu erro nenhum, e nada aconteceu".
//
// O carregamento inicial escapava porque usa uma variável `ativo` local ao
// efeito, criada a cada execução — e não um ref que sobrevive entre elas.
//
// ── A correção ─────────────────────────────────────────────────────────────
// Uma linha: **o efeito precisa AFIRMAR a montagem**, não só negá-la na saída.
// Toda remontagem passa pelo corpo do efeito, então escrever `true` ali fecha
// o buraco do StrictMode e continua correto em produção.
//
// Vale para qualquer componente que faça `setState` depois de `await`. Está
// aqui, em hook, para a próxima tela não reescrever as duas linhas de memória —
// e errar do mesmo jeito.
// ═══════════════════════════════════════════════════════════════════════════

export default function useIsMounted() {
  const montado = useRef(true);

  useEffect(() => {
    // A linha que faltava. Sem ela, a remontagem do StrictMode deixa a
    // sentinela em `false` e todo setState guardado é engolido.
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  return montado;
}

// O ciclo de vida acima, sem React, para a suíte poder executá-lo.
//
// A suíte deste repositório não tem DOM nem renderizador (decisão da Fase
// 2E.2), então não há como montar o componente e observar o ref. O que dá para
// fazer — e é o que interessa — é rodar a MESMA sequência de chamadas que o
// React faz e conferir onde a sentinela para.
//
// `useIsMounted` acima é a versão com os ganchos do React; esta é a mesma
// lógica em objeto simples. As duas precisam ser lidas juntas: se alguém mexer
// numa e não na outra, o teste da simulação deixa de descrever o hook. É a
// troca aceita por não instalar uma testing-library só para isto.
export const simularSentinela = () => {
  const ref = { current: true };
  const efeito = () => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  };
  return { ref, efeito };
};
