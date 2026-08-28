import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import useOnlineStatus from './useOnlineStatus';
import { lerOnline } from '../offline/online';
import { readCached, writeCached } from '../offline/offlineCache';
import { decideSource } from '../offline/cachePolicy';
import { serializeParams } from '../offline/cacheKey';
import { isNetworkError, MENSAGEM_LEITURA_SEM_CACHE } from '../offline/offlineMessages';
import { getApiErrorMessage } from '../utils/apiError';

// ═══════════════════════════════════════════════════════════════════════════
// O CARREGAMENTO COM ESPELHO LOCAL — uma tela, três desfechos (F-5a, DEC-058)
//
// Substitui o `useEffect` + `service.getX().then(setX).catch(setErro)` que toda
// listagem repetia. O que ele acrescenta é o desfecho do meio:
//
//   1. **com sinal**  → busca no servidor, exibe e GUARDA (rede manda sempre;
//      cache-first com dado autenticado serviria o saldo do mês passado sem
//      ninguém pedir);
//   2. **sem sinal, com dado guardado** → exibe o guardado e devolve o
//      `atualizadoEm` para a tela dizer a idade (Parte 3 — a tela é obrigada a
//      dizer de quando é o que mostra);
//   3. **sem sinal, sem dado guardado** → a frase que explica que esta tela
//      ainda não foi aberta com sinal neste aparelho. Não é erro de rede, e
//      não é "não encontrado".
//
// **Ao voltar o sinal a tela se refaz sozinha**: `online` é dependência do
// efeito, então a subida do sinal reexecuta a busca e o aviso some sem que
// ninguém precise recarregar a página.
//
// ── O que ele NÃO faz ────────────────────────────────────────────────────
// Não grava offline, não enfileira nada, não resolve conflito. A F-5a é só
// leitura; a escrita é a F-5b inteira, e misturar as duas é o modo mais fácil
// de estragar as duas.
// ═══════════════════════════════════════════════════════════════════════════

export default function useCachedResource({
  resource,
  params,
  fetcher,
  fallbackError = 'Não foi possível carregar os dados.',
  // As telas financeiras traduzem o erro por `utils/financialErrors.js`, que
  // conhece os 409 e 422 do dinheiro. O hook não escolhe por elas: recebe o
  // tradutor e usa o que veio. O padrão é o helper geral do projeto — nenhuma
  // tela abre `err.response` por conta própria de qualquer forma.
  mapError = getApiErrorMessage,
  enabled = true,
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const online = useOnlineStatus();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [fromCache, setFromCache] = useState(false);
  const [versao, setVersao] = useState(0);

  // O `fetcher` é uma closure nova a cada render da tela; guardá-lo num ref é
  // o que impede o efeito de rodar por identidade de função em vez de por
  // mudança de consulta. Quem manda no efeito é a chave dos parâmetros.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // `serializeParams` é a MESMA função que monta a chave do cache: se duas
  // consultas têm a mesma chave, elas são a mesma consulta, e o efeito não tem
  // por que rodar duas vezes.
  const chaveParams = serializeParams(params);

  // ── `reload({ comSpinner: false })` ─────────────────────────────────────
  //
  // A releitura depois de um estorno é feita SEM spinner, por decisão da F-1b:
  // trocar a lista inteira por um `<Loading />` depois de um estorno faria a
  // advogada perder de vista a linha que ela acabou de mexer. O padrão
  // continua sendo com spinner — é o que a primeira carga precisa.
  const semSpinner = useRef(false);
  const reload = useCallback((opcoes = {}) => {
    semSpinner.current = opcoes.comSpinner === false;
    setVersao((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    // Sem usuário não há escopo, e sem escopo não há leitura nem escrita — a
    // regra 1 da fase. Acontece no instante entre montar a tela e o `/auth/me`
    // responder.
    if (!userId) return undefined;

    // `ativo` é local ao efeito, e não um ref: é o padrão que a Fase 4.4
    // registrou para carregamento (um ref preso em `false` pelo StrictMode
    // engoliria o `setData` em silêncio — ver `hooks/useIsMounted.js`).
    let ativo = true;

    const servirDoCache = async () => {
      const guardado = await readCached({ userId, resource, params });
      if (!ativo) return;

      if (decideSource({ online: false, hasCache: Boolean(guardado) }) === 'cache') {
        setData(guardado.valor);
        setUpdatedAt(guardado.atualizadoEm);
        setFromCache(true);
        setError('');
      } else {
        setData(null);
        setUpdatedAt(null);
        setFromCache(false);
        setError(MENSAGEM_LEITURA_SEM_CACHE);
      }
      setLoading(false);
    };

    const carregar = async () => {
      if (!semSpinner.current) setLoading(true);
      semSpinner.current = false;
      setError('');

      if (decideSource({ online, hasCache: false }) !== 'network') {
        await servirDoCache();
        return;
      }

      try {
        const valor = await fetcherRef.current();
        if (!ativo) return;

        setData(valor);
        setUpdatedAt(Date.now());
        setFromCache(false);
        setError('');
        setLoading(false);

        // Guardar é efeito colateral do que a advogada JÁ viu — guarda-se o
        // que passou pela tela, nunca o banco inteiro baixado por precaução.
        // Não se espera por ele: uma gravação lenta não pode segurar a tela,
        // e uma que falhe não pode derrubá-la.
        writeCached({ userId, resource, params, valor });
      } catch (err) {
        if (!ativo) return;

        // O sinal pode ter caído DURANTE a requisição. Reconsultar o navegador
        // aqui é o que faz a tela cair no espelho local em vez de mostrar um
        // erro de rede — que é justamente o "erro genérico" que a Parte 4
        // proíbe quando o app sabe que está offline.
        if (isNetworkError(err) && !lerOnline()) {
          await servirDoCache();
          return;
        }

        setData(null);
        setUpdatedAt(null);
        setFromCache(false);
        setError(mapError(err, fallbackError));
        setLoading(false);
      }
    };

    carregar();
    return () => { ativo = false; };
    // `params` entra pela chave serializada, e não por identidade: o objeto é
    // remontado a cada render da tela e derrubaria o efeito a cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, resource, chaveParams, online, versao, enabled, fallbackError, mapError]);

  return { data, loading, error, updatedAt, fromCache, reload };
}
