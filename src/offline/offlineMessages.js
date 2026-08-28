// ═══════════════════════════════════════════════════════════════════════════
// AS FRASES DO ESTADO SEM SINAL — indisponível não é quebrado (F-5a, Parte 4)
//
// Sem escrita offline (isso é a F-5b), tudo que grava fica indisponível. A
// diferença entre **indisponível** e **quebrado** é a fase inteira aqui: a
// primeira ensina a esperar o sinal, a segunda manda abrir chamado.
//
// Três regras que estas frases carregam:
//
//   1. **Dizem o que fazer**, não o que aconteceu. "Falha na requisição" é
//      informação para quem escreveu o código; "tente de novo quando o sinal
//      voltar" é informação para quem está atendendo um cliente.
//   2. **Uma redação por estado.** Duas telas com duas frases para o mesmo
//      estado fazem a advogada achar que são dois estados diferentes — a mesma
//      razão pela qual os rótulos vivem em `utils/enums.js`.
//   3. **Nada de erro genérico de rede.** Se o app SABE que está offline, ele
//      diz isso. "Falha ao carregar" some quando existe uma explicação melhor,
//      e `offlineErrorMessage` é quem a fornece a `utils/apiError.js`.
// ═══════════════════════════════════════════════════════════════════════════

// O motivo ao lado do botão desabilitado (padrão da DEC-053: botão ausente faz
// procurar; botão desabilitado com explicação ensina).
export const MENSAGEM_ESCRITA_OFFLINE =
  'Sem conexão — você pode consultar, mas não registrar. ' +
  'Tente de novo quando o sinal voltar.';

// A tela que ela nunca abriu com sinal. Não é erro, e não é "não encontrado":
// é uma tela que este aparelho ainda não tem. Guarda-se o que passou pela tela,
// nunca o banco inteiro baixado por precaução (Parte 2 da fase).
export const MENSAGEM_LEITURA_SEM_CACHE =
  'Sem conexão — esta tela ainda não foi aberta com sinal neste aparelho, ' +
  'então não há dados guardados dela. Tente de novo quando o sinal voltar.';

// PDF e DOCX não são guardados, por decisão (Parte 2). Quando o download falha
// sem sinal, a tela diz exatamente isso — e não "erro ao baixar arquivo".
export const MENSAGEM_DOWNLOAD_OFFLINE =
  'Sem conexão — o arquivo é gerado pelo servidor e não fica guardado neste ' +
  'aparelho. Tente de novo quando o sinal voltar.';

// Falha SEM resposta do servidor. O axios devolve `err.response` apenas quando
// houve resposta HTTP; sem ela, ou o servidor não foi alcançado, ou a
// requisição foi cancelada. É a única assinatura confiável — ler o texto de
// `err.message` seria depender da redação do axios, que muda entre versões.
export const isNetworkError = (err) =>
  Boolean(err) && err.response === undefined && err.code !== 'ERR_CANCELED';

// A mensagem que substitui o erro genérico quando o app sabe que está offline.
// Devolve `null` quando não é o caso — e aí quem chama segue com o que já
// dizia. Função PURA: `online` é parâmetro, não `navigator.onLine` lido aqui
// dentro, para a suíte poder provar os dois lados sem navegador.
export const offlineErrorMessage = (err, { online = true } = {}) => {
  if (online) return null;
  if (err?.offline === true) return MENSAGEM_ESCRITA_OFFLINE;
  if (!isNetworkError(err)) return null;
  return MENSAGEM_LEITURA_SEM_CACHE;
};

// ── Qual motivo aparece quando há dois ───────────────────────────────────
//
// A listagem de processos já tem um motivo próprio para desabilitar
// "Reativar": o cliente do processo está desativado (DEC-053). Sem sinal,
// passa a haver DOIS motivos para o mesmo item, e a tela precisa escolher um —
// dois motivos empilhados num item de menu não se leem.
//
// **A falta de sinal ganha**, e a razão é de ordem: ela bloqueia a ação
// inteira, agora, independentemente do estado do registro. O motivo da DEC-053
// continua verdadeiro e volta a aparecer assim que o sinal voltar — que é
// exatamente quando ele volta a ser o que importa.
export const blockReason = (motivoDaTela, { online = true } = {}) =>
  (online === false ? MENSAGEM_ESCRITA_OFFLINE : (motivoDaTela ?? undefined));
