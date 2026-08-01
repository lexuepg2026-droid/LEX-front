// ═══════════════════════════════════════════════════════════════════════════
// REGERAR O DOCUMENTO A PARTIR DAS SEÇÕES — regras puras (Fase 4.4)
//
// A auditoria da Fase 4.4 encontrou o contrato da 2C inteiro no backend e
// **quase** inteiro na interface: exibir o texto, editar, salvar por PATCH e o
// selo "editado à mão" já existiam nesta tela; o 409 com `confirmarSobrescrita`
// já existia no `GenerationPanel`, na tela de MONTAGEM.
//
// O que faltava era regerar a partir da tela do próprio documento. Para fazê-lo
// pela montagem, a advogada tinha de voltar, achar o modelo e reescolher
// processo e cliente — sabendo de cor quais eram. Tudo de que ela precisa já
// está gravado no documento gerado, desde a Fase 2C:
//
//   geradoDeModeloId  de qual modelo esta peça saiu
//   processoId        (populado na leitura — daí o `_id ?? valor`)
//   clienteId         de qual participante, num litisconsórcio
//   honorarioId       de qual cobrança saíram os valores
//
// As regras ficam aqui, em função pura, pelo mesmo motivo de `feeCalc.js`: a
// suíte é `node --test` sem DOM.
// ═══════════════════════════════════════════════════════════════════════════

// `processoId` vem populado (`{_id, titulo, …}`) e `clienteId`/`honorarioId`
// vêm crus. Mandar o objeto inteiro no payload faria o backend receber `[object
// Object]` como id e responder 400 — por isso a normalização é explícita.
const idDe = (valor) => {
  if (valor == null) return null;
  if (typeof valor === 'object') return valor._id ? String(valor._id) : null;
  return String(valor);
};

// Por que este documento NÃO pode ser regerado, ou `null` quando pode.
//
// A frase é a que a tela exibe. São motivos diferentes com consequências
// diferentes, e um "não é possível regerar" genérico deixaria a advogada sem
// saber se o problema é o documento ou o sistema.
export const motivoParaNaoRegerar = (documento) => {
  if (!documento) return 'Documento não carregado.';

  if (documento.ehModelo === true) {
    return 'Isto é um modelo, não um documento gerado. Modelos se editam na montagem.';
  }

  if (documento.origem === 'upload') {
    return 'Este documento veio de upload — não há seções de origem para regerar.';
  }

  if (!idDe(documento.geradoDeModeloId)) {
    // Documento gerado antes de `geradoDeModeloId` existir, ou criado direto
    // por `POST /documents`. Não há como saber de qual modelo veio, e adivinhar
    // pelo nome geraria a peça errada em silêncio.
    return 'Este documento não registra de qual modelo saiu, então não há o que regerar. Gere um novo pela tela de montagem.';
  }

  if (!idDe(documento.processoId)) {
    return 'Este documento não está vinculado a um processo.';
  }

  return null;
};

export const podeRegerar = (documento) => motivoParaNaoRegerar(documento) === null;

// O payload de `POST /documents/modelos/:modeloId/gerar`.
//
// `clienteId` e `honorarioId` saem como `undefined` quando não existem, e não
// como `null`: aqui não é "apagar campo" (a convenção do `null` do projeto),
// é "não informar". O backend trata omitido e null de formas diferentes —
// omitido em `honorarioId` deixa ele escolher quando há um único ativo.
export const parametrosDeRegeracao = (documento) => {
  if (!podeRegerar(documento)) return null;

  return {
    modeloId: idDe(documento.geradoDeModeloId),
    processoId: idDe(documento.processoId),
    clienteId: idDe(documento.clienteId) ?? undefined,
    honorarioId: idDe(documento.honorarioId) ?? undefined,
  };
};

// O texto do diálogo de sobrescrita, montado a partir das chaves do 409.
//
// **Nunca por regex sobre a mensagem** — foi assim que a Fase 1.3 quebrou. O
// backend manda `errors.dataGeracao`, `errors.editadoManualmente` e
// `errors.sairaDoPortal`, e é deles que sai cada frase.
//
// A frase do portal só entra quando `sairaDoPortal` é verdadeiro. Dizer "e sai
// do portal" sobre um documento que nunca esteve lá é informação errada na
// direção que assusta.
export const textoDaSobrescrita = (conflito, { formatarData } = {}) => {
  const partes = [
    'O texto editado à mão será substituído pelo texto recomposto a partir das seções.',
  ];

  const data = conflito?.dataGeracao;
  if (data && typeof formatarData === 'function') {
    partes.push(`A versão atual foi gerada em ${formatarData(data)} e ficará guardada como substituída — o texto revisado continua recuperável.`);
  } else {
    partes.push('A versão atual ficará guardada como substituída — o texto revisado continua recuperável.');
  }

  if (conflito?.sairaDoPortal === true) {
    partes.push('Este documento está visível no portal do cliente e SAIRÁ de lá: o documento novo nasce oculto e precisa ser liberado outra vez.');
  }

  return partes.join(' ');
};
