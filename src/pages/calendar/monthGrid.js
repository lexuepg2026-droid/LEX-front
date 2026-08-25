// ═══════════════════════════════════════════════════════════════════════════
// A GRADE DO MÊS — FUNÇÃO PURA, CONSTRUÍDA À MÃO
//
// ── Zero dependência nova, e isso inclui biblioteca de calendário ───────
// Nem `date-fns`, nem `dayjs`, nem `react-calendar`. A regra da fase é
// explícita, e neste caso ela também é a escolha certa: a grade de um mês são
// sete colunas e no máximo seis linhas, e a conta cabe em vinte linhas de
// código que este arquivo testa com fevereiro, ano bissexto e mês que começa
// no domingo.
//
// ── Tudo em `Date.UTC`, e nada de hora local ───────────────────────────
// Nenhuma função deste arquivo chama `getDate`, `getMonth`, `getDay` ou
// `new Date(ano, mes, dia)` — só as variantes `getUTC*` e `Date.UTC`. É a
// mesma disciplina de `utils/dataDeCalendario.js` no backend, e pela mesma
// razão: uma grade que monta o dia com hora local monta o mês errado a oeste
// de Greenwich, e o erro aparece como "a audiência está no dia errado".
//
// As casas da grade são STRINGS `AAAA-MM-DD`. É o formato em que o backend
// devolve a data de todo item do calendário — evento e derivada —, e comparar
// duas strings iguais é a comparação que não tem fuso para errar.
// ═══════════════════════════════════════════════════════════════════════════

// Domingo primeiro: é a convenção do calendário brasileiro, e é a que a
// advogada lê no celular e na parede. O nome curto vai junto porque o
// cabeçalho da grade precisa dele e nenhuma tela deve montá-lo por conta
// própria.
export const DIAS_DA_SEMANA = Object.freeze([
  { indice: 0, curto: 'dom', longo: 'domingo' },
  { indice: 1, curto: 'seg', longo: 'segunda-feira' },
  { indice: 2, curto: 'ter', longo: 'terça-feira' },
  { indice: 3, curto: 'qua', longo: 'quarta-feira' },
  { indice: 4, curto: 'qui', longo: 'quinta-feira' },
  { indice: 5, curto: 'sex', longo: 'sexta-feira' },
  { indice: 6, curto: 'sáb', longo: 'sábado' },
]);

const UM_DIA = 24 * 60 * 60 * 1000;

// `Date` de meia-noite UTC → `"AAAA-MM-DD"`. Espelha
// `escreverDataDeCalendario` do backend, e pelo mesmo motivo não usa
// `toISOString().slice(0, 10)`: os dois dão o mesmo resultado hoje e deixariam
// de dar no dia em que um instante com hora diferente de zero entrasse aqui.
export const chaveDoDia = (data) => {
  const ano = String(data.getUTCFullYear()).padStart(4, '0');
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(data.getUTCDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

// `"2026-09-01"` → `Date` de meia-noite UTC. Devolve `null` para o que não for
// uma data de calendário — inclusive um instante ISO, que é o valor que o
// backend nunca manda e que, se aparecer aqui, significa que alguém abriu um
// segundo caminho para a data.
export const dataDaChave = (chave) => {
  if (typeof chave !== 'string') return null;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(chave.trim());
  if (!partes) return null;

  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  const dia = Number(partes[3]);
  const data = new Date(Date.UTC(ano, mes - 1, dia));

  const real =
    data.getUTCFullYear() === ano &&
    data.getUTCMonth() === mes - 1 &&
    data.getUTCDate() === dia;

  return real ? data : null;
};

// ── A GRADE ───────────────────────────────────────────────────────────────
//
// Devolve `{ ano, mes, chaveDoMes, semanas, primeiroDia, ultimoDia }`, onde
// `semanas` é um vetor de vetores de 7 casas:
//
//     { chave: "2026-08-30", dia: 30, noMes: false }
//
// **As casas de fora do mês ENTRAM na grade**, marcadas com `noMes: false`.
// Uma grade que as deixasse vazias teria buracos na primeira e na última
// linha, e o olho lê buraco como "não há nada nesse dia" — quando na verdade
// é "esse dia é de outro mês". Marcadas, a tela as esmaece e continua
// mostrando o que cai nelas.
//
// `mes` é 1-12, e não 0-11. É a numeração que a advogada usa e a que aparece na
// URL (`?mes=2026-09`); expor a do JavaScript aqui obrigaria toda chamada a
// lembrar de subtrair um, e é exatamente onde esse tipo de conta erra.
export const construirGradeDoMes = (ano, mes) => {
  const primeiroDoMes = new Date(Date.UTC(ano, mes - 1, 1));

  // O último dia: o dia 0 do mês SEGUINTE. É a forma que não precisa saber
  // quantos dias tem cada mês, nem se o ano é bissexto — e é por isso que
  // fevereiro de 2024 e de 2026 saem certos sem nenhuma linha sobre bissexto.
  const ultimoDoMes = new Date(Date.UTC(ano, mes, 0));

  // A grade começa no DOMINGO da semana em que o mês começa, e termina no
  // SÁBADO da semana em que ele acaba.
  const inicio = new Date(primeiroDoMes.getTime() - primeiroDoMes.getUTCDay() * UM_DIA);
  const fim = new Date(ultimoDoMes.getTime() + (6 - ultimoDoMes.getUTCDay()) * UM_DIA);

  const semanas = [];
  let cursor = inicio;

  while (cursor <= fim) {
    const semana = [];
    for (let i = 0; i < 7; i += 1) {
      semana.push({
        chave: chaveDoDia(cursor),
        dia: cursor.getUTCDate(),
        noMes: cursor.getUTCMonth() === mes - 1 && cursor.getUTCFullYear() === ano,
      });
      cursor = new Date(cursor.getTime() + UM_DIA);
    }
    semanas.push(semana);
  }

  return {
    ano,
    mes,
    chaveDoMes: `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}`,
    semanas,
    // As bordas da grade, e NÃO as do mês: é este o intervalo que o calendário
    // pede ao backend. Pedir só o mês deixaria os dias de fora vazios, e a
    // primeira linha da grade mostraria o fim do mês anterior em branco.
    primeiroDia: chaveDoDia(inicio),
    ultimoDia: chaveDoDia(fim),
  };
};

// ── Navegação entre meses ────────────────────────────────────────────────
//
// A virada de ANO sai de graça: `Date.UTC(2026, 12, 1)` é janeiro de 2027, e
// `Date.UTC(2026, -1, 1)` é dezembro de 2025. Escrever a conta à mão
// (`mes === 12 ? ...`) é onde a virada de ano costuma errar, e não há razão
// para escrevê-la.
export const mesVizinho = (ano, mes, passo) => {
  const referencia = new Date(Date.UTC(ano, mes - 1 + passo, 1));
  return { ano: referencia.getUTCFullYear(), mes: referencia.getUTCMonth() + 1 };
};

// `"2026-09"` → `{ ano: 2026, mes: 9 }`. Devolve `null` para o que não servir —
// quem chama decide se cai no mês de hoje ou se recusa.
export const lerChaveDoMes = (chave) => {
  if (typeof chave !== 'string') return null;
  const partes = /^(\d{4})-(\d{2})$/.exec(chave.trim());
  if (!partes) return null;
  const ano = Number(partes[1]);
  const mes = Number(partes[2]);
  if (mes < 1 || mes > 12) return null;
  return { ano, mes };
};

// O mês a que uma data de calendário pertence. Usado para abrir o calendário
// no mês do "hoje" que o BACKEND informou — e não no do relógio do navegador,
// que pode estar atrasado.
export const mesDaChave = (chave) => {
  const data = dataDaChave(chave);
  if (!data) return null;
  return { ano: data.getUTCFullYear(), mes: data.getUTCMonth() + 1 };
};

// ═══════════════════════════════════════════════════════════════════════════
// A VISTA PADRÃO — e por que em 360 px ela é a AGENDA
// ═══════════════════════════════════════════════════════════════════════════
//
// Sete colunas em 360 px dão **51 px por dia**. Descontando borda e respiro,
// sobram uns 45 px de largura útil: um dia com dois compromissos vira dois
// retângulos ilegíveis, e "Audiência de instrução" não cabe nem truncado de
// forma útil.
//
// A grade continua ALCANÇÁVEL na tela estreita — a advogada escolhe, e a
// escolha dela é respeitada na navegação entre meses. O que muda é o que
// ABRE: numa tela onde a grade não se lê, abrir na grade obriga a pessoa a
// trocar de vista antes de conseguir usar a tela.
//
// O corte é 768 px, que é o mesmo ponto em que `AppLayout` troca a Sidebar
// pela BottomNav — é onde este projeto já decidiu que a tela virou celular, e
// inventar um segundo limiar faria as duas coisas trocarem em larguras
// diferentes.
export const LARGURA_DE_TELA_ESTREITA = 768;

export const VISTAS = Object.freeze(['mes', 'agenda']);

export const vistaPadrao = (largura) =>
  typeof largura === 'number' && largura < LARGURA_DE_TELA_ESTREITA ? 'agenda' : 'mes';

// ── O "+N" do dia cheio ─────────────────────────────────────────────────
//
// A célula NÃO estica. Um dia com sete itens numa grade de seis linhas
// empurraria as outras semanas para fora da tela, e a advogada perderia a
// visão do mês justamente por causa do dia mais ocupado dele.
//
// Mostra os primeiros e um "+N", que abre o dia. O N é quantos FICARAM DE
// FORA, e não o total — "+5" quando há 8 e 3 aparecem; um "+8" mandaria
// procurar oito itens dos quais três já estão à vista.
export const MAXIMO_POR_CELULA = 3;

export const recortarCelula = (itens, maximo = MAXIMO_POR_CELULA) => {
  const lista = Array.isArray(itens) ? itens : [];
  if (lista.length <= maximo) return { visiveis: lista, ocultos: 0 };
  return { visiveis: lista.slice(0, maximo), ocultos: lista.length - maximo };
};

// ── Agrupar os itens do calendário por dia ──────────────────────────────
//
// A chave é a `data` que o backend mandou, sem nenhuma conversão. É o ponto em
// que um `new Date(item.data).getDate()` colocaria o item no dia errado — e é
// por isso que ele não existe aqui.
export const agruparPorDia = (itens) => {
  const mapa = new Map();
  for (const item of Array.isArray(itens) ? itens : []) {
    if (!item?.data) continue;
    if (!mapa.has(item.data)) mapa.set(item.data, []);
    mapa.get(item.data).push(item);
  }
  return mapa;
};

// Os dias que TÊM alguma coisa, em ordem. É o que a vista de agenda percorre:
// ela lista por dia, e um dia vazio não vira linha — uma agenda que imprime os
// trinta dias do mês para mostrar três compromissos esconde os três.
export const diasComItens = (itens) =>
  [...agruparPorDia(itens).entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([chave, lista]) => ({ chave, itens: lista }));

export default {
  DIAS_DA_SEMANA,
  VISTAS,
  LARGURA_DE_TELA_ESTREITA,
  MAXIMO_POR_CELULA,
  chaveDoDia,
  dataDaChave,
  construirGradeDoMes,
  mesVizinho,
  lerChaveDoMes,
  mesDaChave,
  vistaPadrao,
  recortarCelula,
  agruparPorDia,
  diasComItens,
};
