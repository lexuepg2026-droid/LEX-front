// ═══════════════════════════════════════════════════════════════════════════
// MENSAGENS DE ERRO DO MÓDULO FINANCEIRO — Fase 4.2
//
// O backend já manda uma mensagem em prosa, e ela continua sendo o texto base.
// O que estas funções acrescentam é o que só as CHAVES ESTRUTURADAS sabem: o
// saldo que ainda cabe na parcela, quantos dependentes bloqueiam a ação,
// quais variáveis faltam.
//
// Por que não basta repassar `message`: a prosa do servidor diz "o pagamento
// excede o valor da parcela", e a pergunta seguinte da advogada é sempre
// "então quanto ainda cabe?". A resposta está em `saldoDisponivel`, no mesmo
// corpo, e extraí-la por regex de dentro da frase é exatamente o que a Fase
// 2E.1 aboliu ao criar as chaves.
//
// Nenhuma tela abre o corpo da resposta por conta própria — tudo passa pelos
// helpers de `utils/apiError.js`, que é o ponto único autorizado.
// ═══════════════════════════════════════════════════════════════════════════

// Extensão explícita: o Vite resolve sem ela, `node --test` não. Ver a nota em
// `utils/feeCalc.js`.
import {
  getApiErrorMessage,
  getApiErrorConflict,
  getApiErrorPendencias,
} from './apiError.js';
import { formatCurrency } from './formatters.js';

// Rótulo do dependente que bloqueia a recusa, e O VERBO da ação recusada. As
// chaves são o vocabulário FECHADO de `config/integrityConflicts.js` — nome da
// coleção, em português, no plural. Não inventar valor fora desta lista: ela
// existe justamente para o frontend parar de chutar entre "parcelas",
// "parcela" e "installments".
//
// ── Por que o VERBO mora aqui (F-2d, achado do passo 184) ─────────────────
// A frase era fixa: *"A exclusão foi recusada. (…) remova antes de excluir."*
// A F-2b renomeou a ação para **"Desativar"** em Clientes e Processos — sempre
// foi soft delete, e com a reativação existindo o nome antigo mente. A
// mensagem ficou com a palavra velha, prometendo uma destruição que não
// acontece.
//
// Corrigir só onde a ação MUDOU, e não em toda parte: Honorários, Parcelas,
// Documentos e Seções continuam com o verbo que têm nos menus delas. Um verbo
// único para as seis faria a mensagem discordar do botão em quatro telas para
// concordar em duas.
//
//   `processos`  → bloqueia a desativação de um CLIENTE   → "desativar"
//   `parcelas`   → bloqueia a exclusão de um HONORÁRIO    → "excluir"
//   `pagamentos` → bloqueia a exclusão de uma PARCELA     → "excluir"
//   `documentos` → bloqueia a exclusão de uma SEÇÃO       → "excluir"
const ROTULO_DEPENDENCIA = {
  parcelas: {
    singular: 'parcela ativa', plural: 'parcelas ativas',
    acao: 'A exclusão foi recusada.', verbo: 'excluir',
  },
  pagamentos: {
    singular: 'pagamento ativo', plural: 'pagamentos ativos',
    acao: 'A exclusão foi recusada.', verbo: 'excluir',
  },
  processos: {
    singular: 'processo ativo', plural: 'processos ativos',
    acao: 'A desativação foi recusada.', verbo: 'desativar',
  },
  documentos: {
    singular: 'documento ativo', plural: 'documentos ativos',
    acao: 'A exclusão foi recusada.', verbo: 'excluir',
  },
};

// ── 409 de excedente de pagamento ──────────────────────────────────────────
//
// O caso de maior valor prático da fase: a advogada digitou um valor maior do
// que falta na parcela, e o que ela precisa saber é o número que caberia.
//
// `saldoDisponivel` já vem descontando os pagamentos ativos — e, na edição, já
// exclui o próprio pagamento em edição do total. É por isso que a tela não
// recalcula: ela não tem como saber disso.
export const mensagemDeExcedente = (err) => {
  const { regra, saldoDisponivel, valorParcela } = getApiErrorConflict(err);
  if (regra !== 'pagamentoExcedeParcela' || saldoDisponivel === null) return null;

  const base = getApiErrorMessage(err, 'O pagamento excede o valor da parcela.');
  const saldo = formatCurrency(saldoDisponivel);

  // Saldo zero é um caso à parte: "ainda cabem R$ 0,00" convida a tentar de
  // novo com um centavo. A parcela está quitada, e é isso que a frase diz.
  const complemento =
    saldoDisponivel <= 0
      ? `A parcela de ${formatCurrency(valorParcela)} já está quitada — não há saldo a receber nela.`
      : `Ainda cabem ${saldo} nesta parcela, de ${formatCurrency(valorParcela)} no total.`;

  return `${base} ${complemento}`;
};

// ── 409 de integridade referencial ─────────────────────────────────────────
//
// Sem `campo`, e a mensagem NÃO destaca input nenhum: o conflito é entre
// registros já gravados. O que a tela acrescenta é quantos e de que tipo, para
// a advogada saber o que precisa remover antes — e, desde a F-2d, o VERBO
// certo da ação que foi recusada.
export const mensagemDeIntegridade = (err) => {
  const { dependencia, quantidade } = getApiErrorConflict(err);
  if (!dependencia || quantidade === null) return null;

  const rotulo = ROTULO_DEPENDENCIA[dependencia];
  if (!rotulo) return null;

  const base = getApiErrorMessage(err, rotulo.acao);
  const contagem = quantidade === 1 ? `1 ${rotulo.singular}` : `${quantidade} ${rotulo.plural}`;

  return `${base} Há ${contagem} vinculada(s) — remova antes de ${rotulo.verbo}.`;
};

// ── 422 de pendências de cadastro ──────────────────────────────────────────
//
// Cada pendência chega com `rotulo` e `orientacao` JÁ ESCRITOS pelo backend.
// Nunca montar texto a partir de `variavel`: a chave é identificador, não nome
// legível — "percentualHonorario" não é frase que se mostre a ninguém.
export const mensagemDePendencias = (err) => {
  const pendencias = getApiErrorPendencias(err);
  if (pendencias.length === 0) return null;

  const base = getApiErrorMessage(err, 'Faltam dados de cadastro para gerar o documento.');
  const itens = pendencias
    .map((p) => p.rotulo)
    .filter(Boolean)
    .join(', ');

  return itens ? `${base} Pendências: ${itens}.` : base;
};

// ── Ponto único de entrada ─────────────────────────────────────────────────
//
// A ordem importa: os três casos acima são mais específicos que a prosa
// genérica, e o primeiro que reconhecer o corpo responde. Nenhum reconhecendo,
// cai no helper de sempre — inclusive nos 400 de campo, cuja mensagem do
// servidor já é a redação final (é a do hook do model).
export const getFinancialErrorMessage = (err, fallback) =>
  mensagemDeExcedente(err) ??
  mensagemDeIntegridade(err) ??
  mensagemDePendencias(err) ??
  getApiErrorMessage(err, fallback);
