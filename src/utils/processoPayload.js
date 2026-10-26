// ═══════════════════════════════════════════════════════════════════════════
// O PAYLOAD DO FORMULÁRIO DE PROCESSO — campo a campo (Fase 3.4, DEC-114)
//
// Saiu de `ProcessFormPage` para a suíte EXECUTAR a regra (`node --test`, sem
// DOM): varrer o JSX provaria que a linha existe, não que a criação sai sem
// `status`.
//
// ── O processo NASCE ATIVO (apontamento 9 da banca) ──────────────────────
// Na criação o `status` não é enviado: o modelo do back tem
// `default: "ativo"`, e um seletor de status no cadastro deixava a advogada
// criar um processo "encerrado" que nunca andou. O back continua aceitando o
// campo (a edição e outros clientes da API o mandam) — nada mudou lá.
//
// Pelo mesmo motivo, trânsito em julgado e motivo do encerramento só existem
// na EDIÇÃO: um processo não nasce encerrado.
//
// ── `fase` só na CRIAÇÃO (DEC-054) ───────────────────────────────────────
// No processo já existente ela muda por `PATCH /processes/:id/fase`, que é a
// única escrita que grava histórico. Mandá-la numa edição voltaria 400.
// ═══════════════════════════════════════════════════════════════════════════
export const FASE_PADRAO = 'conhecimento';

export const montarPayloadProcesso = (formData, { isEditing }) => {
  const payload = {
    titulo: formData.titulo,
    numeroProcesso: formData.numeroProcesso || undefined,
    tipoAcao: formData.tipoAcao || undefined,
    area: formData.area || undefined,
    orgao: formData.orgao || undefined,
    vara: formData.vara || undefined,
    comarca: formData.comarca || undefined,
    descricao: formData.descricao || undefined,
    observacoes: formData.observacoes || undefined,
    dataDistribuicao: formData.dataDistribuicao || undefined,

    // ── DEC-054 — sinalizador ────────────────────────────────────────────
    // `null` e não `undefined` nos campos apagáveis: a convenção do projeto é
    // que campo apagado envia `null`.
    liminar: formData.liminar === true,
    liminarObservacao: formData.liminarObservacao || null,
    liminarEm: formData.liminarEm || null,
  };

  if (isEditing) {
    payload.status = formData.status;
    // `null` aqui é o que desfaz uma data de trânsito registrada por engano.
    payload.transitoEmJulgadoEm = formData.transitoEmJulgadoEm || null;
    payload.motivoEncerramento = formData.motivoEncerramento || null;
  }

  if (!isEditing) payload.fase = formData.fase || FASE_PADRAO;

  return payload;
};

export default { FASE_PADRAO, montarPayloadProcesso };
