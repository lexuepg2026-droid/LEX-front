import { formatCurrency, formatDate } from '../../utils/formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// O PREVIEW DE ALOCAÇÃO, EM PALAVRAS — Fase F-1b
//
// ── O plano vem do BACKEND, sempre ────────────────────────────────────────
// Estas funções FORMATAM `POST /payments/preview`. Nenhuma delas decide para
// qual parcela o dinheiro vai, quanto sobra ou o que quita: isso é
// `planejarAlocacao`, no backend, a MESMA função que a criação executa.
//
// Recalcular aqui criaria uma segunda fonte de verdade sobre dinheiro, e ela
// divergiria da primeira no dia em que a regra de alocação mudasse — com a
// tela prometendo uma coisa e o POST fazendo outra. É a razão de a rota de
// preview existir em vez de a tela simular a distribuição.
//
// ── E o resultado REALIZADO usa as mesmas funções ─────────────────────────
// Depois de gravar, o 201 devolve `{ alocacoes, sobra, saldoAdiantado }` — a
// mesma forma, com os mesmos números, agora consumados. `linhasDoPlano` aceita
// as duas: é isso que permite pôr previsto e realizado lado a lado sem
// escrever dois formatadores que poderiam discordar.
// ═══════════════════════════════════════════════════════════════════════════

// Vale a pena pedir preview? Só com honorário escolhido e valor positivo.
//
// Enquanto o valor está incompleto o bloco inteiro não aparece — nem
// "R$ 0,00", no espírito do `"—"` da 4.3. Um preview de zero reais afirmaria
// que nada vai acontecer, o que é diferente de "ainda não sei".
export const podeConsultarPreview = (honorarioId, valor) => {
  if (!honorarioId) return false;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero > 0;
};

// Uma linha por parcela tocada. `destinos` (preview) e `alocacoes` (201) têm
// os mesmos campos de dinheiro; `quita` e `emAbertoAntes` só existem no
// preview, e a frase se adapta sem inventar o que não veio.
export const linhasDoPlano = (plano) => {
  const itens = plano?.destinos ?? plano?.alocacoes ?? [];
  return itens.map((d) => {
    const numero = d.numeroParcela;
    const alvo = numero !== null && numero !== undefined ? `Parcela ${numero}` : 'Parcela';
    return {
      chave: String(d.parcelaId ?? d._id ?? alvo),
      alvo,
      valor: d.valor,
      vencimento: d.dataVencimento ?? null,
      // `quita === undefined` no realizado: ali a informação de "quitou" já
      // está no status da parcela, e afirmar sem o dado seria chute.
      efeito:
        d.quita === true ? 'quita' : d.quita === false ? 'abate' : null,
    };
  });
};

// A frase de uma linha, pronta para a tela.
export const frasePlanoDaLinha = (linha) => {
  const partes = [`${linha.alvo}: ${formatCurrency(linha.valor)}`];
  if (linha.efeito === 'quita') partes.push('— quita a parcela');
  if (linha.efeito === 'abate') partes.push('— abate parcialmente');
  if (linha.vencimento) partes.push(`(vence ${formatDate(linha.vencimento)})`);
  return partes.join(' ');
};

// O destino do que sobrou. `null` quando não sobrou nada — e aí a tela não
// imprime a linha.
//
// O caso do ADIANTAMENTO SEM PARCELAS tem frase própria: o valor inteiro fica
// como crédito e será aplicado quando as parcelas nascerem. Sem dizê-lo, a
// advogada veria "nenhuma parcela afetada" e concluiria que o lançamento não
// serviu para nada.
export const fraseDaSobra = (plano) => {
  const sobra = Number(plano?.sobra ?? 0);
  if (!(sobra > 0)) return null;

  const semDestino = (plano?.destinos ?? plano?.alocacoes ?? []).length === 0;

  return semDestino
    ? `${formatCurrency(sobra)} ficam como saldo adiantado deste honorário: ` +
      'não há parcela em aberto para receber o valor agora, e ele será aplicado ' +
      'automaticamente quando as parcelas forem criadas.'
    : `${formatCurrency(sobra)} sobram e ficam como saldo adiantado, ` +
      'para as próximas parcelas.';
};

// O resumo de uma linha só, para o cabeçalho do bloco.
export const resumoDoPlano = (plano) => {
  const linhas = linhasDoPlano(plano);
  const sobra = Number(plano?.sobra ?? 0);

  if (linhas.length === 0) {
    return sobra > 0
      ? 'O valor inteiro fica como saldo adiantado.'
      : 'Nenhuma parcela em aberto seria afetada.';
  }

  const total = linhas.reduce((acc, l) => acc + Number(l.valor || 0), 0);
  const plural = linhas.length === 1 ? 'parcela' : 'parcelas';
  return `${formatCurrency(total)} em ${linhas.length} ${plural}.`;
};

export default {
  podeConsultarPreview,
  linhasDoPlano,
  frasePlanoDaLinha,
  fraseDaSobra,
  resumoDoPlano,
};
