import { useCallback, useRef, useState } from 'react';
import useIsMounted from './useIsMounted.js';
import { carregarTabela } from '../utils/tabelasDominio.js';

// ═══════════════════════════════════════════════════════════════════════════
// CARREGAR A TABELA NA PRIMEIRA VEZ QUE O CAMPO É USADO (DEC-057)
//
// O hook não carrega nada ao montar. Ele devolve um `ativar` que a tela passa
// ao `aoPrimeiroUso` do campo — e é o foco (ou a primeira tecla) que dispara o
// `fetch`. Quem abre o formulário de processo e sai sem tocar em "Classe" não
// baixa os 658 KB do CNJ.
//
// Carregar no `useEffect` de montagem seria mais simples e desfaria metade da
// decisão: o custo voltaria a aparecer só por a tela ter sido aberta.
//
// A memoização real é do módulo (`carregarTabela`), não daqui. Este hook só
// guarda o estado que a tela precisa mostrar — dois campos do mesmo formulário
// pedindo o CNJ compartilham a mesma promessa e o mesmo download.
// ═══════════════════════════════════════════════════════════════════════════

export default function useTabelaDominio(nome) {
  const [envelope, setEnvelope] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);
  const pedido = useRef(false);
  const montado = useIsMounted();

  const ativar = useCallback(() => {
    if (pedido.current) return;
    pedido.current = true;
    setCarregando(true);

    carregarTabela(nome)
      .then((dado) => {
        if (montado.current) setEnvelope(dado);
      })
      .catch((e) => {
        // Uma tabela que não carrega deixa o campo SEM sugestão, e não sem
        // campo: a advogada continua digitando e salvando. É a mesma regra da
        // fase inteira — sugerir é serviço, não porteiro.
        if (montado.current) setErro(e);
        // Solta o pedido para o próximo foco poder tentar de novo.
        pedido.current = false;
      })
      .finally(() => {
        if (montado.current) setCarregando(false);
      });
  }, [nome, montado]);

  return { envelope, carregando, erro, ativar };
}
