import { PRESETS_PERIODO, intervaloDoPreset } from '../components/ui/periodo.js';

// ═══════════════════════════════════════════════════════════════════════════
// OS FILTROS DAS LISTAS FINANCEIRAS NA URL — Fase 3.2 (DEC-103)
//
// Até a 3.2 o período, a situação e a busca viviam só no estado da tela: o
// "voltar" do navegador saía da lista em vez de desfazer o filtro, e um link
// copiado abria a lista inteira. Agora vivem na query, no padrão do `?mes=` do
// Início (DEC-098):
//
//   ?busca=…   ?situacao=…   ?de=AAAA-MM-DD&ate=AAAA-MM-DD   (+ os próprios
//   de cada lista: ?tipo=, ?honorarioId=, ?formaPagamento=, ?inativos=)
//
// - **O padrão continua "Qualquer período"** (decisão 8 do inventário): sem
//   `de`/`ate` na URL. Filtro vazio não se escreve.
// - O preset não vai para a URL: ele é DERIVADO de `de`/`ate`. "Mês atual" é
//   o intervalo do mês corrente; um link copiado num mês e aberto no outro
//   mostra as datas que foram copiadas, como "Intervalo personalizado" —
//   que é a verdade sobre o que está filtrado.
// - Data fora de `AAAA-MM-DD` na URL é ignorada, como o `?mes=` inválido do
//   Início: um link torto abre a lista, não um 400.
//
// Funções puras pela razão de sempre: a suíte não tem DOM.
// ═══════════════════════════════════════════════════════════════════════════

const DATA = /^\d{4}-\d{2}-\d{2}$/;

// O nome do campo do estado na URL. `status` vira `?situacao=`, o nome que a
// tela usa ("Todas as situações") e que a fase pediu; o resto é igual.
export const NOMES_NA_URL = Object.freeze({ status: 'situacao' });
export const nomeNaUrl = (campo) => NOMES_NA_URL[campo] ?? campo;

const valorLido = (campo, bruto) => {
  const v = (bruto ?? '').trim();
  if ((campo === 'de' || campo === 'ate') && v !== '' && !DATA.test(v)) return '';
  return v;
};

// O preset que um par `de`/`ate` representa. `agora` injetável para o teste.
export const presetDoIntervalo = (de, ate, agora = new Date()) => {
  if (!de && !ate) return PRESETS_PERIODO.TODOS;
  for (const p of [PRESETS_PERIODO.MES_ATUAL, PRESETS_PERIODO.ULTIMOS_6_MESES]) {
    const i = intervaloDoPreset(p, agora);
    if (i.de === de && i.ate === ate) return p;
  }
  return PRESETS_PERIODO.PERSONALIZADO;
};

// O estado dos filtros lido da URL. `campos` são os do estado (sem `preset`);
// `personalizado` diz se a pessoa escolheu "Intervalo personalizado" — sem
// isso o seletor voltaria ao preset derivado das datas e os campos de data
// sumiriam antes de ela digitar.
//
// Fase 3.4 (achado no navegador): valia só SEM datas. Quem estava em "Mês
// atual" e escolhia "Intervalo personalizado" via a pílula voltar a "Mês
// atual" (as datas do mês continuam na URL, e o preset era derivado delas), e
// os campos de data nunca apareciam. A escolha explícita ganha; os outros
// presets e o "Limpar" a desfazem (`useListFilters`).
export const filtrosDaUrl = (params, campos, { personalizado = false, agora } = {}) => {
  const filtros = {};
  for (const campo of campos) filtros[campo] = valorLido(campo, params.get(nomeNaUrl(campo)));
  const derivado = presetDoIntervalo(filtros.de, filtros.ate, agora);
  filtros.preset = personalizado ? PRESETS_PERIODO.PERSONALIZADO : derivado;
  return filtros;
};

// Uma cópia da query com UM campo trocado. Valor vazio sai da URL.
export const paramsComFiltros = (params, mudancas) => {
  const proximo = new URLSearchParams(params);
  for (const [campo, valor] of Object.entries(mudancas)) {
    const nome = nomeNaUrl(campo);
    if (valor === '' || valor === null || valor === undefined) proximo.delete(nome);
    else proximo.set(nome, String(valor));
  }
  return proximo;
};

// Uma cópia sem os filtros (e sem os `extras`, como o `processoId` que o
// "Limpar filtros" também tira — DEC-070). Os demais parâmetros ficam.
export const paramsSemFiltros = (params, campos, extras = []) => {
  const proximo = new URLSearchParams(params);
  for (const campo of campos) proximo.delete(nomeNaUrl(campo));
  for (const nome of extras) proximo.delete(nome);
  return proximo;
};

// A assinatura dos filtros na URL. Quando ela muda — por um controle ou pelo
// "voltar" —, a lista volta à página 1 (regra 1 do `useListFilters`).
export const assinaturaDosFiltros = (params, campos, extras = []) =>
  [...campos.map(nomeNaUrl), ...extras].map((n) => `${n}=${params.get(n) ?? ''}`).join('&');

// Digitar mais uma letra numa busca que já existia SUBSTITUI a entrada do
// histórico; começar ou apagar a busca cria uma. Sem isso, "maria" digitado
// devagar viraria cinco "voltar" para sair da lista.
export const substituiNoHistorico = (anterior, novo) =>
  Boolean((anterior ?? '').trim()) && Boolean((novo ?? '').trim());

export default {
  NOMES_NA_URL,
  nomeNaUrl,
  presetDoIntervalo,
  filtrosDaUrl,
  paramsComFiltros,
  paramsSemFiltros,
  assinaturaDosFiltros,
  substituiNoHistorico,
};
