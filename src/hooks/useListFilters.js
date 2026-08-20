import { useCallback, useEffect, useMemo, useState } from 'react';
import { PRESETS_PERIODO, intervaloDoPreset } from '../components/ui/periodo.js';

// ═══════════════════════════════════════════════════════════════════════════
// O ESTADO DOS FILTROS DE UMA LISTAGEM — Fase F-1b.3
//
// ── As duas regras que este hook existe para tornar impossíveis de esquecer ─
//
// 1. **Mudar filtro volta para a página 1.** Sem isso, quem está na página 4 e
//    escolhe um honorário com duas páginas cai numa página vazia e conclui que
//    o honorário não tem lançamento nenhum. É o defeito mais fácil de
//    introduzir e o mais difícil de perceber, porque a tela não erra — ela
//    mostra, corretamente, a quarta página de um conjunto de duas.
//
// 2. **Trocar de página não perde filtro nem busca.** Consequência de o estado
//    viver aqui, num lugar só, e não espalhado em `useState` por controle: a
//    página é mais um campo do mesmo objeto de consulta.
//
// Escrito como hook, e não repetido nas três telas, porque as três telas são
// exatamente onde a regra se perde: a que for escrita por último copia a
// anterior e esquece o `setPage(1)`.
//
// ── O debounce ───────────────────────────────────────────────────────────
// 300 ms, o mesmo que `FeeListPage` já usava. O valor DIGITADO e o valor
// CONSULTADO são estados separados de propósito: o input é controlado pelo
// primeiro (e por isso nunca "engasga" enquanto se digita) e a consulta
// depende do segundo.
//
// ── O que este hook NÃO faz ──────────────────────────────────────────────
// Não busca nada. Quem consulta é a tela, no seu próprio `useEffect`, porque
// cada listagem tem endpoint e parâmetros próprios. Um hook que também
// buscasse teria de conhecer as três APIs — e a quarta, quando chegasse.
// ═══════════════════════════════════════════════════════════════════════════

export const useListFilters = (iniciais = {}) => {
  const [filtros, setFiltros] = useState(() => ({
    busca: '',
    honorarioId: '',
    preset: PRESETS_PERIODO.TODOS,
    de: '',
    ate: '',
    ...iniciais
  }));
  const [page, setPage] = useState(1);
  const [buscaDebounced, setBuscaDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(filtros.busca), 300);
    return () => clearTimeout(t);
  }, [filtros.busca]);

  // A REGRA 1, num lugar só. Todo controle da tela passa por aqui.
  const definirFiltro = useCallback((campo, valor) => {
    setFiltros((atuais) => ({ ...atuais, [campo]: valor }));
    setPage(1);
  }, []);

  // O preset escreve `de`/`ate` junto: os dois campos de data continuam sendo
  // a única fonte do recorte, e o preset é um atalho para preenchê-los. Assim
  // "mês atual" e o intervalo digitado à mão percorrem exatamente o mesmo
  // caminho até a API — e não há um segundo jeito de o período chegar lá.
  const aplicarPreset = useCallback((preset) => {
    const intervalo = intervaloDoPreset(preset);
    setFiltros((atuais) => ({
      ...atuais,
      preset,
      // "Personalizado" PRESERVA o que já estava nos campos: a pessoa que
      // veio de "mês atual" e quer ajustar uma ponta não deveria perder a
      // outra.
      de: preset === PRESETS_PERIODO.PERSONALIZADO ? atuais.de : (intervalo.de ?? ''),
      ate: preset === PRESETS_PERIODO.PERSONALIZADO ? atuais.ate : (intervalo.ate ?? '')
    }));
    setPage(1);
  }, []);

  const limpar = useCallback(() => {
    setFiltros((atuais) => {
      const zerado = {};
      for (const chave of Object.keys(atuais)) {
        zerado[chave] = chave === 'preset' ? PRESETS_PERIODO.TODOS : '';
      }
      return zerado;
    });
    setPage(1);
  }, []);

  // Quais filtros estão valendo AGORA. É o que a barra exibe e o que o estado
  // vazio usa para dizer o que está filtrando — quem chega numa lista curta
  // precisa saber se ela é curta ou está filtrada.
  const ativos = useMemo(() => {
    const lista = [];
    for (const [chave, valor] of Object.entries(filtros)) {
      if (chave === 'preset') continue;
      if (valor !== '' && valor !== undefined && valor !== null && valor !== false) {
        lista.push(chave);
      }
    }
    if (filtros.preset && filtros.preset !== PRESETS_PERIODO.TODOS) lista.push('preset');
    return lista;
  }, [filtros]);

  return {
    filtros,
    buscaDebounced,
    page,
    setPage,
    definirFiltro,
    aplicarPreset,
    limpar,
    temFiltro: ativos.length > 0,
    ativos
  };
};

export default useListFilters;
