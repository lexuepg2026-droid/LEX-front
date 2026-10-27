import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PRESETS_PERIODO, intervaloDoPreset } from '../components/ui/periodo.js';
import {
  filtrosDaUrl,
  paramsComFiltros,
  paramsSemFiltros,
  assinaturaDosFiltros,
  substituiNoHistorico,
} from '../utils/filtrosNaUrl.js';

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
// ── Fase 3.2 (DEC-103): `{ naUrl: true }` ────────────────────────────────
// As três listas financeiras, na página própria, guardam os filtros na query
// (`?busca=`, `?situacao=`, `?de=&ate=`…, regras em `utils/filtrosNaUrl.js`):
// o "voltar" desfaz a troca, o link copiado abre no mesmo recorte, e trocar a
// query não rola a página (`preventScrollReset`; o `VoltarAoTopo` só reage ao
// `pathname`). A página continua no estado e volta a 1 quando a assinatura
// dos filtros na URL muda — inclusive pelo "voltar".
//
// O modo de estado puro continua para quem precisar dividir a tela com outra
// lista (três listas na mesma query brigariam pelo mesmo `?busca=`). Até a
// 3.7 era o `FinanceiroPage`, que embutia as três; desde a DEC-130 ele é um
// painel e as listas só existem na página própria.
//
// ── O que este hook NÃO faz ──────────────────────────────────────────────
// Não busca nada. Quem consulta é a tela, no seu próprio `useEffect`, porque
// cada listagem tem endpoint e parâmetros próprios. Um hook que também
// buscasse teria de conhecer as três APIs — e a quarta, quando chegasse.
// ═══════════════════════════════════════════════════════════════════════════

// As três listas financeiras: filtros na URL, e o `processoId` sai junto no
// "Limpar filtros" (DEC-070). Era uma função de `embedded` até a 3.7.
const EXTRAS_DAS_FINANCEIRAS = Object.freeze(['processoId']);
export const FILTROS_DAS_FINANCEIRAS = Object.freeze({ naUrl: true, extrasNaLimpeza: EXTRAS_DAS_FINANCEIRAS });

const PADROES = { busca: '', honorarioId: '', preset: PRESETS_PERIODO.TODOS, de: '', ate: '' };

export const useListFilters = (iniciais = {}, { naUrl = false, extrasNaLimpeza = [] } = {}) => {
  const estado = useFiltrosNoEstado(iniciais);
  const url = useFiltrosNaUrl(iniciais, { ativo: naUrl, extrasNaLimpeza });
  return naUrl ? url : estado;
};

// Quais filtros estão valendo AGORA. É o que a barra exibe e o que o estado
// vazio usa para dizer o que está filtrando — quem chega numa lista curta
// precisa saber se ela é curta ou está filtrada.
const filtrosAtivos = (filtros) => {
  const lista = [];
  for (const [chave, valor] of Object.entries(filtros)) {
    if (chave === 'preset') continue;
    if (valor !== '' && valor !== undefined && valor !== null && valor !== false) {
      lista.push(chave);
    }
  }
  if (filtros.preset && filtros.preset !== PRESETS_PERIODO.TODOS) lista.push('preset');
  return lista;
};

function useFiltrosNoEstado(iniciais) {
  const [filtros, setFiltros] = useState(() => ({ ...PADROES, ...iniciais }));
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

  const ativos = useMemo(() => filtrosAtivos(filtros), [filtros]);

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
}

function useFiltrosNaUrl(iniciais, { ativo, extrasNaLimpeza }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const campos = useMemo(
    () => Object.keys({ ...PADROES, ...iniciais }).filter((c) => c !== 'preset'),
    // As chaves de `iniciais` são fixas por tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [personalizado, setPersonalizado] = useState(false);
  const [page, setPage] = useState(1);

  const daUrl = useMemo(
    () => filtrosDaUrl(searchParams, campos, { personalizado }),
    [searchParams, campos, personalizado]
  );

  // A busca DIGITADA é estado local (o input nunca engasga); a da URL é a
  // consultada. O "voltar" que muda a URL reescreve o digitado.
  const [buscaDigitada, setBuscaDigitada] = useState(daUrl.busca);
  const buscaDaUrl = daUrl.busca;
  const ultimaEscrita = useRef(buscaDaUrl);
  useEffect(() => {
    if (buscaDaUrl !== ultimaEscrita.current) {
      ultimaEscrita.current = buscaDaUrl;
      setBuscaDigitada(buscaDaUrl);
    }
  }, [buscaDaUrl]);

  // A query mais recente, inclusive a que acabou de ser escrita e o roteador
  // ainda não devolveu. Duas escritas seguidas (a data inicial e logo a final)
  // partiriam da MESMA query antiga, e a segunda apagaria a primeira — foi o
  // que a verificação no navegador da 3.2 pegou. Quando o roteador muda a URL
  // por conta própria (o "voltar"), ela passa a valer.
  const queryAtual = useRef(searchParams);
  const queryDoRoteador = useRef(searchParams);
  if (queryDoRoteador.current !== searchParams) {
    queryDoRoteador.current = searchParams;
    queryAtual.current = searchParams;
  }

  const escrever = useCallback((proximo, { substituir = false } = {}) => {
    queryAtual.current = proximo;
    setSearchParams(proximo, { replace: substituir, preventScrollReset: true });
  }, [setSearchParams]);

  // A busca vai para a URL depois da pausa de 300 ms.
  useEffect(() => {
    if (!ativo || buscaDigitada === buscaDaUrl) return undefined;
    const t = setTimeout(() => {
      ultimaEscrita.current = buscaDigitada;
      escrever(paramsComFiltros(queryAtual.current, { busca: buscaDigitada.trim() === '' ? '' : buscaDigitada }), {
        substituir: substituiNoHistorico(buscaDaUrl, buscaDigitada),
      });
    }, 300);
    return () => clearTimeout(t);
  }, [ativo, buscaDigitada, buscaDaUrl, searchParams, escrever]);

  // A REGRA 1: mudou a assinatura dos filtros na URL (por controle ou pelo
  // "voltar"), página 1.
  const assinatura = assinaturaDosFiltros(searchParams, campos, extrasNaLimpeza);
  const assinaturaAnterior = useRef(assinatura);
  useEffect(() => {
    if (assinatura !== assinaturaAnterior.current) {
      assinaturaAnterior.current = assinatura;
      setPage(1);
    }
  }, [assinatura]);

  const definirFiltro = useCallback((campo, valor) => {
    if (campo === 'busca') {
      setBuscaDigitada(valor);
      return;
    }
    escrever(paramsComFiltros(queryAtual.current, { [campo]: valor }));
    setPage(1);
  }, [escrever]);

  const aplicarPreset = useCallback((preset) => {
    setPersonalizado(preset === PRESETS_PERIODO.PERSONALIZADO);
    if (preset === PRESETS_PERIODO.PERSONALIZADO) return; // preserva as datas
    const intervalo = intervaloDoPreset(preset);
    escrever(paramsComFiltros(queryAtual.current, { de: intervalo.de ?? '', ate: intervalo.ate ?? '' }));
    setPage(1);
  }, [escrever]);

  const limpar = useCallback(() => {
    setPersonalizado(false);
    setBuscaDigitada('');
    ultimaEscrita.current = '';
    escrever(paramsSemFiltros(queryAtual.current, campos, extrasNaLimpeza));
    setPage(1);
  }, [campos, extrasNaLimpeza, escrever]);

  const filtros = useMemo(() => ({ ...daUrl, busca: buscaDigitada }), [daUrl, buscaDigitada]);
  const ativos = useMemo(() => filtrosAtivos({ ...daUrl }), [daUrl]);

  return {
    filtros,
    buscaDebounced: buscaDaUrl,
    page,
    setPage,
    definirFiltro,
    aplicarPreset,
    limpar,
    temFiltro: ativos.length > 0,
    ativos
  };
}

export default useListFilters;
