import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════════════════════
// VOLTA AO TOPO AO TROCAR DE PÁGINA (Fase 2a, item 5)
//
// O React Router troca a tela e deixa a rolagem onde estava: abrir um processo
// a partir do fim da lista abria o detalhe já rolado, e a advogada via o meio
// de uma tela que não conhecia.
//
// Só o PATHNAME dispara, nunca a query: filtro, página da listagem e mês da
// agenda vivem em `?…`, e trocar o mês não pode jogar a agenda para o topo.
//
// QUEM rola depende de onde se está:
//   - na área da advogada, `.main-content` (o `window` não rola: `AppLayout.css`);
//   - nas páginas públicas e no portal, o `window`.
//
// Rolagem instantânea, sem `smooth`: numa troca de página a animação seria
// movimento sem significado, e com `prefers-reduced-motion` ela é proibida de
// qualquer jeito. Não há preferência a consultar quando nunca se anima.
// ═══════════════════════════════════════════════════════════════════════════
function VoltarAoTopo({ seletor = null }) {
  const { pathname } = useLocation();

  useEffect(() => {
    const alvo = seletor ? document.querySelector(seletor) : window;
    alvo?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, seletor]);

  return null;
}

export default VoltarAoTopo;
