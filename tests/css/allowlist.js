// Exceções da varredura de classe CSS.
//
// REGRA: cada entrada tem uma linha de justificativa escrita à mão. Entrada
// sem motivo não é aceitável — allowlist cega deixa de ser exceção e vira
// forma de calar o teste, e aí ele para de valer.
//
// O que PODE entrar aqui:
//   - classe de biblioteca de terceiro, ou vinda de fora do `src/`;
//   - classe aplicada por CSS que não é do projeto.
//
// O que NÃO pode entrar aqui, e é defeito a corrigir:
//   - classe aplicada sem nenhuma regra em lugar nenhum;
//   - regra que existe mas em CSS não importado pela página — é exatamente o
//     caso do `.input-error` que originou esta varredura.

export const ALLOWLIST = {
  // ── Global, para qualquer página ─────────────────────────────────────────
  // Chave: nome da classe. Valor: o motivo.
  global: {
    // `lucide-react` estiliza os próprios ícones; a classe entra por prop
    // `className` do componente e é resolvida pelo CSS do pacote, fora do src/.
    "lucide": "classe do lucide-react, resolvida pelo CSS do próprio pacote"
  },

  // ── Por página ───────────────────────────────────────────────────────────
  // Chave: caminho relativo à raiz do repositório.
  porPagina: {}
};

// Prefixos de classe montada por template string que a varredura deve aceitar
// sem exigir regra — usados quando NEM O PREFIXO tem regra por motivo legítimo.
// Hoje vazio de propósito: os 5 prefixos em uso no projeto
// (`montagem__cabecalho--`, `status-badge--`, `summary-card--`, `toast--`,
// `ui-btn--`) têm regra de verdade e passam sem exceção nenhuma.
export const PREFIXOS_ACEITOS = {};

export default ALLOWLIST;
