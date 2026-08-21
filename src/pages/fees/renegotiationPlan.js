// ═══════════════════════════════════════════════════════════════════════════
// AS CONTAS DO PLANO NOVO — Fase F-1c.2 (DEC-049)
//
// Função pura, fora do componente, pela razão de sempre neste projeto: a suíte
// é `node --test` sem DOM (Fase 2E.2), e conta feita dentro do JSX só se
// testaria por varredura de texto — que prova que a linha existe, não que ela
// calcula certo.
//
// E aqui há conta de dinheiro, que é a que não pode errar em silêncio: a
// divisão de um saldo que raramente é exato, a data que não existe no mês, e a
// diferença entre o que o plano soma e o que o honorário deve.
//
// ── Tudo em CENTAVOS, por dentro ─────────────────────────────────────────
// Somar float acumula resíduo, e resíduo aqui é a advogada montando um plano
// que soma "R$ 6.000,00" na tela e é recusado com 422 por um centavo que ela
// não vê. O backend compara com `emCentavos` (`Math.round(n * 100) / 100`), e
// esta folha faz a mesma coisa.
// ═══════════════════════════════════════════════════════════════════════════

// Reais → centavos inteiros, e de volta. O par tem de ser exato: é ele que faz
// a soma da tela bater com a soma do backend.
export const paraCentavos = (valor) => Math.round(Number(valor || 0) * 100);
export const paraReais = (centavos) => Math.round(Number(centavos || 0)) / 100;

// ═══════════════════════════════════════════════════════════════════════════
// 1 — A DIVISÃO DO SALDO
// ═══════════════════════════════════════════════════════════════════════════
//
// ── A SOBRA VAI PARA A PRIMEIRA PARCELA ─────────────────────────────────
// R$ 1.000,00 em 3 não dá três parcelas iguais. Alguém fica com o centavo.
//
// Vai para a PRIMEIRA, e isso é decisão de negócio, não de arredondamento: o
// cliente paga o valor quebrado agora e o resto é redondo — "R$ 333,34 e mais
// duas de R$ 333,33" se combina no telefone melhor que o contrário, e as
// parcelas que ainda vão vencer são as fáceis de conferir.
//
// A alternativa (sobra na última) deixa a quebra para o fim, quando ninguém
// mais lembra por que aquele valor é diferente — e é justamente a última que
// costuma ser renegociada de novo.
//
// A linha continua EDITÁVEL na tela: esta função propõe, a advogada decide.
export const dividirSaldo = (saldo, quantidade) => {
  const total = paraCentavos(saldo);
  const n = Math.floor(Number(quantidade));

  if (!Number.isFinite(n) || n <= 0) return [];

  // Saldo que não dá UM CENTAVO por parcela não é plano. Sem esta guarda,
  // R$ 0,02 em 3 devolvia `[0.02, 0, 0]` — e o backend recusaria com
  // "parcelas[1].valor deve ser maior que zero", num 400 que a tela tinha
  // todos os dados para evitar. Devolver vazio faz a tela dizer o que está
  // errado (o saldo não comporta tantas parcelas) em vez de propor linhas que
  // já nascem inválidas.
  if (total <= 0 || total < n) return [];

  const base = Math.floor(total / n);
  const sobra = total - base * n;

  return Array.from({ length: n }, (_, i) => paraReais(i === 0 ? base + sobra : base));
};

// ═══════════════════════════════════════════════════════════════════════════
// 2 — OS VENCIMENTOS
// ═══════════════════════════════════════════════════════════════════════════

// O último dia do mês. `Date.UTC(ano, mes + 1, 0)` é o dia 0 do mês seguinte,
// que é o último do mês pedido — e resolve fevereiro bissexto de graça.
const ultimoDiaDoMes = (ano, mes) => new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();

// `AAAA-MM-DD` a partir das partes, em UTC. As datas do projeto são gravadas
// como meia-noite UTC; montar a string com `toISOString` de um `Date` local
// devolveria o dia anterior em fuso negativo — que é o Brasil inteiro.
const iso = (ano, mes, dia) =>
  `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

// Os vencimentos do plano, a partir do primeiro, de `intervaloMeses` em
// `intervaloMeses`.
//
// ── O DIA 31 NÃO PULA PARA O MÊS SEGUINTE ───────────────────────────────
// Somar mês a mês com `setMonth` faz 31/01 + 1 mês virar **03/03**: o
// navegador transborda o dia que não existe em fevereiro para março. Uma
// parcela que deveria vencer em fevereiro passaria a vencer em março, e a
// advogada só descobriria pela cobrança que não saiu.
//
// Aqui o dia é PRESO ao último do mês de destino: 31/01 → 28/02 (ou 29), 31/03
// → 30/04. O dia original é reaplicado a cada linha a partir do primeiro
// vencimento — e não do anterior —, senão 31/01 viraria 28/02 e depois 28/03,
// arrastando o erro para sempre.
export const gerarVencimentos = (primeiroVencimento, quantidade, intervaloMeses = 1) => {
  const n = Math.floor(Number(quantidade));
  if (!Number.isFinite(n) || n <= 0) return [];

  const partes = String(primeiroVencimento ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!partes) return [];

  const anoBase = Number(partes[1]);
  const mesBase = Number(partes[2]) - 1;
  const diaBase = Number(partes[3]);

  const passo = Math.floor(Number(intervaloMeses));
  const intervalo = Number.isFinite(passo) && passo > 0 ? passo : 1;

  return Array.from({ length: n }, (_, i) => {
    const totalMeses = mesBase + i * intervalo;
    const ano = anoBase + Math.floor(totalMeses / 12);
    const mes = ((totalMeses % 12) + 12) % 12;
    return iso(ano, mes, Math.min(diaBase, ultimoDiaDoMes(ano, mes)));
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// 3 — O PLANO INTEIRO, E A DIFERENÇA
// ═══════════════════════════════════════════════════════════════════════════

// As linhas propostas: valor dividido e vencimento gerado, emparelhados.
export const montarPlano = ({ saldo, quantidade, primeiroVencimento, intervaloMeses = 1 }) => {
  const valores = dividirSaldo(saldo, quantidade);
  const datas = gerarVencimentos(primeiroVencimento, quantidade, intervaloMeses);
  if (valores.length === 0 || datas.length !== valores.length) return [];
  return valores.map((valor, i) => ({ valor, dataVencimento: datas[i] }));
};

export const somaDoPlano = (linhas = []) =>
  paraReais(linhas.reduce((total, l) => total + paraCentavos(l?.valor), 0));

// A comparação que decide se o botão pode ser apertado.
//
// ── A DIFERENÇA É NOMEADA EM REAIS ──────────────────────────────────────
// "faltam R$ 250,00" / "sobram R$ 100,00" — nunca só um sinal vermelho. A
// advogada precisa saber QUANTO ajustar, não que errou: um aviso que diz
// apenas "valor inválido" a obriga a refazer a conta à mão, que é exatamente o
// trabalho que esta tela existe para tirar dela.
export const diferencaDoPlano = (linhas, saldo) => {
  const somaCent = paraCentavos(somaDoPlano(linhas));
  const saldoCent = paraCentavos(saldo);
  const difCent = somaCent - saldoCent;

  return {
    soma: paraReais(somaCent),
    saldo: paraReais(saldoCent),
    diferenca: paraReais(Math.abs(difCent)),
    // `fecha` é o que habilita o botão. Comparação de INTEIROS: `0.1 + 0.2 !==
    // 0.3` em float, e o plano de três parcelas cairia nesse buraco.
    fecha: difCent === 0,
    sentido: difCent === 0 ? "exato" : difCent < 0 ? "faltam" : "sobram"
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// 4 — O QUE SAI E O QUE FICA
// ═══════════════════════════════════════════════════════════════════════════
//
// Derivado das parcelas que a página do honorário já carrega — nenhuma leitura
// nova, nenhum campo novo no backend (Parte 3 da fase).
//
// A regra é a MESMA do `renegotiationService`: sai o que não está `pago` nem
// `cancelado`. A parcela PARCIAL sai — o que já foi alocado nela fica como
// histórico, e só o que faltava entra no saldo renegociado.
//
// ── A lista do que FICA é o ponto da tela ───────────────────────────────
// Sem ela, a advogada não tem como saber se reparcelar apaga o que o cliente
// já pagou — e, na dúvida, não aperta o botão. **A ausência dessa lista é o
// que faz uma função existir e não ser usada.**
export const particionarParcelas = (parcelas = []) => {
  const vivas = parcelas.filter((p) => p?.status !== "cancelado" && p?.ativo !== false);
  return {
    saem: vivas.filter((p) => p.status !== "pago"),
    ficam: vivas.filter((p) => p.status === "pago")
  };
};

export default {
  paraCentavos,
  paraReais,
  dividirSaldo,
  gerarVencimentos,
  montarPlano,
  somaDoPlano,
  diferencaDoPlano,
  particionarParcelas
};
