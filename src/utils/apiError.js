// Extrai a mensagem de erro mais útil de uma falha do axios.
// O errorMiddleware do backend responde { message }; algumas telas antigas liam
// { error }, então a mensagem do servidor nunca aparecia. Ordem: message → error
// → err.message → fallback.

export const getApiErrorMessage = (err, fallback = 'Ocorreu um erro. Tente novamente.') => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
};

// O STATUS HTTP, quando houve resposta. Existe desde a F-5b porque a fila
// precisa distinguir "não saiu do aparelho" (sem resposta) de "o servidor
// recusou" (4xx) e de "o servidor falhou" (5xx) — três desfechos com três
// tratamentos diferentes na tela de pendências.
//
// Ele fica AQUI, e não na fila, pela regra do projeto: quem abre o erro é este
// arquivo. A varredura de `tests/financial/estatica.test.js` trava o resto —
// e é ela que impede este getter de virar desculpa para as telas voltarem a
// ler `err.response` por conta própria.
export const getApiErrorStatus = (err) => err?.response?.status ?? null;

// Campo que originou o erro ("email", "cpf", "oab", "cnpj"), quando o backend
// informa. Serve para a UI rotear (destacar input, voltar de etapa) sem
// interpretar o texto da mensagem — reescrever a mensagem quebrava o
// roteamento em silêncio. Devolve null quando a resposta não traz o campo.
export const getApiErrorField = (err) => err?.response?.data?.campo || null;

// Corpo `errors` das respostas de erro, quando existe. O backend usa esse
// envelope para tudo que a tela precisa renderizar de forma estruturada — a
// lista de pendências do 422, os dados do documento anterior no 409 da
// regeração — e não só para texto.
export const getApiErrorDetails = (err) => err?.response?.data?.errors ?? null;

// Pendências do 422 da geração de documento. Cada item vem do backend como
// { variavel, rotulo, origem, orientacao, opcoes? } — já com o RÓTULO e a
// orientação escritos, prontos para exibir. Nunca montar texto a partir de
// `variavel`: a chave é identificador, não nome legível.
export const getApiErrorPendencias = (err) => {
  const pendencias = getApiErrorDetails(err)?.pendencias;
  return Array.isArray(pendencias) ? pendencias : [];
};

// Chaves estruturadas dos 409, da allowlist de `middleware/errorMiddleware.js`
// (Fase 2E.1). Existem TRÊS formatos de 409 e eles não são intercambiáveis:
//
//   - integridade referencial → `dependencia` + `quantidade`, SEM `campo`
//     (o conflito é entre registros gravados, não há input para destacar);
//   - conflito de campo       → `campo` (o input que ela acabou de preencher);
//   - outra regra de negócio  → `regra` + as chaves que aquela regra declara
//     (`pagamentoExcedeParcela` traz `saldoDisponivel` e `valorParcela`).
//
// Este getter existe para que nenhuma tela precise abrir `err.response.data`
// para chegar a eles — que é a regra do projeto desde a Fase 2E.1, e o que
// mantém a mensagem em prosa livre de regex sobre o texto do servidor.
export const getApiErrorConflict = (err) => {
  const data = err?.response?.data ?? {};
  return {
    regra: data.regra ?? null,
    dependencia: data.dependencia ?? null,
    quantidade: typeof data.quantidade === 'number' ? data.quantidade : null,
    saldoDisponivel: typeof data.saldoDisponivel === 'number' ? data.saldoDisponivel : null,
    valorParcela: typeof data.valorParcela === 'number' ? data.valorParcela : null,
  };
};
