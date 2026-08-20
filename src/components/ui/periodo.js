// ═══════════════════════════════════════════════════════════════════════════
// OS PRESETS DE PERÍODO — Fase F-1b.3
//
// Função pura, fora do componente, pelo motivo de sempre: a suíte é
// `node --test` sem DOM, e uma conta de data dentro do JSX só se testaria por
// varredura de texto. E aqui há conta de data, que é onde erro de borda mora.
//
// ── O formato é `AAAA-MM-DD`, e isso não é detalhe ───────────────────────
// É o que `<input type="date">` produz e consome, é o que o backend aceita, e
// é o formato em que a data é gravada. Uma conversão a mais no meio do
// caminho é uma oportunidade a mais de a data andar um dia.
//
// ── UTC, coerente com o backend ──────────────────────────────────────────
// O filtro do backend recorta em UTC (ver `utils/filtrosDeConsulta.js`), o
// Mongoose grava a data sem hora em meia-noite UTC, e `formatDate` renderiza
// com `timeZone: "UTC"`. Montar o preset em fuso local faria "mês atual"
// começar em 31 do mês anterior num servidor a oeste de Greenwich — e a
// primeira linha da lista seria de um mês que a pessoa não pediu.
// ═══════════════════════════════════════════════════════════════════════════

const iso = (data) => data.toISOString().slice(0, 10);

// Último dia do mês: dia 0 do mês SEGUINTE. Escrito assim, e não com uma
// tabela de 28/30/31, porque a tabela erra em fevereiro bissexto — e erra em
// silêncio, devolvendo uma lista curta com cara de completa.
const fimDoMes = (ano, mes) => new Date(Date.UTC(ano, mes + 1, 0));

export const PRESETS_PERIODO = Object.freeze({
  TODOS: 'todos',
  MES_ATUAL: 'mesAtual',
  ULTIMOS_6_MESES: 'ultimos6',
  PERSONALIZADO: 'personalizado'
});

export const ROTULO_PRESET = Object.freeze({
  [PRESETS_PERIODO.TODOS]: 'Qualquer período',
  [PRESETS_PERIODO.MES_ATUAL]: 'Mês atual',
  [PRESETS_PERIODO.ULTIMOS_6_MESES]: 'Últimos 6 meses',
  [PRESETS_PERIODO.PERSONALIZADO]: 'Intervalo personalizado'
});

// `{ de, ate }` em `AAAA-MM-DD`, ou `{}` quando o preset não recorta nada.
// `agora` é injetável para o teste não depender do dia em que roda — um teste
// de data que só passa em agosto é um teste que quebra em setembro.
export const intervaloDoPreset = (preset, agora = new Date()) => {
  const ano = agora.getUTCFullYear();
  const mes = agora.getUTCMonth();

  switch (preset) {
    case PRESETS_PERIODO.MES_ATUAL:
      return {
        de: iso(new Date(Date.UTC(ano, mes, 1))),
        ate: iso(fimDoMes(ano, mes))
      };

    // Seis meses CONTANDO o corrente: de 01/03 a 31/08 quando se está em
    // agosto. "Últimos 6 meses" que exclui o mês em que a pessoa está seria a
    // leitura menos útil das duas — quase todo lançamento que ela procura é
    // recente.
    case PRESETS_PERIODO.ULTIMOS_6_MESES:
      return {
        de: iso(new Date(Date.UTC(ano, mes - 5, 1))),
        ate: iso(fimDoMes(ano, mes))
      };

    default:
      return {};
  }
};

// A frase que descreve o recorte ativo, para o estado vazio e para a barra de
// filtros aplicados. `null` quando não há recorte — e aí quem chama
// simplesmente não escreve nada sobre período.
export const descricaoDoPeriodo = (preset, { de, ate } = {}) => {
  if (preset === PRESETS_PERIODO.MES_ATUAL) return 'neste mês';
  if (preset === PRESETS_PERIODO.ULTIMOS_6_MESES) return 'nos últimos 6 meses';
  if (preset === PRESETS_PERIODO.PERSONALIZADO) {
    if (de && ate) return `entre ${inverter(de)} e ${inverter(ate)}`;
    if (de) return `a partir de ${inverter(de)}`;
    if (ate) return `até ${inverter(ate)}`;
  }
  return null;
};

// `2026-06-10` → `10/06/2026`. Não usa `formatDate` porque aquele recebe o que
// o backend manda (Date ou ISO completo) e este recebe o que o `<input
// type="date">` produz — passar a string curta por um `new Date()` a
// interpretaria em UTC e a exibiria um dia antes em fuso negativo.
const inverter = (aaaaMmDd) => {
  const partes = String(aaaaMmDd).split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : aaaaMmDd;
};

export default { PRESETS_PERIODO, ROTULO_PRESET, intervaloDoPreset, descricaoDoPeriodo };
