import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import processService from '../api/processService';
import useCachedResource from './useCachedResource';
import { rotuloDoProcessoFiltrado } from '../utils/processoFiltrado';
import { usePublicarContexto } from '../contexts/ContextoContext';

// ═══════════════════════════════════════════════════════════════════════════
// O FILTRO DE PROCESSO QUE VEM DA URL — Fase 0 (DEC-070)
//
// Um hook só para as quatro listas que recebem `?processoId=`: as quatro liam
// o parâmetro e nenhuma o mostrava. Escrito uma vez porque é nas quatro cópias
// que a regra se perde — a última a ser escrita esquece de remover o parâmetro.
//
// O processo vem pelo MESMO recurso do detalhe do processo
// (`resource: 'process'`, `params: { id }`): é a mesma chave do espelho local
// (DEC-058), então quem abriu o processo com sinal vê o nome no chip sem sinal.
// ═══════════════════════════════════════════════════════════════════════════

export default function useProcessoFiltrado() {
  const [searchParams, setSearchParams] = useSearchParams();
  const processoId = searchParams.get('processoId') || null;

  const { data: processo, loading, fromCache, updatedAt } = useCachedResource({
    resource: 'process',
    params: { id: processoId },
    fetcher: () => processService.getProcessById(processoId).then((res) => res.data),
    fallbackError: 'Falha ao carregar o processo do filtro.',
    enabled: Boolean(processoId),
  });

  // Tira SÓ o `processoId` da URL. A consulta da lista depende dele, então a
  // lista se refaz sozinha — sem recarregar a página nem perder os outros
  // filtros, que vivem no estado da tela.
  // Fase 2b (DEC-085): a lista filtrada publica o processo para a faixa de
  // contexto — as quatro de uma vez, por aqui, que é onde as quatro já leem o
  // parâmetro. Removido o filtro, o id some e a faixa some junto.
  usePublicarContexto({ processoId });

  const remover = useCallback(() => {
    setSearchParams((atual) => {
      const proximo = new URLSearchParams(atual);
      proximo.delete('processoId');
      return proximo;
    });
  }, [setSearchParams]);

  return {
    processoId,
    rotulo: processoId ? rotuloDoProcessoFiltrado(processo) : null,
    carregando: Boolean(processoId) && loading,
    // Para a tela que não tem espelho próprio (documentos) dizer a idade do
    // nome que o chip mostra sem sinal — a regra da DEC-058.
    fromCache: Boolean(processoId) && fromCache,
    updatedAt,
    remover,
  };
}
