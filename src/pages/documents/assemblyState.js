// ═══════════════════════════════════════════════════════════════════════════
// ESTADO DA MONTAGEM — funções puras (Fase 4.4)
//
// Extraído de `DocumentAssemblyPage.jsx` quando o bug da folha foi corrigido.
// O motivo é o mesmo de `utils/feeCalc.js`: a suíte é `node --test` sem DOM, e
// lógica dentro do componente só se testaria por varredura de texto — que prova
// que a linha existe, não que a lista que alimenta o preview está certa.
//
// Nada aqui fala com a rede nem decide ordem: **quem ordena é o backend.** A
// inserção com `ordem` empurra as seguintes no servidor (empurrão de posição), e
// a tela relê em vez de reproduzir a regra. O que estas funções fazem é ler a
// resposta e aplicar os movimentos OTIMISTAS de remover e reordenar, que a tela
// desfaz por rollback se a requisição falhar.
// ═══════════════════════════════════════════════════════════════════════════

// O id da seção de um vínculo, com `secaoId` populado ou cru.
//
// A listagem popula (`populate("secaoId", "titulo tipo texto variaveis")`), mas
// nada obriga toda resposta a popular — e comparar um objeto com uma string
// devolveria `false` para o mesmo vínculo, em silêncio.
export const secaoIdDe = (vinculo) => String(vinculo?.secaoId?._id ?? vinculo?.secaoId ?? '');

// A lista que alimenta a folha, a partir da resposta de
// `GET /documents/:id/secoes`.
//
// A rota responde no envelope de listagem — `{ data, total, page, limit,
// totalPages }` — e `data` já vem ordenado por `ordem`. O `?? resposta` é o
// resíduo conhecido do projeto: todas as listagens usam envelope desde a Fase
// 2E.1, e o fallback nunca dispara. Fica porque removê-lo é varredura de ~20
// sítios, registrada como dívida no CLAUDE.md do backend.
//
// Devolve SEMPRE um array: `setVinculos` com não-array quebraria o `.map` do
// canvas na renderização seguinte, longe da causa.
export const listaDeVinculos = (resposta) => {
  const bruto = resposta?.data?.data ?? resposta?.data;
  return Array.isArray(bruto) ? bruto : [];
};

// Quais seções já estão no documento. A tela usa para marcar a miniatura como
// usada e para antecipar o índice único {documentoId, secaoId} do banco.
export const idsDasSecoes = (vinculos) => new Set((vinculos ?? []).map(secaoIdDe));

// Os ids na ordem em que estão na folha — o corpo de
// `PATCH /:id/secoes/reordenar`, que exige exatamente as seções vinculadas.
export const idsNaOrdem = (vinculos) => (vinculos ?? []).map(secaoIdDe);

// Movimento otimista de reordenação. Fora da faixa devolve a MESMA referência,
// e não uma cópia: a tela usa a identidade para não disparar render à toa, e
// devolver cópia num movimento inválido marcaria o estado como sujo sem nada
// ter mudado.
export const reordenarLocal = (vinculos, de, para) => {
  const lista = vinculos ?? [];
  if (de === para || de < 0 || para < 0 || de >= lista.length || para >= lista.length) {
    return lista;
  }
  const copia = [...lista];
  const [movido] = copia.splice(de, 1);
  copia.splice(para, 0, movido);
  return copia;
};

// Movimento otimista de remoção, pelo id da SEÇÃO — que é o que a rota
// `DELETE /:id/secoes/:secaoId` recebe, e não o id do vínculo.
export const removerLocal = (vinculos, secaoId) =>
  (vinculos ?? []).filter((v) => secaoIdDe(v) !== String(secaoId));
