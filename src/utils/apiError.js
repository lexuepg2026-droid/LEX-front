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
