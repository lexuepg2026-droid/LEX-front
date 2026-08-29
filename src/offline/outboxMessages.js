// ═══════════════════════════════════════════════════════════════════════════
// A FILA FALA PORTUGUÊS — a Parte 4 da F-5b em frases (DEC-059/DEC-060)
//
// **Nunca `POST /events 409`.** A tela de pendências é lida por quem estava
// numa audiência quando o sinal caiu, e o que ela precisa saber é o que era,
// de quando, e o que houve. Um código HTTP não responde a nenhuma das três.
//
// A classificação da falha é separada da frase de propósito: é ela que decide
// o que a tela OFERECE (tentar de novo, escolher entre duas versões, corrigir),
// e uma tela que decidisse isso lendo o texto da mensagem seria a volta do
// regex sobre a prosa do servidor que a Fase 1.3 quebrou.
// ═══════════════════════════════════════════════════════════════════════════

import { formatUpdatedAt } from './dataAge.js';
import { rotuloDaFase } from '../utils/enums.js';
import { OPERACAO_POR_ID } from './outboxOperations.js';

// ── A classificação ──────────────────────────────────────────────────────
//
//   conflito  → 409 `conflitoDeVersao`: outro aparelho mudou o registro. A
//               tela mostra AS DUAS versões e a advogada escolhe (DEC-060).
//   recusado  → 4xx de regra ou de validação: o servidor não aceita como está.
//               Não adianta tentar de novo sem mudar nada.
//   semSinal  → nem saiu do aparelho. Continua pendente, e volta a tentar
//               sozinha quando o sinal voltar.
//   servidor  → 5xx: falha do outro lado. Tentar de novo faz sentido.
export const classificarFalha = ({ status = null, regra = null, offline = false } = {}) => {
  if (offline || status === null) return 'semSinal';
  if (status === 409 && regra === 'conflitoDeVersao') return 'conflito';
  if (status >= 500) return 'servidor';
  if (status >= 400) return 'recusado';
  return 'servidor';
};

// A frase do "o que houve", por classificação. `motivoDoServidor` entra quando
// existe — a mensagem do servidor é mais específica que qualquer coisa que se
// possa escrever aqui, e ela já vem em português.
export const mensagemDaFalha = (classificacao, { motivoDoServidor = null } = {}) => {
  switch (classificacao) {
    case 'conflito':
      return 'Este registro foi alterado em outro aparelho depois que você o editou. ' +
        'Compare as duas versões e escolha qual vale.';
    case 'recusado':
      return motivoDoServidor
        ? `O servidor recusou: ${motivoDoServidor}`
        : 'O servidor recusou esta gravação. Corrija e envie de novo.';
    case 'servidor':
      return 'O servidor não conseguiu gravar agora. Você pode tentar de novo.';
    case 'semSinal':
    default:
      return 'Ainda sem conexão. Será enviado sozinho quando o sinal voltar.';
  }
};

// "Compromisso 'Audiência de instrução', criado ontem às 14:32."
//
// A hora sai de `formatUpdatedAt`, o mesmo formatador do aviso de idade da
// F-5a: a advogada já leu "ontem às 14:32" na tela de agenda, e duas formas de
// escrever o mesmo instante fariam parecer dois instantes.
export const descreverEntrada = (entrada, agora = Date.now()) => {
  const operacao = OPERACAO_POR_ID[entrada?.operacao];
  const rotulo = operacao?.rotulo ?? 'Alteração';
  const verbo = operacao?.verbo ?? 'registrada';
  const quando = formatUpdatedAt(entrada?.criadoEm, agora);
  const titulo = entrada?.titulo ? ` "${entrada.titulo}"` : '';

  return `${rotulo}${titulo}, ${verbo}${quando ? ` ${quando}` : ''}`;
};

// O que a entrada guarda como "título" — o que a advogada reconhece. Sai do
// próprio corpo da requisição, no instante do clique: depois de enfileirada,
// não há mais a quem perguntar (o compromisso pode nunca ter existido no
// servidor).
export const tituloDaRequisicao = (operacaoId, body) => {
  if (!body || typeof body !== 'object') return null;
  if (operacaoId === 'criarEvento' || operacaoId === 'atualizarEvento') {
    return typeof body.titulo === 'string' && body.titulo.trim() !== ''
      ? body.titulo.trim()
      : null;
  }
  if (operacaoId === 'mudarFase') {
    // O RÓTULO, e nunca o valor cru do enum: "conhecimento" na tela é o defeito
    // que a DEC-054 corrigiu, e a fila não pode reintroduzi-lo.
    return typeof body.fase === 'string' ? rotuloDaFase(body.fase) : null;
  }
  return null;
};

// A frase do descarte, que **nomeia o que se perde**. Descartar é o único
// caminho pelo qual trabalho da advogada some, e some para sempre: a
// confirmação não pode ser genérica.
export const mensagemDeDescarte = (entrada, agora = Date.now()) =>
  `Descartar "${descreverEntrada(entrada, agora)}"? ` +
  'Esta alteração nunca chegou ao servidor e não será enviada. ' +
  'Não há como recuperá-la depois.';

// O aviso do logout com fila pendente (Parte 2). Diz QUANTAS são, porque
// "há alterações pendentes" não deixa a advogada avaliar o que vai perder.
export const mensagemDeLogoutComFila = (quantas) =>
  quantas === 1
    ? 'Há 1 alteração que ainda não foi enviada ao servidor. Se você sair agora, ' +
      'ela será descartada e não há como recuperá-la.'
    : `Há ${quantas} alterações que ainda não foram enviadas ao servidor. Se você ` +
      'sair agora, elas serão descartadas e não há como recuperá-las.';

// A frase que a tela mostra quando a gravação foi para a fila. Ela é o oposto
// de um erro: a advogada NÃO perdeu o que digitou, e é isso que precisa ficar
// claro no mesmo instante.
export const MENSAGEM_ENFILEIRADO =
  'Sem conexão — a alteração ficou na fila e será enviada sozinha quando o sinal voltar.';

// O aviso na tela onde o registro aparece, enquanto houver pendência dele.
export const MENSAGEM_ALTERACAO_NAO_ENVIADA =
  'Há alteração não enviada nesta tela. O que aparece aqui é o que está no servidor.';
