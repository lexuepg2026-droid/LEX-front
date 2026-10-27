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

// ── Fase 3.5 (DEC-124): o mesmo chip para o filtro de CLIENTE ─────────────
// A lista de processos aberta pela aba "Processos" do cliente
// (`?clienteId=`) diz o recorte do mesmo jeito: "Filtro: só este cliente ×",
// com o nome no `title` e o cliente na faixa. `alvo` só troca a palavra; o
// padrão continua sendo o processo, e as quatro listas não mudam.
const ALVOS = {
  processo: { titulo: 'Processo', padrao: 'processo selecionado' },
  cliente: { titulo: 'Cliente', padrao: 'cliente selecionado' },
};

export default function ProcessFilterChip({ rotulo, carregando = false, onRemover, alvo = 'processo' }) {
  const { titulo, padrao } = ALVOS[alvo] ?? ALVOS.processo;
  const dica = rotulo || (carregando ? 'carregando…' : padrao);
  const nome = ALVOS[alvo] ? alvo : 'processo';

  return (
    <p className="filtro-processo" role="status" title={`${titulo}: ${dica}`}>
      <span className="filtro-processo__rotulo">Filtro:</span>{' '}
      <span className="filtro-processo__valor">só este {nome}</span>
      <button
        type="button"
        className="filtro-processo__remover"
        onClick={onRemover}
        aria-label={`Remover o filtro de ${nome}`}
        title={`Remover o filtro de ${nome}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </p>
  );
}
