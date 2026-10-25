import processService from '../api/processService';
import clientService from '../api/clientService';
import useCachedResource from './useCachedResource';
import { contextoDoCliente, contextoDoProcesso } from '../components/layout/contexto.js';

// ═══════════════════════════════════════════════════════════════════════════
// O ID PUBLICADO VIRA TEXTO — pelo espelho, com as chaves do detalhe (DEC-085)
//
// `resource: 'process'` / `'client'` com `params: { id }` são EXATAMENTE as
// chaves de `ProcessDetailPage`, `ClientDetailPage` e `useProcessoFiltrado`
// (DEC-058, DEC-070). Não é coincidência: é o que faz a faixa aparecer sem
// sinal para quem já abriu aquele processo com sinal.
//
// Hook em `src/hooks/`, e por isso a varredura de `tests/offline/estatica.test.js`
// cobra o aviso de idade de QUEM o importa — a faixa —, como cobra das listas
// que importam `useProcessoFiltrado`.
// ═══════════════════════════════════════════════════════════════════════════
export default function useContextoResolvido({ processoId, clienteId }) {
  const processo = useCachedResource({
    resource: 'process',
    params: { id: processoId },
    fetcher: () => processService.getProcessById(processoId).then((res) => res.data),
    fallbackError: 'Não foi possível carregar o processo.',
    enabled: Boolean(processoId),
  });

  const cliente = useCachedResource({
    resource: 'client',
    params: { id: clienteId },
    fetcher: () => clientService.getClientById(clienteId).then((res) => res.data),
    fallbackError: 'Não foi possível carregar o cliente.',
    enabled: Boolean(clienteId) && !processoId,
  });

  const fonte = processoId ? processo : clienteId ? cliente : null;
  if (!fonte) return { contexto: null, carregando: false, fromCache: false, updatedAt: null };

  // O dado só vale se é do id pedido agora: o `data` do hook ainda é o do id
  // anterior no quadro em que o id muda (antes de o efeito rodar).
  const idPedido = String(processoId || clienteId);
  const dado = fonte.data && String(fonte.data._id) === idPedido ? fonte.data : null;

  return {
    contexto: processoId ? contextoDoProcesso(dado) : contextoDoCliente(dado),
    carregando: fonte.loading || (!dado && !fonte.error),
    fromCache: Boolean(dado) && fonte.fromCache,
    updatedAt: fonte.updatedAt,
  };
}
