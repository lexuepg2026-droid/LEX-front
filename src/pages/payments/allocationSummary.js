import { formatCurrency } from '../../utils/formatters.js';

// ═══════════════════════════════════════════════════════════════════════════
// RESUMO DO QUE O MOTOR FEZ COM O DINHEIRO — Fase F-1a
//
// `POST /payments` devolve `{ pagamento, alocacoes, sobra, saldoAdiantado }`:
// o pagamento nasce contra o HONORÁRIO e o backend decide em quais parcelas ele
// encosta. Sem exibir isso, a advogada registra um valor e não sabe o que
// aconteceu com ele — que é justamente a pergunta que a DEC-035 existe para
// responder.
//
// ── Por que função pura, e não texto montado no JSX ───────────────────────
// Mesma razão de `utils/feeCalc.js` e `pages/documents/assemblyState.js`: a
// suíte é `node --test` sem DOM, e frase montada dentro de componente só se
// testaria por varredura de texto — que prova que a linha existe, não que ela
// diz a coisa certa. Aqui há plural, concordância e três casos que se combinam.
//
// ── Isto NÃO é o preview ──────────────────────────────────────────────────
// O preview (`POST /payments/preview`) mostra o que ACONTECERIA, antes de
// gravar, e a tela dele é da F-1b. Este resumo é do fato consumado: sai do 201,
// depois de o dinheiro já ter destino. São coisas diferentes e não se
// substituem — mas as duas leem a mesma resposta do mesmo motor, e por isso não
// podem discordar.
// ═══════════════════════════════════════════════════════════════════════════

const plural = (n, singular, plural_) => (n === 1 ? singular : plural_);

export const resumoDaAlocacao = (resposta) => {
  const alocacoes = Array.isArray(resposta?.alocacoes) ? resposta.alocacoes : [];
  const sobra = Number(resposta?.sobra ?? 0);
  const n = alocacoes.length;

  const partes = ['Pagamento registrado.'];

  if (n > 0) {
    const total = alocacoes.reduce((acc, a) => acc + Number(a.valor || 0), 0);
    partes.push(
      `${formatCurrency(total)} ${plural(n, 'aplicado', 'aplicados')} em ` +
      `${n} ${plural(n, 'parcela', 'parcelas')}.`
    );
  }

  if (sobra > 0) {
    // "Sobra" é a palavra do motor; para a advogada o que importa é que o
    // dinheiro NÃO se perdeu e onde ele está. Dizer só "sobra de R$ 500"
    // deixaria a pergunta "sobrou e foi para onde?" sem resposta.
    partes.push(`${formatCurrency(sobra)} ${plural(1, 'ficou', '')} como saldo adiantado.`);
  }

  // Nenhuma alocação e nenhuma sobra é impossível pelo contrato (o valor sempre
  // vai para algum lugar), mas a frase precisa continuar fazendo sentido se um
  // dia o contrato mudar — um toast vazio seria pior que um genérico.
  if (n === 0 && sobra <= 0) {
    partes.push('Nenhuma parcela em aberto foi afetada.');
  }

  return partes.join(' ');
};

export default { resumoDaAlocacao };
