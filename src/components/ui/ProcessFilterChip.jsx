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
// ═══════════════════════════════════════════════════════════════════════════

export default function ProcessFilterChip({ rotulo, carregando = false, onRemover }) {
  const texto = rotulo || (carregando ? 'carregando…' : 'processo selecionado');

  return (
    <p className="filtro-processo" role="status">
      <span className="filtro-processo__rotulo">Processo:</span>{' '}
      <span className="filtro-processo__valor">{texto}</span>
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
