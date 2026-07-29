import { useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// FILA SERIAL DE CHAMADAS
//
// A montagem salva a cada operação, sem botão. Duas operações rápidas em
// sequência — dois cliques no ↓, ou soltar dois blocos de uma vez — disparariam
// duas requisições concorrentes sobre a MESMA sequência de ordens.
//
// Isso embaralha de duas formas:
//
//   1. As respostas voltam fora de ordem, e a última a chegar sobrescreve o
//      estado com uma sequência mais velha.
//   2. `reordenarSecoes` exige o array exato das seções vinculadas. Se a
//      segunda chamada é montada a partir de um estado que a primeira ainda
//      não confirmou, ela pode mandar um array que já não corresponde ao
//      servidor — e volta 400.
//
// A fila resolve as duas: cada tarefa só começa quando a anterior termina.
//
// `.then(tarefa, tarefa)` de propósito, nos dois ramos: a próxima operação tem
// de rodar mesmo que a anterior tenha falhado. Uma reordenação que deu erro
// não pode travar a fila para sempre.
// ═══════════════════════════════════════════════════════════════════════════
export default function useSerialQueue() {
  const cauda = useRef(Promise.resolve());

  return useCallback((tarefa) => {
    const proxima = cauda.current.then(tarefa, tarefa);

    // A cauda guarda a versão silenciada. Sem o catch aqui, uma tarefa que
    // rejeita deixaria uma promise sem tratamento pendurada na cauda e o
    // navegador registraria "unhandled rejection" a cada falha — mesmo com
    // quem chamou já tratando o erro na promise devolvida.
    cauda.current = proxima.catch(() => {});

    return proxima;
  }, []);
}
