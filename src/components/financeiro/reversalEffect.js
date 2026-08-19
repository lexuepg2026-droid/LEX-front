import { formatCurrency } from '../../utils/formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// O EFEITO DE UM ESTORNO, EM PALAVRAS — Fase F-1b
//
// O modal precisa dizer, antes de confirmar, o que vai acontecer: quais
// parcelas voltam a ficar em aberto.
//
// ── O que esta função NÃO faz, e por quê ──────────────────────────────────
// Ela não calcula a divisão do estorno entre as parcelas. A desalocação é
// ESPELHADA (da alocação mais recente para a mais antiga, o inverso de como o
// dinheiro entrou — invariante nº 4 da F-1a), e reproduzir esse rateio aqui
// criaria uma segunda fonte de verdade sobre dinheiro. É o mesmo erro que o
// preview de alocação existe para evitar, e o motivo de o preview vir do
// backend em vez de ser recalculado na tela.
//
// O que ela faz é DESCREVER: quais parcelas o pagamento sustenta hoje, e em
// que ordem elas serão soltas. A ordem é contrato do backend, não conta.
//
// Quando o estorno é INTEGRAL a afirmação é exata e a função a faz sem
// ressalva: todas as alocações ativas caem. É o caso do default do modal.
// ═══════════════════════════════════════════════════════════════════════════

// As parcelas que este pagamento sustenta AGORA. Só alocação ativa: a que já
// foi desfeita por um estorno anterior não volta a ficar em aberto de novo.
export const parcelasSustentadas = (pagamento) =>
  (pagamento?.alocacoes ?? [])
    .filter((a) => a.ativa !== false)
    // Ordem espelhada: a mais recente é a primeira a ser solta.
    .slice()
    .reverse();

// ═══════════════════════════════════════════════════════════════════════════
// O AVISO PREVENTIVO — Fase F-1b.2
//
// Com um valor ACIMA do líquido digitado, o quadro continuava dizendo "Estorno
// integral: a parcela 2 volta a ficar em aberto…" até o servidor recusar com
// 422. Ou seja: descrevia com segurança um efeito que não ia acontecer.
//
// ── O que o aviso NÃO faz ─────────────────────────────────────────────────
// Não impede o envio, não desabilita o botão e não valida nada. O servidor
// continua sendo a AUTORIDADE sobre quanto ainda é estornável — é o padrão
// fixado no passo 102, e por uma razão concreta: entre abrir o modal e
// confirmar, outro estorno pode ter entrado, e uma tela que barrasse pelo
// número que leu há um minuto recusaria operações legítimas sozinha, sem
// recurso.
//
// O que ele faz é parar de AFIRMAR. A frase troca a descrição de um efeito
// impossível por uma constatação verdadeira — o valor passa do estornável —,
// e a recusa, se vier, continua sendo a do backend, com o limite que só ele
// conhece (`errors.estornavel`, formatado por `getFinancialErrorMessage`).
// ═══════════════════════════════════════════════════════════════════════════
export const acimaDoEstornavel = (pagamento, valorEstorno) => {
  const liquido = Number(pagamento?.valorLiquido ?? pagamento?.valor ?? 0);
  const valor = Number(valorEstorno);
  if (!Number.isFinite(valor) || valor <= 0) return false;
  // Comparação em centavos inteiros, como em todo lugar onde este projeto
  // compara dinheiro: `4500.00 > 4500` em float é como um aviso falso apareceria
  // no valor exato do teto.
  return Math.round(valor * 100) > Math.round(liquido * 100);
};

export const descricaoDoEfeito = (pagamento, valorEstorno) => {
  const liquido = Number(pagamento?.valorLiquido ?? pagamento?.valor ?? 0);
  const sustentadas = parcelasSustentadas(pagamento);

  // Antes de qualquer outra leitura: se o valor não cabe, nenhuma das frases
  // abaixo é verdadeira, e a mais perigosa delas ("Estorno integral") é
  // justamente a que sairia — `valor >= liquido` é verdade tanto no teto
  // quanto acima dele.
  if (acimaDoEstornavel(pagamento, valorEstorno)) {
    return (
      `O valor digitado passa do que ainda é estornável neste pagamento ` +
      `(${formatCurrency(liquido)}). O servidor vai recusar — ajuste o valor, ` +
      'ou registre o estorno sobre outro pagamento.'
    );
  }

  if (sustentadas.length === 0) {
    // Adiantamento que virou crédito, ou pagamento já todo desalocado. O
    // dinheiro volta do saldo, não de uma parcela — e dizer "nenhuma parcela
    // é afetada" sem explicar de onde o valor sai deixaria a pergunta no ar.
    return 'Este pagamento não sustenta nenhuma parcela no momento: o valor estornado sai do saldo adiantado do honorário.';
  }

  const numeros = sustentadas
    .map((a) => a.numeroParcela)
    .filter((n) => n !== null && n !== undefined);

  const lista =
    numeros.length === 0
      ? `${sustentadas.length} ${sustentadas.length === 1 ? 'parcela' : 'parcelas'}`
      : numeros.length === 1
        ? `a parcela ${numeros[0]}`
        : `as parcelas ${numeros.slice(0, -1).join(', ')} e ${numeros[numeros.length - 1]}`;

  const valor = Number(valorEstorno);
  const integral = Number.isFinite(valor) && valor > 0 && Math.round(valor * 100) >= Math.round(liquido * 100);

  if (integral) {
    return `Estorno integral: ${lista} ${numeros.length === 1 ? 'volta' : 'voltam'} a ficar em aberto, e este pagamento deixa de valer.`;
  }

  // Estorno PARCIAL: a tela não afirma quanto sai de cada parcela — esse
  // rateio é do backend. Diz a ordem (contrato) e por qual parcela começa,
  // que é o que a advogada precisa saber para decidir.
  const primeira =
    numeros.length > 0 ? `pela parcela ${numeros[0]}` : 'pela alocação mais recente';

  return (
    `Hoje este pagamento sustenta ${lista}. A devolução desfaz as alocações da ` +
    `mais recente para a mais antiga, começando ${primeira} — o que for solto ` +
    'volta a ficar em aberto.'
  );
};

// A frase da ANULAÇÃO. Ela não tem valor a escolher — anular restaura o valor
// integral do estorno anulado (`reversalValidation.js` dispensa `valor` de
// propósito, para não existir "anulação parcial"). Por isso o texto é fixo e
// afirma o efeito inteiro.
export const descricaoDaAnulacao = (estorno) => {
  const valor = estorno?.valor;
  return (
    `Anular este estorno de ${formatCurrency(valor)} faz o valor voltar a ser ` +
    'considerado recebido e ser realocado nas parcelas em aberto, da mais antiga ' +
    'para a mais nova. Um estorno só pode ser anulado uma vez.'
  );
};

export default { parcelasSustentadas, acimaDoEstornavel, descricaoDoEfeito, descricaoDaAnulacao };
