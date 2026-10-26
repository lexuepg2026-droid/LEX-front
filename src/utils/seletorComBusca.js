// ═══════════════════════════════════════════════════════════════════════════
// O SELETOR QUE BUSCA NO SERVIDOR — as regras, em função pura (Fase 3.2, DEC-101)
//
// Substitui o paliativo da Fase 0 (DEC-067: `limit=100` e "Mostrando os N mais
// recentes de T") e a opção garantida da 2b (DEC-086, `comOpcaoGarantida`).
// Os três `<select>` — processo no honorário, honorário na parcela e no
// pagamento — viraram `SeletorComBusca`, que pergunta ao servidor a cada pausa
// da digitação. Não há mais teto: o 101º honorário é achado pelo nome do
// cliente, pelo número do processo ou pela descrição.
//
// A suíte é `node --test` sem DOM; o que é decisão mora aqui.
// ═══════════════════════════════════════════════════════════════════════════

// A espera entre teclas — a mesma do `useListFilters` e da busca das listas.
export const ESPERA_DA_BUSCA_MS = 300;

// Até 20 sugestões, o `limit` que o seletor pede ao servidor.
export const LIMITE_DO_SELETOR_COM_BUSCA = 20;

export const MENSAGENS_DO_SELETOR = Object.freeze({
  buscando: 'Buscando…',
  semResultado: 'Nenhum resultado.',
  // Sem sinal a busca não sai: a frase diz o porquê, em vez de "nenhum
  // resultado" — que faria procurar um registro que existe.
  semConexao: 'A busca precisa de conexão. Conecte-se para procurar.',
  erro: 'Não foi possível buscar agora. Tente de novo em instantes.',
  // O registro escolhido (da URL ou do registro em edição) é buscado pelo id
  // quando ainda não se conhece o rótulo dele. DEC-086: a escolha NUNCA
  // aparece vazia, nem enquanto carrega, nem quando a busca falha.
  carregandoEscolhido: 'Carregando o registro escolhido…',
  indisponivel: 'Registro indisponível — confira se ele não foi desativado.',
  escolhaDaLista: 'Escolha um item da lista de sugestões.',
});

// O que fazer com o texto digitado: nada (campo vazio), avisar que precisa de
// conexão, ou buscar. A ordem importa — campo vazio sem sinal não é erro.
export const acaoDaBusca = (texto, online) => {
  const termo = String(texto ?? '').trim();
  if (termo === '') return { acao: 'nada', termo };
  if (!online) return { acao: 'semConexao', termo };
  return { acao: 'buscar', termo };
};

// A lista que vira sugestão: o envelope do servidor, filtrado pela regra da
// tela (o pagamento tira o honorário cancelado) e cortado no limite.
export const sugestoesDaResposta = (corpo, { filtrar = null, limite = LIMITE_DO_SELETOR_COM_BUSCA } = {}) => {
  const lista = Array.isArray(corpo?.data) ? corpo.data : Array.isArray(corpo) ? corpo : [];
  const filtrada = typeof filtrar === 'function' ? lista.filter(filtrar) : lista;
  return filtrada.slice(0, limite);
};

// O texto que o campo mostra para o id escolhido. É o que garante a DEC-086
// sem `<option>`: com o item conhecido, o rótulo completo; sem ele, nada — e
// a frase de carregamento ou de indisponível aparece abaixo do campo, no
// lugar do "Selecione…" vazio que o `<select>` mostrava.
export const textoDoEscolhido = (item, rotulo) => (item ? rotulo(item) : '');

// Digitar por cima de uma escolha DESFAZ a escolha: o texto passou a ser uma
// busca, e um id antigo atrás de um texto novo mandaria ao servidor o registro
// que a advogada não está vendo.
export const escolhaContinuaValendo = (texto, item, rotulo) =>
  Boolean(item) && String(texto ?? '') === rotulo(item);

const mesmoId = (a, b) => String(a ?? '') === String(b ?? '');
export const precisaBuscarPorId = (idEscolhido, itemConhecido) =>
  Boolean(idEscolhido) && !mesmoId(itemConhecido?._id, idEscolhido);

// `GET /fees/:id` popula o processo SEM o cliente e devolve o cliente ao lado,
// em `cliente`. O seletor rotula pelo formato da listagem (cliente dentro do
// processo); a conversão é só de leitura, aqui, para nenhum contrato mudar.
export const honorarioDoDetalhe = (fee) => {
  if (!fee || typeof fee !== 'object') return fee;
  const processo = fee.processoId && typeof fee.processoId === 'object' ? fee.processoId : null;
  if (!processo) return fee;
  const cliente = processo.clientePrincipalId && typeof processo.clientePrincipalId === 'object'
    ? processo.clientePrincipalId
    : (fee.cliente ?? null);
  return { ...fee, processoId: { ...processo, clientePrincipalId: cliente } };
};

export default {
  honorarioDoDetalhe,
  ESPERA_DA_BUSCA_MS,
  LIMITE_DO_SELETOR_COM_BUSCA,
  MENSAGENS_DO_SELETOR,
  acaoDaBusca,
  sugestoesDaResposta,
  textoDoEscolhido,
  escolhaContinuaValendo,
  precisaBuscarPorId,
};
