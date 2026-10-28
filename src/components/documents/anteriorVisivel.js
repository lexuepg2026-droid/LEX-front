// ═══════════════════════════════════════════════════════════════════════════
// O ANTERIOR DO AVISO DE PORTAL, SEM O TETO DE 100 (Fase 3.9b, DEC-144)
//
// O aviso de portal da geração procura o documento anterior DESTA combinação
// que está visível no portal: modelo × processo × cliente — a mesma de
// `buscarGeradoAnterior` no backend —, não modelo, e `visivelPortal: true`.
// A tela pedia os 100 documentos do processo e procurava ali; num processo com
// mais de 100, o anterior mais antigo ficava de fora e o aviso sumia.
//
// A REGRA não mudou (o `.find` da tela continua o mesmo); mudou a consulta,
// que agora pede ao servidor SÓ o que o aviso precisa. A ordem do servidor é a
// de sempre (mais novo primeiro), então o primeiro é o mesmo que o `.find`
// acharia na lista inteira.
// ═══════════════════════════════════════════════════════════════════════════
export const consultaDoAnteriorVisivel = ({ processoId, modeloId, clienteId }) => ({
  processoId,
  geradoDeModeloId: modeloId,
  clienteId,
  visivelPortal: true,
  ehModelo: false,
  limit: 1,
});
