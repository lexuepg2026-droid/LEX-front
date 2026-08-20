import React from 'react';
import { resumoDaPagina, frasePosicao } from './paginacao.js';
import './Paginador.css';

// ═══════════════════════════════════════════════════════════════════════════
// PAGINADOR — Fase F-1b.3
//
// ── O que ele substitui ──────────────────────────────────────────────────
// O arranjo da F-0: pedir 100 (o teto da API) e escrever "Mostrando 100 de
// 137. Use os filtros para reduzir o conjunto." Aquilo era honesto e não era
// navegação — a advogada com 137 pagamentos não tinha como chegar no 101º, e
// a instrução ("use os filtros") só funcionava se ela soubesse qual filtro.
//
// ── Zero dependência, e por quê ──────────────────────────────────────────
// Regra do projeto. Um paginador é dois botões, um rótulo e três contas —
// todas em `paginacao.js`, testadas como função pura. Uma biblioteca aqui
// traria roteamento, ícones e temas que o projeto não usa.
//
// ── Genérico o bastante para a próxima listagem ──────────────────────────
// Não sabe o que é pagamento, parcela ou honorário: recebe `page`, `total`,
// `limit`, um `rotulo` para o plural e um `onMudarPagina`. As listagens não
// financeiras (clientes, processos, seções) podem passar a usá-lo sem mudar
// uma linha daqui — a F-1b.3 deliberadamente NÃO as converte, porque converter
// tela que ninguém pediu é o trabalho que some no meio de outro.
//
// ── Acessibilidade ───────────────────────────────────────────────────────
// `<nav>` com `aria-label`, botões de verdade (não `<div onClick>`), estado de
// borda em `disabled` — e `:focus-visible` vem da regra global, que este
// componente não sobrescreve. A posição atual sai em `aria-live="polite"`:
// quem navega por leitor de tela precisa ouvir que a página mudou, e sem isso
// a única mudança seria a tabela abaixo, silenciosa.
// ═══════════════════════════════════════════════════════════════════════════

// `rotulo` é o nome do item no SINGULAR — "pagamento", "parcela",
// "honorário", "movimentação". A concordância com a quantidade é de
// `frasePosicao`/`pluralizar`, e não do chamador (F-1b.3.1).
function Paginador({ page = 1, limit = 20, total = 0, rotulo = 'registro', onMudarPagina }) {
  const resumo = resumoDaPagina({ page, limit, total });

  // Uma página só: não há para onde navegar, e um paginador com os dois botões
  // desabilitados é ruído que ocupa a mesma linha do estado vazio. O TOTAL
  // continua visível — é ele que responde "esta lista é curta ou está
  // filtrada?", que é a pergunta da Parte 4.
  const navegavel = resumo.totalPages > 1;

  const ir = (destino) => {
    if (destino < 1 || destino > resumo.totalPages || destino === resumo.page) return;
    onMudarPagina(destino);
  };

  return (
    <nav className="paginador" aria-label="Paginação">
      <p className="paginador__posicao" aria-live="polite">
        {frasePosicao(resumo, rotulo)}
      </p>

      {navegavel && (
        <div className="paginador__controles">
          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm"
            onClick={() => ir(resumo.page - 1)}
            disabled={!resumo.temAnterior}
          >
            ‹ Anterior
          </button>

          <span className="paginador__contador">
            Página {resumo.page} de {resumo.totalPages}
          </span>

          <button
            type="button"
            className="ui-btn ui-btn--secondary ui-btn--sm"
            onClick={() => ir(resumo.page + 1)}
            disabled={!resumo.temProxima}
          >
            Próxima ›
          </button>
        </div>
      )}
    </nav>
  );
}

export default Paginador;
