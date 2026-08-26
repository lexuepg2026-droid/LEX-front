// ═══════════════════════════════════════════════════════════════════════════
// O FILTRO DE SUGESTÃO — função pura, e a regra inteira da F-4 mora aqui
//
// ── A regra de desenho (DEC-057) ──────────────────────────────────────────
// **O campo SUGERE, não OBRIGA.** Este módulo não sabe validar, não sabe
// recusar e não tem como recusar: ele recebe uma lista e um termo, e devolve
// os que casam. Quem digita "Ponta Grosa" com um "s" só recebe zero sugestões
// e **salva assim mesmo** — porque o valor do campo nunca sai daqui, sai do
// que a advogada digitou.
//
// Autocomplete que recusa valor fora da tabela trava trabalho real no dia em
// que a tabela está desatualizada. E ela vai estar: a lista de comarcas do
// TJPR muda, a CBO muda, o CNJ muda. A tabela é de 22/08/2026 e envelhece
// sozinha a partir daí.
//
// ── Por que a função é pura, e mora fora do componente ────────────────────
// A suíte não tem DOM (decisão da Fase 2E.2). Se a regra morasse dentro do
// `CampoComSugestoes`, o teste que prova "valor fora da tabela é aceito" teria
// que renderizar — e não renderiza. A regra mora aqui, e o componente só a
// costura a um `<input>`, do mesmo jeito que `masks.js` mora fora do
// `MoneyInput`.
// ═══════════════════════════════════════════════════════════════════════════

// Quantas sugestões descem para o DOM. A CBO tem 2.725 ocupações e o CNJ tem
// 5.598 assuntos: uma lista sem teto seria um `<li>` por ocupação a cada tecla
// digitada. Oito é o que cabe abaixo de um campo sem cobrir o resto do
// formulário, e quem não achou nas oito primeiras digita mais uma letra.
export const LIMITE_PADRAO = 8;

// Mesmo comportamento da busca de seções no backend (`utils/texto.js`) e da
// busca local do `VariableSelector`: "sao jose" acha "São José dos Pinhais".
// A advogada não digita acento quando está com pressa, e a lista do TJPR é
// toda acentuada — sem isto, o campo não acha nada justamente no caso que a
// fase existe para resolver.
export const semAcento = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

// Filtra por SUBSTRING, não por prefixo. "jose" precisa achar "São José dos
// Pinhais", e "grossa" precisa achar "Ponta Grossa" — quem lembra do meio do
// nome e não do começo é o caso comum, não a exceção.
export const filtrarSugestoes = (
  itens,
  termo,
  { limite = LIMITE_PADRAO, rotulo = (item) => item } = {}
) => {
  const alvo = semAcento(termo);

  // Termo vazio devolve vazio, e não a lista inteira. Abrir 2.725 ocupações
  // porque o campo ganhou foco é o comportamento que o limite existe para
  // impedir — não faz sentido reintroduzi-lo pela porta do termo vazio.
  if (alvo === '') return [];
  if (!Array.isArray(itens)) return [];

  const teto = Number.isFinite(limite) && limite > 0 ? limite : LIMITE_PADRAO;
  const achados = [];

  for (const item of itens) {
    if (achados.length >= teto) break;
    if (semAcento(rotulo(item)).includes(alvo)) achados.push(item);
  }

  return achados;
};

// Um valor digitado casa EXATAMENTE com um item da tabela? Serve só para a
// tela poder dizer "isto está na tabela" — **nunca** para recusar o que não
// casa. Existe para o dia em que alguém quiser um selo discreto de "confere",
// e fica aqui já com o aviso escrito para que esse alguém não a use como
// guarda.
export const casaExatamente = (itens, valor, { rotulo = (item) => item } = {}) => {
  const alvo = semAcento(valor);
  if (alvo === '' || !Array.isArray(itens)) return false;
  return itens.some((item) => semAcento(rotulo(item)) === alvo);
};
