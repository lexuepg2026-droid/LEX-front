// Para onde a página "não encontrada" leva (Fase 2a, item 5). Função pura,
// para a suíte executar os três casos em vez de ler o JSX.
//
// O portal vem primeiro: um cliente que errou um endereço de `/portal/…` não
// tem conta de advogada e não pode ser mandado para o login dela — é a mesma
// separação da Fase 3.2 (`tests/portal/isolamento.test.js`).
export function destinoDeVolta(pathname, autenticada) {
  if (pathname === '/portal' || pathname.startsWith('/portal/')) {
    return { to: '/portal', rotulo: 'Voltar ao portal' };
  }
  if (autenticada) return { to: '/dashboard', rotulo: 'Voltar ao Início' };
  return { to: '/', rotulo: 'Ir para a página inicial' };
}
