// ═══════════════════════════════════════════════════════════════════════════
// Preparo das séries dos gráficos do dashboard (Fase 4.3).
//
// Funções PURAS, fora do componente, pelo mesmo motivo de `utils/feeCalc.js`:
// a suíte é `node --test` sem DOM, e regra dentro de JSX só se testaria por
// varredura de texto — que prova que a linha existe, não que a série está
// certa.
//
// Nada aqui recalcula dinheiro. O que estas funções fazem é decidir quais
// pontos o eixo mostra e em que ordem, que é decisão de EXIBIÇÃO.
// ═══════════════════════════════════════════════════════════════════════════

const MESES_DO_GRAFICO = 6;

const chaveDoMes = (ano, mes) => `${ano}-${String(mes + 1).padStart(2, '0')}`;

// `GET /api/dashboard/honorarios-por-mes` devolve só os meses que TÊM
// honorário — um mês sem cadastro simplesmente não vem. Desenhar direto o que
// chega produz um eixo com buracos: fevereiro ao lado de maio, com a mesma
// distância de dois meses consecutivos, sugerindo uma queda que não existe.
//
// Aqui a janela é reconstruída inteira, do mês de referência para trás, e o
// mês sem dado entra com `total: 0`. Zero é o valor verdadeiro: nenhum
// honorário foi contratado naquele mês.
//
// `referencia` é uma `Date`; a janela é lida em UTC, como o backend a recorta.
export const preencherMeses = (dados, referencia = new Date(), meses = MESES_DO_GRAFICO) => {
  const porChave = new Map(
    (Array.isArray(dados) ? dados : []).map((d) => [d.mes, Number(d.total) || 0])
  );

  const ano = referencia.getUTCFullYear();
  const mes = referencia.getUTCMonth();

  const serie = [];
  for (let i = meses - 1; i >= 0; i -= 1) {
    // `Date.UTC` normaliza a virada de ano sozinho: mês -1 em janeiro cai em
    // dezembro do ano anterior.
    const d = new Date(Date.UTC(ano, mes - i, 1));
    const chave = chaveDoMes(d.getUTCFullYear(), d.getUTCMonth());
    serie.push({ mes: chave, total: porChave.get(chave) ?? 0 });
  }
  return serie;
};

// `{ pendente: 3, pago: 1 }` → `[{ name: 'pendente', value: 3, percentual: 75 }, …]`
//
// O percentual sai daqui, e não do tooltip, porque o tooltip do Recharts
// recebe uma fatia de cada vez e não conhece o total — calcular lá dentro
// exigiria fechar sobre a série, que é justamente o tipo de conta escondida
// dentro do JSX que esta camada existe para evitar.
//
// Ordenado do maior para o menor: numa legenda de quatro linhas, é a ordem que
// responde "onde está a maior parte" sem obrigar a comparar fatias.
export const toChartData = (contagens) => {
  const entradas = Object.entries(contagens || {})
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
    .filter((d) => d.value > 0);

  const total = entradas.reduce((soma, d) => soma + d.value, 0);
  if (total === 0) return [];

  return entradas
    .sort((a, b) => b.value - a.value)
    .map((d) => ({ ...d, percentual: Math.round((d.value / total) * 1000) / 10 }));
};
