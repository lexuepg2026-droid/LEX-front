import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import clientService from '../api/clientService';
import useCachedResource from './useCachedResource';
import { nomeDoCliente } from '../utils/enums';
import { usePublicarContexto } from '../contexts/ContextoContext';

// ═══════════════════════════════════════════════════════════════════════════
// O FILTRO DE CLIENTE QUE VEM DA URL — Fase 3.5 (DEC-124)
//
// O irmão de `useProcessoFiltrado` (DEC-070) para a lista de processos aberta
// pela aba "Processos" do cliente (`?clienteId=`): lê o parâmetro, busca o
// cliente pelo MESMO recurso do detalhe (`resource: 'client'`,
// `params: { id }` — a mesma chave do espelho, DEC-058) e publica o cliente
// para a faixa de contexto (DEC-085), que mostra "Cliente: Fulano" e o
// Voltar para a aba de onde ela veio.
//
// `avisoProprio` (DEC-109): a lista mostra o aviso de idade dela, e o do
// cliente quando só ELE veio do espelho — a faixa não repete.
//
// Quem TIRA o parâmetro é o × do chip (`remover`, só o `clienteId`, como o
// do processo) e o "Limpar filtros" da lista (`extrasNaLimpeza`). Os dois
// mudam a assinatura dos filtros na URL, e a lista volta à página 1.
// ═══════════════════════════════════════════════════════════════════════════
export default function useClienteFiltrado({ avisoProprio = false } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const clienteId = searchParams.get('clienteId') || null;

  const { data: cliente, loading, fromCache, updatedAt } = useCachedResource({
    resource: 'client',
    params: { id: clienteId },
    fetcher: () => clientService.getClientById(clienteId).then((res) => res.data),
    fallbackError: 'Falha ao carregar o cliente do filtro.',
    enabled: Boolean(clienteId),
  });

  usePublicarContexto({ clienteId, avisoProprio });

  const remover = useCallback(() => {
    setSearchParams((atual) => {
      const proximo = new URLSearchParams(atual);
      proximo.delete('clienteId');
      return proximo;
    }, { preventScrollReset: true });
  }, [setSearchParams]);

  return {
    clienteId,
    rotulo: clienteId && cliente ? nomeDoCliente(cliente) : null,
    carregando: Boolean(clienteId) && loading,
    fromCache: Boolean(clienteId) && fromCache,
    updatedAt,
    remover,
  };
}
