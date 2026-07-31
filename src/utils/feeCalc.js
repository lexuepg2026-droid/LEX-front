// ═══════════════════════════════════════════════════════════════════════════
// REGRA DO HONORÁRIO NO CLIENTE — Fase 4.2
//
// Tudo que o formulário de honorário decide (quais campos aparecem, quanto vale
// o valor derivado, o que entra no payload) mora aqui, em função pura, e não
// dentro do componente.
//
// O motivo é testabilidade honesta: a suíte deste repositório é `node --test`
// sem DOM e sem testing-library, e a fase não autoriza dependência nova. Regra
// dentro de JSX só se testaria por varredura de texto — que prova que a linha
// existe, não que a conta está certa. Extraída, ela é testada de verdade.
//
// ── Quem manda é o backend ────────────────────────────────────────────────
// O `pre("validate")` de `models/Fee.js` (DEC-027) é a última palavra. O que
// está aqui ESPELHA aquela regra para poupar uma viagem e mostrar o valor
// derivado enquanto a advogada digita — nunca para ser mais rígido que a API.
// ═══════════════════════════════════════════════════════════════════════════

import { TIPO_PERCENTUAL, STATUS_CANCELADO } from './enums';

const ehVazio = (v) => v === undefined || v === null || v === '';

// ── `valor` derivado ───────────────────────────────────────────────────────
//
// A MESMA conta do hook (`models/Fee.js:179`): `Math.round(base × percentual)`
// e só então divide por 100.
//
// A ordem não é estilo. `valorBase` e `valor` estão em REAIS e `percentual` em
// pontos percentuais, então `base × percentual` já é o valor em CENTAVOS —
// arredondar ali e dividir depois faz 33,33% de 1.000 sair 333,30, e não
// 333,3000000000001. Dividir primeiro traria o erro de ponto flutuante para
// dentro do número que a advogada assina.
//
// Devolve `null` quando a conta ainda não é possível — o formulário mostra "—",
// que é honesto, em vez de "R$ 0,00", que parece um valor combinado.
export const derivarValorHonorario = (percentual, valorBase) => {
  if (ehVazio(percentual) || ehVazio(valorBase)) return null;

  const p = Number(percentual);
  const base = Number(valorBase);
  if (!Number.isFinite(p) || !Number.isFinite(base)) return null;
  if (p <= 0 || p > 100 || base < 0) return null;

  return Math.round(base * p) / 100;
};

// ── Quais campos o tipo comanda ────────────────────────────────────────────
//
// `valor` é `'entrada'` (a advogada digita) ou `'derivado'` (a tela calcula e
// só exibe). No tipo percentual ele NUNCA vai no payload: o backend descarta o
// que vier, porque ali o valor não é opinião, é conta.
//
// Sem tipo escolhido, nada de percentual aparece — mostrar os campos antes de
// saber se eles se aplicam convida a preencher o que será recusado.
export const camposDoTipo = (tipo) => {
  const ehPercentual = tipo === TIPO_PERCENTUAL;
  return {
    valor: ehPercentual ? 'derivado' : 'entrada',
    percentual: ehPercentual,
    valorBase: ehPercentual,
  };
};

// ── Validação de cliente ───────────────────────────────────────────────────
//
// As mensagens são as MESMAS que o hook devolve, palavra por palavra. Duas
// redações para a mesma regra fariam a advogada ler um texto ao errar offline e
// outro ao errar contra o servidor, sobre exatamente o mesmo erro.
//
// Devolve `{ campo, mensagem }` do primeiro problema, ou `null`. Um por vez, e
// não uma lista, pelo mesmo motivo do backend: destacar dois inputs esconde o
// segundo atrás do primeiro que ela corrigir.
export const validarHonorario = (form) => {
  const campos = camposDoTipo(form.tipo);

  if (!campos.percentual) {
    // Fora do tipo percentual não há o que validar aqui: os campos nem são
    // renderizados, e `montarPayloadHonorario` os manda como `null`.
    if (ehVazio(form.valor)) {
      return { campo: 'valor', mensagem: 'valor é obrigatório' };
    }
    return null;
  }

  if (ehVazio(form.percentual)) {
    return {
      campo: 'percentual',
      mensagem: 'Honorário do tipo percentual exige o percentual contratado',
    };
  }

  const p = Number(form.percentual);
  if (!Number.isFinite(p) || p <= 0 || p > 100) {
    return {
      campo: 'percentual',
      mensagem: 'O percentual deve ser maior que zero e no máximo 100',
    };
  }

  if (ehVazio(form.valorBase)) {
    return {
      campo: 'valorBase',
      mensagem: 'Informe o valor base sobre o qual o percentual incide',
    };
  }

  const base = Number(form.valorBase);
  if (!Number.isFinite(base) || base < 0) {
    return {
      campo: 'valorBase',
      mensagem: 'O valor base deve ser um número maior ou igual a zero',
    };
  }

  return null;
};

// ── Payload ────────────────────────────────────────────────────────────────
//
// Três regras que o formulário sozinho erraria:
//
// 1. **`valor` não vai no tipo percentual.** É derivado; mandá-lo seria mandar
//    um número que o backend descarta, e que divergiria do exibido no instante
//    em que a conta mudasse de regra.
// 2. **Sair do tipo percentual apaga com `null`.** Convenção do projeto: campo
//    apagado grava `null`, nunca `undefined` nem "". Omitir os dois no PATCH
//    deixaria o `percentual` antigo no documento, e o hook recusaria a gravação
//    com "honorário do tipo fixo não admite percentual" — um erro que a
//    advogada não teria como entender, porque o campo nem está na tela.
// 3. **`status` só sai quando é `cancelado` (ou o desfazimento dele).** Os
//    outros três são derivados das parcelas (DEC-028) e qualquer valor enviado
//    é reconciliado pelo backend.
export const montarPayloadHonorario = (form, { isEditing = false } = {}) => {
  const campos = camposDoTipo(form.tipo);

  const payload = {
    processoId: form.processoId,
    descricao: form.descricao,
    tipo: form.tipo,
    dataVencimento: form.dataVencimento,
  };

  if (campos.percentual) {
    payload.percentual = Number(form.percentual);
    payload.valorBase = Number(form.valorBase);
  } else {
    payload.valor = Number(form.valor);
    payload.percentual = null;
    payload.valorBase = null;
  }

  // Na criação o backend EXIGE `status` (`feeValidation.js`), e "pendente" é o
  // único ponto de partida honesto: honorário que nunca recebeu um centavo não
  // é "pago". Na edição só se escreve o cancelamento — e o desfazimento dele,
  // que devolve o registro à derivação.
  if (!isEditing) {
    payload.status = 'pendente';
  } else if (form.cancelado === true) {
    payload.status = STATUS_CANCELADO;
  } else if (form.cancelado === false && form.statusOriginal === STATUS_CANCELADO) {
    payload.status = 'pendente';
  }

  return payload;
};
