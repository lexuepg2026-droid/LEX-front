// ═══════════════════════════════════════════════════════════════════════════
// O RÓTULO DA PARCELA — DEC-048 (Fase F-1c.1)
//
// ── O defeito ────────────────────────────────────────────────────────────
// Até a F-1c.1 o reparcelamento CONTINUAVA a numeração: um honorário de 2
// parcelas que virava 3 ficava com 1, 2 (canceladas) e 3, 4, 5 (vivas). Para
// quem lê, "parcela 3" de um plano de três é a PRIMEIRA — e a advogada, ao
// telefone com o cliente, precisa dizer "são três parcelas, esta é a
// primeira". A tela dizia 3.
//
// ── A regra ──────────────────────────────────────────────────────────────
// O plano vigente numera de 1. As canceladas guardam o número que tinham, e o
// "de N" delas é CONGELADO no tamanho do plano a que pertenciam — uma parcela
// cancelada de um plano de 2 continua dizendo "de 2", para sempre.
//
// ── Função única, e por quê ──────────────────────────────────────────────
// Cinco telas mostram número de parcela (a página do honorário, a listagem, o
// extrato, o recibo e a ficha do processo). Rótulo montado em cinco lugares é
// rótulo que vai divergir — e aqui divergir significa a lista dizer "Parcela
// 1 de 3" e o recibo dizer "parcela 3", sobre a mesma parcela.
//
// O backend tem a MESMA função, em `services/installmentReference.js`. As duas
// existem porque as duas pontas montam frase: o backend nas descrições do
// extrato e do recibo, a tela nos rótulos de coluna e de lista. O que NÃO pode
// haver é uma terceira cópia dentro de um componente.
// ═══════════════════════════════════════════════════════════════════════════

// `Number(null)` é `0` e `Number('')` também — os dois são finitos, e sem esta
// guarda uma parcela ausente viraria "Parcela 0", que parece um número de
// parcela e é lido como um.
const numeroOuNulo = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

// "Parcela 1 de 3", ou "Parcela 1" enquanto o plano está aberto.
//
// `totalParcelas` é o congelado e tem precedência SEMPRE — é o ponto inteiro
// da DEC-048. `totalNoPlanoVigente` é o tamanho do plano de agora, usado só
// enquanto o congelado é `null` (a advogada cria parcela por parcela, e quando
// a primeira nasce ninguém sabe que serão três).
//
// N = 1 não ganha "de 1": a única parcela do plano já se identifica por ser a
// única, e "Parcela 1 de 1" é o mesmo ruído que o recibo evita desde a 4.1.
export const rotuloDaParcela = ({
  numeroParcela,
  totalParcelas = null,
  totalNoPlanoVigente = null
} = {}) => {
  const numero = numeroOuNulo(numeroParcela);
  if (numero === null) return 'Parcela';

  const n = numeroOuNulo(totalParcelas ?? totalNoPlanoVigente);
  if (n === null || n <= 1) return `Parcela ${numero}`;
  return `Parcela ${numero} de ${n}`;
};

// O tamanho do plano VIGENTE, a partir da lista de parcelas que a tela já tem.
// É o que alimenta `totalNoPlanoVigente` sem uma consulta a mais: as parcelas
// do plano original (`planoId` nulo) que ainda estão de pé.
//
// Parcela de reparcelamento não entra: o "de N" dela já veio congelado do
// backend, e contá-la aqui somaria as gerações — exatamente o erro que a
// DEC-048 veio tirar do recibo.
export const tamanhoDoPlanoVigente = (parcelas = []) =>
  parcelas.filter((p) => (p?.planoId ?? null) === null && p?.ativo !== false).length;

// O rótulo de uma parcela dentro de uma LISTA, que é como toda tela a mostra.
// Resolve o `totalNoPlanoVigente` sozinho, para o chamador não precisar saber
// da regra.
export const rotuloNaLista = (parcela, parcelas = []) =>
  rotuloDaParcela({
    numeroParcela: parcela?.numeroParcela,
    totalParcelas: parcela?.totalParcelas ?? null,
    totalNoPlanoVigente:
      (parcela?.planoId ?? null) === null ? tamanhoDoPlanoVigente(parcelas) : null
  });

export default { rotuloDaParcela, tamanhoDoPlanoVigente, rotuloNaLista };
