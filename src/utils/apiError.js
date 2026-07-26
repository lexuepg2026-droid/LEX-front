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

// Campo que originou o erro ("email", "cpf", "oab", "cnpj"), quando o backend
// informa. Serve para a UI rotear (destacar input, voltar de etapa) sem
// interpretar o texto da mensagem — reescrever a mensagem quebrava o
// roteamento em silêncio. Devolve null quando a resposta não traz o campo.
export const getApiErrorField = (err) => err?.response?.data?.campo || null;
