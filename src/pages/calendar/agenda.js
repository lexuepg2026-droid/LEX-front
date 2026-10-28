// ═══════════════════════════════════════════════════════════════════════════
// A AGENDA NA PELE NOVA — as regras da tela, em função pura (Fase 3.8, DEC-136)
//
// A suíte é `node --test` sem DOM: o que decide (os seletores de mês e ano, o
// rótulo acessível de cada pílula da grade, o riscado, a linha da vista
// Agenda) mora aqui e é executado nos testes. `CalendarPage.jsx` só desenha.
// ═══════════════════════════════════════════════════════════════════════════

import { formatCurrency } from '../../utils/formatters.js';
import { destinoDoItem } from '../../utils/calendarLabels.js';
import { tipoDaDataDoItem } from '../../utils/tomDaData.js';
import { contextoDoProcesso, TIPOS_DE_DATA } from '../dashboard/inicio.js';
import { comVoltar } from '../../components/layout/contexto.js';

// ── Os seletores de mês e de ano ──────────────────────────────────────────
//
// `<select>` nativos: o teclado, o leitor de tela e o seletor do celular vêm
// de graça. Os nomes são escritos aqui, e não pedidos ao `Intl`, porque o
// `<option>` precisa do nome com inicial maiúscula e o `Intl` pt-BR devolve
// minúscula — e capitalizar string à mão é o que a DEC-056 proíbe nas telas.
export const NOMES_DOS_MESES = Object.freeze([
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]);

// Os anos oferecidos: cinco para cada lado do ano à vista. O ano à vista
// está sempre na lista — um `<select>` cujo valor não é uma das opções
// mostra a primeira, e a advogada leria o ano errado.
export const RAIO_DE_ANOS = 5;

export const anosDoSeletor = (ano, raio = RAIO_DE_ANOS) =>
  Array.from({ length: raio * 2 + 1 }, (_, i) => ano - raio + i);

// ── Concluído e pago: riscados ───────────────────────────────────────────
//
// O compromisso concluído e a parcela paga continuam visíveis (esconder faria
// o dia parecer vazio às cinco da tarde), riscados — a FORMA diz que estão
// resolvidos — e com a situação escrita no rótulo acessível e na linha.
export const situacaoDoItem = (item) => {
  if (item?.natureza === 'evento' && item.concluido) return 'Concluído';
  if (item?.natureza === 'derivada' && item.status === 'pago') return 'Pago';
  return null;
};

export const itemRiscado = (item) => situacaoDoItem(item) !== null;

// ── O rótulo acessível da pílula da grade ────────────────────────────────
//
// A pílula mostra uma linha com reticências; o rótulo diz tudo: a natureza
// (no tom da DEC-134 — "Vencida" também é escrito), a hora, o título, o
// honorário ou o tipo de compromisso, e a situação. É o mesmo texto no
// `aria-label` e no `title` (que mostra o inteiro ao passar o mouse).
export const rotuloDoItemNaGrade = (item) => {
  const natureza = TIPOS_DE_DATA[tipoDaDataDoItem(item)].rotulo;
  const partes = [item.hora ? `${item.hora}, ${item.titulo}` : item.titulo];
  if (item.subtitulo) partes.push(item.subtitulo);
  const situacao = situacaoDoItem(item);
  if (situacao) partes.push(situacao.toLowerCase());
  return `${natureza}: ${partes.filter(Boolean).join(', ')}`;
};

// ── O caminho de volta à Agenda (Fase 3.9a, DEC-143) ─────────────────────
//
// O "Voltar", o Salvar e o Cancelar do formulário de compromisso levavam à
// Agenda sem o mês e a vista de onde a pessoa veio: quem abriu um compromisso
// de março na vista Agenda voltava para o mês de hoje, na grade. O caminho
// viaja pelo `?voltar=` da DEC-087 (validado na ida e na volta, só
// `/dashboard/`). O mês e a vista vão SEMPRE escritos — os que a tela está
// mostrando —, inclusive quando vieram do padrão (o mês de hoje, a vista da
// largura): a volta mostra o que ela via.
export const voltarDaAgenda = ({ ano, mes, vista }) => {
  const params = new URLSearchParams();
  if (Number.isInteger(ano) && Number.isInteger(mes)) params.set('mes', `${ano}-${String(mes).padStart(2, '0')}`);
  if (vista) params.set('vista', vista);
  const query = params.toString();
  return query ? `/dashboard/agenda?${query}` : '/dashboard/agenda';
};

// Só o que abre o FORMULÁRIO de compromisso leva o caminho de volta. A
// derivada leva ao financeiro (DEC-055), que tem a volta dele.
export const comVoltarDaAgenda = (destino, voltar) =>
  typeof destino === 'string' && destino.startsWith('/dashboard/agenda/')
    ? comVoltar(destino, voltar)
    : destino;

// ── A linha da vista Agenda ──────────────────────────────────────────────
//
// A vista Agenda usa a `LinhaDeData` (DEC-131), a mesma linha do Início e da
// Visão geral, com o tom da mesma fonte (DEC-134). Este é o item que ela lê,
// montado a partir de um item de `GET /calendar`:
//
// - compromisso: o título; "tipo · hora" embaixo; "processo · cliente";
// - vencimento de parcela: "{honorário} — Parcela N de M" (a redação da
//   vencida da Visão geral) e o valor; vencimento de honorário: a descrição;
// - destino: `destinoDoItem`, o mesmo da grade e do sino (DEC-055).
export const linhaDaAgenda = (item, voltar = null) => {
  const derivada = item.natureza === 'derivada';
  const titulo = derivada && item.origem === 'parcela'
    ? `${item.subtitulo || 'Honorário'} — ${item.titulo}`
    : item.titulo;
  const subtitulo = derivada
    ? (item.valor != null ? formatCurrency(item.valor) : null)
    : [item.subtitulo, item.hora].filter(Boolean).join(' · ') || null;
  return {
    chave: `${item.natureza}-${item._id}`,
    data: item.data,
    hora: item.hora ?? null,
    tipo: tipoDaDataDoItem(item),
    titulo,
    subtitulo,
    contexto: contextoDoProcesso(item.processo, null, item.processo?.clientePrincipalNome),
    destino: comVoltarDaAgenda(destinoDoItem(item), voltar),
    situacao: situacaoDoItem(item),
    derivada,
  };
};

export default {
  NOMES_DOS_MESES,
  RAIO_DE_ANOS,
  anosDoSeletor,
  situacaoDoItem,
  itemRiscado,
  rotuloDoItemNaGrade,
  linhaDaAgenda,
  voltarDaAgenda,
  comVoltarDaAgenda,
};
