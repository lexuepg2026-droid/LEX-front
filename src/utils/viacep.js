// Busca de endereço por CEP via ViaCEP. Nunca lança exceção: qualquer falha
// devolve null — CEP é conveniência, não pode travar o cadastro.

export const buscarEnderecoPorCEP = async (cep) => {
  const digitos = String(cep ?? '').replace(/\D/g, '');
  if (digitos.length !== 8) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (data?.erro) return null;

    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
