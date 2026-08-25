// ═══════════════════════════════════════════════════════════════════════════
// OS RÓTULOS E OS DESTINOS DO CALENDÁRIO — ponto único
//
// ── Nenhuma tela monta rótulo de tipo por conta própria ────────────────
// Foi o que a tela de processos fazia com o `status`: capitalizava a string
// crua do enum, e foi assim que "parcialmente_pago" chegou a aparecer com
// sublinhado na interface. O rótulo do tipo de evento vem PRONTO do backend
// (`tipoRotulo`), e o que este arquivo faz é o fallback e o resto.
//
// ── Onde a DEC-055 aparece na tela ─────────────────────────────────────
// `destinoDoItem` é a metade visível da decisão: a derivada não abre
// formulário, ela LEVA à parcela. "Mudar vencimento se faz onde o vencimento
// mora" — e é aqui que esse "onde" está escrito, uma vez só.
// ═══════════════════════════════════════════════════════════════════════════

// ── Tipo de evento ───────────────────────────────────────────────────────
//
// Espelho de `config/tiposEvento.js` do backend, sem endpoint e pela mesma
// razão do tipo de honorário: é constante, não dado. Uma rota `/tipos-evento`
// custaria uma viagem de rede em toda carga de formulário para entregar quatro
// strings que não mudam entre deploys.
//
// ⚠️ **PENDENTE DE RATIFICAÇÃO DA LAÍS.** Os quatro valores saíram do enunciado
// da fase, não dela. Perícia, diligência e despacho são candidatos óbvios de
// quem lê a lista, e nenhum entrou — adivinhar o vocabulário dela e depois
// migrar dado gravado sob um valor que ela nunca usou é o que não se faz.
//
// Há teste nos dois repos travando que as listas não divergiram.
export const TIPO_EVENTO_OPTIONS = [
  { value: 'audiencia', label: 'Audiência' },
  { value: 'prazo', label: 'Prazo' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'outro', label: 'Outro' },
];

// O rótulo do tipo. O backend já manda `tipoRotulo` pronto em todo item de
// evento; este caminho existe para o FORMULÁRIO, que precisa do rótulo antes
// de o evento existir.
export const rotuloDoTipoDeEvento = (tipo) => {
  const achado = TIPO_EVENTO_OPTIONS.find((o) => o.value === tipo);
  return achado ? achado.label : '—';
};

// ── As duas naturezas, e como a tela as nomeia ─────────────────────────
//
// A legenda diz qual é qual, por escrito. A distinção visual sozinha não basta:
// cor sem legenda obriga a advogada a descobrir sozinha por que uma linha abre
// um formulário e a outra a leva embora — e a resposta ("uma é fato, a outra é
// derivada") não é adivinhável olhando.
export const NATUREZAS = Object.freeze({
  evento: {
    valor: 'evento',
    rotulo: 'Compromisso',
    legenda: 'Audiência, prazo ou reunião que você registrou. Pode editar aqui.',
    classe: 'cal-item--evento',
  },
  derivada: {
    valor: 'derivada',
    rotulo: 'Vencimento',
    legenda: 'Vem do financeiro. Para mudar a data, abra a parcela.',
    classe: 'cal-item--derivada',
  },
});

export const LEGENDA = [NATUREZAS.evento, NATUREZAS.derivada];

export const classeDaNatureza = (natureza) =>
  NATUREZAS[natureza]?.classe ?? NATUREZAS.evento.classe;

export const rotuloDaNatureza = (natureza) =>
  NATUREZAS[natureza]?.rotulo ?? '—';

// ── O DESTINO DO CLIQUE — a DEC-055 na tela ───────────────────────────
//
// Evento próprio → o formulário dele, para editar.
// Derivada       → a ORIGEM, onde o vencimento de fato mora.
//
// O backend manda `origem` e o id de lá; quem sabe em que caminho a parcela
// vive é o frontend. Uma rota de tela escrita no serviço quebraria calada no
// dia em que a tela mudasse de endereço.
//
// Devolve `null` quando não há para onde ir — e a tela então não faz a linha
// parecer clicável. Um clique que não leva a lugar nenhum é pior que nenhum
// clique: ele ensina que aquela linha não responde, e a advogada para de tentar
// nas que respondem.
export const destinoDoItem = (item) => {
  if (!item) return null;

  if (item.natureza === 'evento') {
    return `/dashboard/agenda/editar/${item._id}`;
  }

  if (item.natureza === 'derivada') {
    // "Clicar nela leva à parcela." Mudar vencimento se faz onde o vencimento
    // mora — e para a parcela isso é o formulário dela, que é a única tela do
    // sistema onde `dataVencimento` é editável.
    if (item.origem === 'parcela') return `/dashboard/parcelas/editar/${item._id}`;
    if (item.origem === 'honorario') return `/dashboard/honorarios/editar/${item._id}`;
  }

  return null;
};

// A frase que a tela mostra quando a advogada tenta editar uma derivada no
// calendário. Explica a regra em vez de só recusar: uma linha que não responde,
// sem dizer por quê, é lida como tela quebrada.
export const MOTIVO_DA_DERIVADA_NAO_EDITAVEL =
  'Este vencimento vem do financeiro e não se edita na agenda. ' +
  'Abra a parcela para mudar a data.';

export default {
  TIPO_EVENTO_OPTIONS,
  NATUREZAS,
  LEGENDA,
  rotuloDoTipoDeEvento,
  classeDaNatureza,
  rotuloDaNatureza,
  destinoDoItem,
  MOTIVO_DA_DERIVADA_NAO_EDITAVEL,
};
