import { X } from 'lucide-react';
import './ProcessFilterChip.css';

// ═══════════════════════════════════════════════════════════════════════════
// O CHIP DO FILTRO DE PROCESSO — Fase 0 (DEC-070)
//
// "Processo: 0001234-56.2024.8.16.0001 — Ação de cobrança ×". Existe para a
// lista aberta pela aba do processo DIZER que está recortada, e para o recorte
// poder ser desfeito ali mesmo.
//
// O × é um `<button>` com rótulo próprio: "×" lido por leitor de tela é
// "multiplicação". Estilo mínimo de propósito — o visual vem na Fase 1.
//
// ── Fase 2b (DEC-085): o chip diz o RECORTE, a faixa diz o processo ──────
// Desde a Fase 2b a lista filtrada tem a faixa de contexto em cima, com
// "Cliente: … · Processo: 0001234… — Título" e o Voltar para o processo.
// Repetir o número e o título aqui seria a mesma informação duas vezes, a
// quatro centímetros uma da outra. O chip passa a dizer o que só ele diz —
// que a lista está RECORTADA — e continua sendo o único jeito de desfazer o
// recorte. O rótulo do processo fica no `title`, para quem passar o mouse.
// ═══════════════════════════════════════════════════════════════════════════

export default function ProcessFilterChip({ rotulo, carregando = false, onRemover }) {
  const dica = rotulo || (carregando ? 'carregando…' : 'processo selecionado');

  return (
    <p className="filtro-processo" role="status" title={`Processo: ${dica}`}>
      <span className="filtro-processo__rotulo">Filtro:</span>{' '}
      <span className="filtro-processo__valor">só este processo</span>
      <button
        type="button"
        className="filtro-processo__remover"
        onClick={onRemover}
        aria-label="Remover o filtro de processo"
        title="Remover o filtro de processo"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </p>
  );
}
