// ═══════════════════════════════════════════════════════════════════════════
// FASE F-1c.2 — A TELA DO REPARCELAMENTO (DEC-049)
//
// ── O que ela liga ───────────────────────────────────────────────────────
// O backend reparcela desde a DEC-037. A página do honorário tinha um botão
// "Reparcelar" DESABILITADO desde a F-1b, com a promessa de que a tela
// chegaria. **Botão morto numa demonstração é promessa quebrada.**
//
// ── O que dá para provar sem DOM ─────────────────────────────────────────
// A suíte é `node --test` sem renderizador (Fase 2E.2). Não dá para provar que
// a soma corrente fica visível ao rolar, nem que a advogada entende a lista do
// que fica — isso é o roteiro, passos 185 a 187.
//
// Dá para provar as CONTAS, que são onde o dinheiro erra em silêncio: a
// divisão do saldo com a sobra na primeira, a data que não existe no mês, e a
// diferença que decide se o botão pode ser apertado. E dá para provar as
// LIGAÇÕES estruturais: que o botão não é habilitável com soma diferente, que
// o erro vem do helper e não de texto inventado, e que o rótulo da parcela
// continua saindo da função única da DEC-048.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  dividirSaldo,
  gerarVencimentos,
  montarPlano,
  somaDoPlano,
  diferencaDoPlano,
  particionarParcelas
} from "../../src/pages/fees/renegotiationPlan.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const tela = semComentarios(ler("src/pages/fees/FeeRenegotiationPage.jsx"));

// ═══════════════════════════════════════════════════════════════════════════
// 1 — A DIVISÃO DO SALDO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1c.2 — a divisão do saldo", () => {
  test("divisão exata: todas iguais", () => {
    assert.deepEqual(dividirSaldo(900, 3), [300, 300, 300]);
  });

  test("🚨 divisão com sobra: a sobra vai para a PRIMEIRA", () => {
    // R$ 1.000,00 em 3 não dá três iguais. O cliente paga o valor quebrado
    // AGORA e o resto é redondo — combina melhor no telefone, e as parcelas
    // que ainda vão vencer são as fáceis de conferir.
    const linhas = dividirSaldo(1000, 3);
    assert.deepEqual(linhas, [333.34, 333.33, 333.33]);
    assert.ok(
      linhas[0] > linhas[1],
      "a sobra tem de ficar na primeira parcela, não na última"
    );
  });

  test("a soma da divisão bate com o saldo, ao centavo", () => {
    // É o que impede o 422: o backend compara inteiros de centavo.
    for (const [saldo, n] of [[1000, 3], [6000, 7], [0.03, 3], [1234.56, 5], [99.99, 4]]) {
      const soma = somaDoPlano(dividirSaldo(saldo, n).map((valor) => ({ valor })));
      assert.equal(soma, saldo, `${saldo} em ${n} não fechou`);
    }
  });

  test("uma parcela só recebe o saldo inteiro", () => {
    assert.deepEqual(dividirSaldo(1000, 1), [1000]);
  });

  test("saldo de centavos: divide enquanto cada parcela receber ao menos 1", () => {
    assert.deepEqual(dividirSaldo(0.03, 3), [0.01, 0.01, 0.01]);
  });

  test("saldo que NÃO comporta a quantidade devolve vazio", () => {
    // Sem esta guarda, R$ 0,02 em 3 propunha `[0.02, 0, 0]` — e o backend
    // recusaria com "valor deve ser maior que zero", num 400 que a tela tinha
    // todos os dados para evitar.
    assert.deepEqual(dividirSaldo(0.02, 3), []);
    assert.deepEqual(dividirSaldo(0, 3), []);
    assert.deepEqual(dividirSaldo(1000, 0), []);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — OS VENCIMENTOS
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1c.2 — a geração de vencimentos", () => {
  test("🚨 dia 31 em mês de 30 cai no ÚLTIMO dia, nunca no mês seguinte", () => {
    // `setMonth` faria 31/01 + 1 mês virar 03/03: o navegador transborda o dia
    // que não existe. Uma parcela que devia vencer em fevereiro passaria a
    // vencer em março, e a advogada só descobriria pela cobrança que não saiu.
    assert.deepEqual(
      gerarVencimentos("2026-01-31", 4, 1),
      ["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]
    );
  });

  test("fevereiro bissexto ganha o dia 29", () => {
    assert.deepEqual(gerarVencimentos("2028-01-31", 2, 1), ["2028-01-31", "2028-02-29"]);
  });

  test("o dia original é reaplicado, e não arrastado", () => {
    // Se cada linha partisse da anterior, 31/01 viraria 28/02 e depois 28/03 —
    // o erro se propagaria para sempre. Março volta a 31.
    const datas = gerarVencimentos("2026-01-31", 3, 1);
    assert.equal(datas[2], "2026-03-31");
  });

  test("virada de ano", () => {
    assert.deepEqual(
      gerarVencimentos("2026-11-15", 4, 1),
      ["2026-11-15", "2026-12-15", "2027-01-15", "2027-02-15"]
    );
  });

  test("intervalo diferente de mensal", () => {
    assert.deepEqual(
      gerarVencimentos("2026-01-15", 3, 3),
      ["2026-01-15", "2026-04-15", "2026-07-15"]
    );
    assert.deepEqual(
      gerarVencimentos("2026-01-15", 2, 12),
      ["2026-01-15", "2027-01-15"]
    );
  });

  test("data inválida devolve vazio em vez de `Invalid Date`", () => {
    assert.deepEqual(gerarVencimentos("", 3, 1), []);
    assert.deepEqual(gerarVencimentos("15/09/2026", 3, 1), []);
    assert.deepEqual(gerarVencimentos(null, 3, 1), []);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — A DIFERENÇA QUE DECIDE O BOTÃO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1c.2 — a soma corrente", () => {
  test("a diferença sai com SENTIDO e VALOR, nunca só um sinal", () => {
    // "faltam R$ 250,00" — a advogada precisa saber QUANTO ajustar, não que
    // errou. Um aviso que diz só "valor inválido" a obriga a refazer a conta à
    // mão, que é o trabalho que esta tela existe para tirar dela.
    const faltando = diferencaDoPlano([{ valor: 100 }], 350);
    assert.equal(faltando.sentido, "faltam");
    assert.equal(faltando.diferenca, 250);
    assert.equal(faltando.fecha, false);

    const sobrando = diferencaDoPlano([{ valor: 400 }], 350);
    assert.equal(sobrando.sentido, "sobram");
    assert.equal(sobrando.diferenca, 50);
    assert.equal(sobrando.fecha, false);
  });

  test("o plano gerado fecha com o saldo", () => {
    const linhas = montarPlano({
      saldo: 1000, quantidade: 3, primeiroVencimento: "2026-09-15", intervaloMeses: 1
    });
    const d = diferencaDoPlano(linhas, 1000);
    assert.equal(d.fecha, true);
    assert.equal(d.sentido, "exato");
    assert.equal(d.diferenca, 0);
  });

  test("a comparação é de INTEIROS de centavo, não de float", () => {
    // `0.1 + 0.2 !== 0.3`. Um plano de três parcelas cairia nesse buraco e o
    // botão ficaria desabilitado com a tela dizendo que a soma fecha.
    const d = diferencaDoPlano([{ valor: 0.1 }, { valor: 0.2 }], 0.3);
    assert.equal(d.fecha, true, "0,10 + 0,20 tem de fechar com 0,30");
  });

  test("plano vazio não fecha com saldo positivo", () => {
    assert.equal(diferencaDoPlano([], 1000).fecha, false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 — O QUE SAI E O QUE FICA
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1c.2 — a partição das parcelas", () => {
  const parcelas = [
    { _id: "a", numeroParcela: 1, status: "pago", ativo: true },
    { _id: "b", numeroParcela: 2, status: "parcial", ativo: true },
    { _id: "c", numeroParcela: 3, status: "pendente", ativo: true },
    { _id: "d", numeroParcela: 4, status: "vencido", ativo: true },
    { _id: "e", numeroParcela: 5, status: "cancelado", ativo: true },
    { _id: "f", numeroParcela: 6, status: "pendente", ativo: false }
  ];

  test("sai o que não está pago nem cancelado — a MESMA regra do backend", () => {
    const { saem } = particionarParcelas(parcelas);
    assert.deepEqual(saem.map((p) => p._id), ["b", "c", "d"]);
  });

  test("a PARCIAL sai, e é isso que o backend faz", () => {
    // O que já foi alocado nela fica como histórico; só o que faltava entra no
    // saldo renegociado.
    const { saem } = particionarParcelas(parcelas);
    assert.ok(saem.some((p) => p.status === "parcial"));
  });

  test("🚨 a PAGA fica, e é a lista que faz a função ser usada", () => {
    // Sem a lista do que fica, a advogada não tem como saber se reparcelar
    // apaga o que o cliente já pagou — e, na dúvida, não aperta o botão.
    const { ficam } = particionarParcelas(parcelas);
    assert.deepEqual(ficam.map((p) => p._id), ["a"]);
  });

  test("cancelada e desativada não entram em lista nenhuma", () => {
    const { saem, ficam } = particionarParcelas(parcelas);
    const todos = [...saem, ...ficam].map((p) => p._id);
    assert.ok(!todos.includes("e"), "a cancelada já saiu num reparcelamento anterior");
    assert.ok(!todos.includes("f"), "a desativada não é cobrança viva");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 — A TELA
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1c.2 — as ligações da tela", () => {
  test("🚨 o botão de confirmar NÃO é habilitável com soma diferente do saldo", () => {
    // `impedimento` é uma string quando algo bloqueia, e o `disabled` do botão
    // é `Boolean(impedimento)`. Se alguém trocar por uma condição própria, esta
    // varredura cai.
    assert.match(
      tela, /disabled=\{Boolean\(impedimento\) \|\| salvando\}/,
      "o botão precisa depender do impedimento calculado"
    );
    assert.match(
      tela, /if \(!diferenca\.fecha\)/,
      "a soma divergente precisa ser um impedimento"
    );
  });

  test("a diferença é nomeada em reais no impedimento e na soma", () => {
    assert.match(tela, /diferenca\.sentido/, "o sentido entra na frase");
    assert.match(
      tela, /formatCurrency\(diferenca\.diferenca\)/,
      "o VALOR da diferença precisa aparecer — nunca só um sinal vermelho"
    );
  });

  test("o saldo vem de `totais.emAberto`, e não de conta própria", () => {
    // É a MESMA fórmula que o backend usa para validar. Recalcular aqui abriria
    // a segunda fonte de verdade que a F-1b fechou, e a divergência apareceria
    // como um 422 num plano que a tela dizia estar certo.
    assert.match(tela, /honorario\?\.totais\?\.emAberto/);
    assert.ok(
      !/contratado\s*-\s*|valorPago\s*\)\s*,\s*0\)/.test(tela.replace(/somaQueSai[\s\S]{0,200}/, "")),
      "a tela não pode recalcular o saldo em aberto"
    );
  });

  test("o erro vem de `getFinancialErrorMessage`", () => {
    assert.match(tela, /getFinancialErrorMessage\(err/);
    // Nenhum texto de erro do servidor escrito à mão na tela.
    assert.ok(
      !/A soma das parcelas novas/.test(tela),
      "a tela não pode repetir a mensagem do 422 — ela vem do servidor"
    );
  });

  test("o rótulo da parcela vem da função única da DEC-048", () => {
    assert.match(
      tela, /import \{ rotuloNaLista \} from ['"][^'"]*installmentLabel['"]/,
      "o rótulo não pode ser montado aqui"
    );
    assert.ok(
      !/Parcela \{p\./.test(tela),
      "rótulo de parcela montado no JSX em vez de `installmentLabel`"
    );
  });

  test("o aviso do saldo adiantado existe (DEC-036)", () => {
    // Sem ele, a advogada monta um plano de três em aberto e encontra uma já
    // paga: o crédito se auto-aloca assim que as parcelas nascem.
    assert.match(tela, /saldoAdiantado > 0/);
    assert.match(tela, /saldo adiantado/i);
  });

  test("o motivo vazio envia `null`, nunca string vazia", () => {
    assert.match(tela, /motivo: motivo\.trim\(\) \|\| null/);
  });

  test("depois de gravar, volta para a página do honorário", () => {
    assert.match(tela, /navigate\(`\/dashboard\/honorarios\/\$\{id\}`\)/);
  });

  test("a rota existe e é dedicada (DEC-049), não um modal", () => {
    const rotas = semComentarios(ler("src/routes/AppRoutes.jsx"));
    assert.match(rotas, /honorarios\/:id\/reparcelar/);
    assert.match(rotas, /FeeRenegotiationPage/);
  });

  test("o botão da página do honorário DEIXOU de ser desabilitado", () => {
    const pagina = semComentarios(ler("src/pages/fees/FeeDetailPage.jsx"));
    assert.match(pagina, /honorarios\/\$\{id\}\/reparcelar/, "o botão precisa navegar");
    assert.ok(
      !/disabled\s*\n?\s*title="O reparcelamento/.test(pagina),
      "o botão morto continua na tela"
    );
    assert.ok(
      !/ainda não tem tela/.test(pagina),
      "a promessa de que a tela chegaria continua escrita depois de ela chegar"
    );
  });

  test("toda classe CSS aplicada tem regra na folha da própria tela", () => {
    const css = ler("src/pages/fees/FeeRenegotiationPage.css");
    const usadas = new Set();
    for (const m of tela.matchAll(/className="([^"{}]+)"/g)) {
      for (const c of m[1].split(/\s+/)) if (c.startsWith("reparcelar")) usadas.add(c);
    }
    assert.ok(usadas.size > 8, `poucas classes encontradas: ${usadas.size}`);
    for (const classe of usadas) {
      assert.ok(
        css.includes(`.${classe}`),
        `\`${classe}\` é aplicada e não tem regra em FeeRenegotiationPage.css`
      );
    }
  });
});
