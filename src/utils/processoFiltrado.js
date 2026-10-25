// ═══════════════════════════════════════════════════════════════════════════
// O PROCESSO DO FILTRO `?processoId=` — Fase 0 (DEC-070)
//
// As listas de honorários, parcelas, pagamentos e documentos são abertas pelas
// abas do processo com `?processoId=` na URL, e filtravam por ele SEM DIZER: a
// advogada via uma lista curta e lia "o escritório tem três honorários".
//
// Funções puras, testadas como funções puras — a suíte não tem DOM. Quem busca
// o processo é `hooks/useProcessoFiltrado.js`; quem desenha é
// `components/ui/ProcessFilterChip.jsx`.
// ═══════════════════════════════════════════════════════════════════════════

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// "0001234-56.2024.8.16.0001 — Ação de cobrança". Processo sem número (o campo
// é opcional) sai só com o título, e vice-versa. `null` quando não há nada a
// nomear — e quem chama decide o que dizer, em vez de esta função inventar.
export const rotuloDoProcessoFiltrado = (processo) => {
  const numero = texto(processo?.numeroProcesso);
  const titulo = texto(processo?.titulo);
  if (numero && titulo) return `${numero} — ${titulo}`;
  return numero || titulo || null;
};

// O trecho que entra em `descricaoDoRecorteFinanceiro`. Sem rótulo (o processo
// ainda não carregou, ou não carregou sem sinal), "deste processo" continua
// verdadeiro; inventar um nome não.
export const trechoDoProcessoFiltrado = (rotulo) =>
  rotulo ? `do processo "${rotulo}"` : 'deste processo';

export default { rotuloDoProcessoFiltrado, trechoDoProcessoFiltrado };
