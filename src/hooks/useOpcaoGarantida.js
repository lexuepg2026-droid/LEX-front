import { useEffect, useRef, useState } from 'react';
import { comOpcaoGarantida, precisaBuscarOpcao } from '../utils/seletorLimitado';

// ═══════════════════════════════════════════════════════════════════════════
// O SELETOR COM A OPÇÃO ESCOLHIDA GARANTIDA — Fase 2b (DEC-086)
//
// A regra está em `utils/seletorLimitado.js` (função pura, testada). Aqui só a
// busca: se o id escolhido não veio entre os 100 da lista, `buscar(id)` traz
// o item (`GET /processes/:id`, `GET /fees/:id`) e ele entra como opção.
//
// Sem espelho local de propósito: os dois formulários são escrita, e escrita
// sem sinal já é recusada (F-5a). A busca que falha deixa a opção marcada
// como indisponível, e o valor continua no estado — o servidor diz o resto.
// ═══════════════════════════════════════════════════════════════════════════
export default function useOpcaoGarantida({ lista, listaCarregada, idEscolhido, buscar }) {
  const [extra, setExtra] = useState(null);
  const [falhou, setFalhou] = useState(null); // id cuja busca falhou
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  const jaTem = extra && String(extra._id) === String(idEscolhido);
  const deveBuscar = precisaBuscarOpcao(lista, idEscolhido, listaCarregada) && !jaTem;

  useEffect(() => {
    if (!deveBuscar) return undefined;
    let ativo = true;
    buscarRef.current(idEscolhido)
      .then((item) => { if (ativo && item) setExtra(item); })
      .catch(() => { if (ativo) setFalhou(String(idEscolhido)); });
    return () => { ativo = false; };
  }, [deveBuscar, idEscolhido]);

  const pendente = falhou === String(idEscolhido) ? 'indisponivel' : 'carregando';
  return comOpcaoGarantida(lista, idEscolhido, extra, pendente);
}
