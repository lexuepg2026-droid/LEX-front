// ═══════════════════════════════════════════════════════════════════════════
// O PAINEL E O SINO RESPONDEM À MESMA PERGUNTA — e não podem discordar (F-4)
//
// ── O defeito que o passo 135 já pegou uma vez ────────────────────────────
// Dois números diferentes para a mesma coisa na mesma tela. Naquela vez foram
// "Honorários a Receber" e "Honorários contratados"; a lição registrada foi
// que rota diferente para o mesmo assunto é divergência esperando acontecer.
//
// O sino da F-3 e o painel estão exatamente nessa posição: os dois dizem
// quantas parcelas estão vencidas, **na mesma tela, ao mesmo tempo** — o sino
// no cabeçalho, o painel no corpo. Antes desta fase o painel chegava lá por
// três caminhos distintos:
//
//   1. `resumoFinanceiro.vencidas`, de `GET /api/financeiro/resumo`;
//   2. um filtro no cliente sobre TODAS as parcelas de `GET /api/installments`;
//   3. o sino, de `GET /api/calendar/avisos`.
//
// Os três liam o mesmo campo derivado (`Installment.status === "vencido"`,
// DEC-028) e por isso concordavam — mas concordavam por coincidência de três
// consultas escritas à mão, e não por construção. Bastava uma delas ganhar um
// recorte de data que a outra não tivesse.
//
// ── A decisão ─────────────────────────────────────────────────────────────
// **Uma fonte só para a contagem de vencidas: `GET /api/calendar/avisos`** — a
// mesma requisição que o sino já faz. O painel não conta por conta própria e
// não filtra parcela por status em lugar nenhum; ele lê daqui.
//
// O backend não foi tocado nesta fase, então as consultas continuam sendo duas
// no servidor. O que mudou é que a TELA passou a ter um caminho só, e é a tela
// que exibe os dois números lado a lado.
//
// O valor em dinheiro (`valorVencido`) continua vindo do resumo financeiro:
// o sino não expõe valor, e somar centavos no cliente a partir da lista do
// sino seria inventar um terceiro caminho justamente onde se acabou de fechar
// o segundo.
// ═══════════════════════════════════════════════════════════════════════════

// A contagem de parcelas vencidas, do payload do sino. Sino e painel chamam
// esta função — nenhum dos dois lê `parcelasVencidas.length` na mão, para a
// próxima mudança acontecer num lugar só.
export const contarParcelasVencidas = (avisos) =>
  Array.isArray(avisos?.parcelasVencidas) ? avisos.parcelasVencidas.length : 0;

export const parcelasVencidasDoAviso = (avisos) =>
  Array.isArray(avisos?.parcelasVencidas) ? avisos.parcelasVencidas : [];

// ── Blocos colapsáveis, e a escolha lembrada ──────────────────────────────
// A escolha é de quem usa a tela, e é por navegador — não é dado do
// escritório e não tem por que ir para o servidor. `localStorage` pode lançar
// (navegação privada, cookies bloqueados), e um painel que não abre porque a
// preferência não pôde ser lida seria um defeito bem pior do que abrir no
// padrão.
const CHAVE = 'lex-painel-blocos';

export const lerBlocosFechados = () => {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (!cru) return {};
    const lido = JSON.parse(cru);
    return lido && typeof lido === 'object' && !Array.isArray(lido) ? lido : {};
  } catch {
    return {};
  }
};

export const gravarBlocosFechados = (mapa) => {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(mapa ?? {}));
  } catch {
    // Sem persistência a tela continua funcionando; só não lembra.
  }
};
