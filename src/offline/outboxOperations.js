// ═══════════════════════════════════════════════════════════════════════════
// O QUE PODE ENTRAR NA FILA — e, principalmente, o que NÃO (F-5b, DEC-059)
//
// A F-5a bloqueou **toda** escrita sem sinal. A F-5b não afrouxa essa regra:
// ela abre uma **lista de exceções**, curta e fechada. O que não está aqui
// continua indisponível, com o motivo na tela, exatamente como antes.
//
// ── Só compromisso da agenda e mudança de fase ──────────────────────────
// Os dois valem por si: não dependem de saldo, de total, nem de nenhum estado
// do servidor que o aparelho offline não possa conferir. O pior caso de um
// conflito é uma data ou uma fase que a advogada revê.
//
// ── Por que o FINANCEIRO ficou de fora ──────────────────────────────────
// Não é excesso de cautela; é a natureza do módulo. **Toda validação de
// dinheiro depende de estado do servidor que o navegador offline não tem como
// conferir**: o saldo em aberto, se a parcela já foi quitada, se o honorário
// foi reparcelado, quanto ainda é estornável.
//
// Um pagamento enfileirado às 10h pode ser inválido às 15h, quando o sinal
// voltar — a parcela foi quitada por outro caminho, ou o plano foi
// substituído. Aí a fila teria de explicar à advogada **por que um recebimento
// que ela deu como registrado não existe**, depois de ela já ter dito ao
// cliente que estava pago.
//
// O Financeiro 2.0 levou oito subfases para garantir que a tela nunca minta
// sobre dinheiro. **Enfileirar dinheiro reintroduz a mentira pela porta do
// offline.**
//
// ── E o DELETE de compromisso? Também fora, e por outro motivo ──────────
// Apagar offline um compromisso que **ainda não foi criado no servidor**
// exigiria remapear o identificador local quando a criação subisse — a
// armadilha clássica de fila, e a que produz o pior tipo de defeito: apagar o
// registro errado. Excluir compromisso continua exigindo sinal.
// ═══════════════════════════════════════════════════════════════════════════

// `rotulo` e `verbo` são o começo da frase que a tela de pendências mostra
// ("Compromisso 'Audiência de instrução', criado ontem às 14:32"). Ficam aqui,
// junto da rota que os produz, porque é aqui que se vê se falta um.
export const OPERACOES = Object.freeze([
  {
    id: 'criarEvento',
    metodo: 'post',
    padrao: /^\/events\/?$/,
    rotulo: 'Compromisso',
    verbo: 'criado'
  },
  {
    id: 'atualizarEvento',
    metodo: 'patch',
    padrao: /^\/events\/[^/]+$/,
    rotulo: 'Compromisso',
    verbo: 'editado'
  },
  {
    id: 'concluirEvento',
    metodo: 'patch',
    padrao: /^\/events\/[^/]+\/concluir$/,
    rotulo: 'Compromisso',
    verbo: 'concluído'
  },
  {
    id: 'mudarFase',
    metodo: 'patch',
    padrao: /^\/processes\/[^/]+\/fase$/,
    rotulo: 'Fase do processo',
    verbo: 'alterada'
  }
]);

// O caminho como o axios o vê: relativo à `baseURL`, sem query. Uma URL
// absoluta (que a instância aceita) é normalizada para o caminho, senão
// `https://api.exemplo/api/payments` escaparia da comparação.
export const caminhoDaRequisicao = (url) => {
  if (typeof url !== 'string' || url.trim() === '') return null;
  let caminho = url.trim().split('?')[0].split('#')[0];

  if (/^https?:\/\//i.test(caminho)) {
    try {
      caminho = new URL(caminho).pathname;
    } catch {
      return null;
    }
  }

  // A `baseURL` termina em `/api`; o que chega aqui pode ou não trazer esse
  // prefixo, conforme o caminho tenha sido montado à mão.
  caminho = caminho.replace(/^\/api(?=\/|$)/, '');
  if (!caminho.startsWith('/')) caminho = `/${caminho}`;
  return caminho.length > 1 ? caminho.replace(/\/$/, '') : caminho;
};

// A pergunta inteira, e ela é FECHADA: o que não casa com uma das quatro
// linhas acima não entra na fila. Devolve a operação (para a tela poder
// descrevê-la) ou `null`.
export const identificarOperacao = ({ method, url } = {}) => {
  if (typeof method !== 'string') return null;
  const metodo = method.toLowerCase();
  const caminho = caminhoDaRequisicao(url);
  if (!caminho) return null;

  return (
    OPERACOES.find((op) => op.metodo === metodo && op.padrao.test(caminho)) ?? null
  );
};

export const ehEnfileiravel = (requisicao) => identificarOperacao(requisicao) !== null;

// Para a TELA perguntar antes de oferecer o botão: "esta tela pode gravar sem
// sinal?". Sem isto, cada tela repetiria a lista — e a que fosse escrita por
// último esqueceria o financeiro do lado de fora.
export const OPERACAO_POR_ID = Object.freeze(
  Object.fromEntries(OPERACOES.map((op) => [op.id, op]))
);
