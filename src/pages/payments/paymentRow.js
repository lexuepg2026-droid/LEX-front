// ═══════════════════════════════════════════════════════════════════════════
// A LINHA DE PAGAMENTO NA LISTAGEM — Fase F-1a
//
// Duas perguntas que a listagem faz de cada pagamento e que a tela não deve
// responder dentro do JSX, pela razão de sempre neste projeto: a suíte é
// `node --test` sem DOM, e lógica dentro de componente só se testaria por
// varredura de texto — que prova que a linha existe, não que ela decide certo.
//
// Aqui há plural, ordenação e um caso de borda (alocação sem parcela
// populada) que merecem asserção de verdade.
// ═══════════════════════════════════════════════════════════════════════════

// "Parcelas 2 e 3", "Parcela 1", "Saldo adiantado", "—".
//
// Um pagamento pode encostar em DUAS parcelas (DEC-035) ou em nenhuma
// (adiantamento sem parcela emitida). A coluna precisa dizer os três casos: até
// a F-0 ela exibia "Parcela N" porque o pagamento pertencia a uma só, e manter
// aquele formato obrigaria a escolher uma das duas — escondendo a outra.
export const rotuloDasParcelas = (pagamento) => {
  const ativas = (pagamento?.alocacoes ?? []).filter((a) => a.ativa !== false);

  if (ativas.length === 0) {
    // Sem alocação ativa: ou o valor virou saldo adiantado, ou tudo foi
    // desalocado por estorno. Os dois casos são reais e diferentes, e o líquido
    // da própria linha é o que os distingue — dizer "saldo adiantado" sobre um
    // pagamento estornado seria afirmar que o dinheiro está no caixa.
    const liquido = Number(pagamento?.valorLiquido ?? pagamento?.valor ?? 0);
    return liquido > 0 ? 'Saldo adiantado' : '—';
  }

  const numeros = [
    ...new Set(
      ativas
        .map((a) => a.numeroParcela)
        .filter((n) => n !== undefined && n !== null)
    )
  ].sort((a, b) => a - b);

  // Alocação existe mas a parcela não veio populada: a listagem não inventa um
  // número. Dizer "Parcela undefined" é pior que dizer quantas são.
  if (numeros.length === 0) {
    return `${ativas.length} ${ativas.length === 1 ? 'parcela' : 'parcelas'}`;
  }

  if (numeros.length === 1) return `Parcela ${numeros[0]}`;

  const ultimo = numeros[numeros.length - 1];
  return `Parcelas ${numeros.slice(0, -1).join(', ')} e ${ultimo}`;
};

// Houve estorno ATIVO neste pagamento? É o que faz a célula do líquido ganhar
// destaque. Lê o número, e não a lista de estornos: um estorno anulado não
// conta, e o backend já resolveu essa regra ao compor `valorLiquido`.
export const temEstorno = (pagamento) => {
  const bruto = Number(pagamento?.valor ?? 0);
  const liquido = Number(pagamento?.valorLiquido ?? bruto);
  return liquido < bruto;
};

// Pagamento INTEGRALMENTE estornado (F-1b.2). Não é o mesmo que `temEstorno`:
// aquele diz que sobrou menos, este diz que não sobrou nada — e são leituras
// diferentes na tela (realce de aviso na célula contra badge no lugar do
// valor). O backend recusa emitir recibo neste caso, e é por isso que a linha
// perde o botão.
//
// A conta é a do backend, lida e não refeita: `valorLiquido` já é o bruto
// menos os estornos ATIVOS (estorno anulado não conta). Somar estornos aqui
// reabriria a segunda fonte de verdade que a DEC-040 fechou.
export const estornadoIntegralmente = (pagamento) => {
  const bruto = Number(pagamento?.valor ?? 0);
  const liquido = Number(pagamento?.valorLiquido ?? bruto);
  return bruto > 0 && liquido <= 0;
};

export default { rotuloDasParcelas, temEstorno, estornadoIntegralmente };
