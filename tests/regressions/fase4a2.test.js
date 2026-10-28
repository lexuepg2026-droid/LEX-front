// ═══════════════════════════════════════════════════════════════════════════
// FASE 4a2 — ajustes pós-porte (DEC-160 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela e CSS é varrido como texto, sem comentários. As medidas de verdade (o
// valor dentro do cartão, a lista sem rolar) ficam na verificação do
// navegador, registrada no relatório da fase.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../..", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── Decisão 1 — o valor em reais nunca vaza do cartão (DEC-160) ─────────
describe("Fase 4a2 · decisão 1 — o valor em reais cabe no cartão (DEC-160)", () => {
  const css = semComentarios(ler("src/components/dashboard/CartaoDeResumo.css"));
  const regra = (seletor) => {
    const m = css.match(new RegExp(`(^|\\n)${seletor.replace(/[.]/g, "\\.")} \\{([^}]*)\\}`));
    assert.ok(m, `regra ${seletor} existe`);
    return m[2];
  };

  test("o cartão cresce: trilha mínima de 15rem, e uma coluna só numa grade mais estreita", () => {
    assert.match(regra(".summary-grid"), /grid-template-columns: repeat\(auto-fill, minmax\(min\(100%, 15rem\), 1fr\)\);/);
  });

  test("a fonte cede pela largura do cartão, com piso e teto de token", () => {
    assert.match(regra(".summary-card"), /container-type: inline-size;/);
    assert.match(regra(".card-value"), /font-size: clamp\(var\(--font-size-lg\), 11cqi, var\(--font-size-2xl\)\);/);
  });

  test("nunca reticências nem corte em dinheiro: o valor não quebra e nada o esconde", () => {
    const valor = regra(".card-value");
    assert.match(valor, /white-space: nowrap;/);
    assert.doesNotMatch(valor, /text-overflow|overflow\s*:/);
    assert.doesNotMatch(regra(".summary-card"), /overflow\s*:/);
  });

  test("nenhuma media query de largura de janela decide as colunas da grade", () => {
    assert.doesNotMatch(css, /@media[^{]*\{[^}]*\.summary-grid/);
  });

  test("16 caracteres cabem a 11cqi: a conta do comentário, executada", () => {
    // ~0,55 em por caractere, medido no navegador: "R$ 1.234.567,89" (15) =
    // 246 px a 30 px de fonte.
    const emPorCaractere = 246 / 30 / 15;
    const largura = 200; // qualquer largura útil
    const fonte = 0.11 * largura;
    assert.ok("R$ 12.345.678,90".length * emPorCaractere * fonte <= largura);
  });
});

// ── Decisão 2 — os gráficos saem do Início (DEC-161) ─────────────────────
describe("Fase 4a2 · decisão 2 — sem gráficos em nenhuma tela (DEC-161)", () => {
  const arquivos = (dir) => readdirSync(join(RAIZ, dir)).flatMap((n) => {
    const rel = `${dir}/${n}`;
    return statSync(join(RAIZ, rel)).isDirectory() ? arquivos(rel) : [rel];
  });
  const fontes = arquivos("src").filter((f) => /\.(jsx?|css)$/.test(f));

  test("o componente, a série e os estilos dos gráficos deixaram de existir", () => {
    assert.ok(!existsSync(join(RAIZ, "src/pages/dashboard/DashboardCharts.jsx")));
    assert.ok(!existsSync(join(RAIZ, "src/utils/chartSeries.js")));
    assert.doesNotMatch(semComentarios(ler("src/pages/dashboard/DashboardPage.css")), /\.chart[s-]/);
  });

  test("nenhuma tela importa biblioteca de gráfico nem desenha donut ou barra", () => {
    for (const f of fontes) {
      const t = semComentarios(ler(f));
      assert.doesNotMatch(t, /from ['"]recharts['"]|PieChart|BarChart|ResponsiveContainer/, f);
    }
  });

  test("nenhum pedido a /dashboard/honorarios-por-mes nem a /dashboard/status", () => {
    for (const f of fontes.filter((x) => !x.endsWith(".css"))) {
      const t = semComentarios(ler(f));
      assert.doesNotMatch(t, /honorarios-por-mes|['"`]\/dashboard\/status/, f);
    }
  });

  test("o pacote que só servia aos gráficos saiu das dependências", () => {
    const pkg = JSON.parse(ler("package.json"));
    assert.equal(pkg.dependencies.recharts, undefined);
    assert.equal(pkg.devDependencies.recharts, undefined);
  });

  test("o Início não tem mais o bloco, e a ordem fica com os cinco blocos", () => {
    const tela = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.doesNotMatch(tela, /graficos|Gráficos|lazy\(|Suspense/);
  });
});

// ── Decisão 3 — o seletor do mês mora no bloco "Em {mês}" (DEC-162) ───────
describe("Fase 4a2 · decisão 3 — o seletor do mês no bloco do mês (DEC-162)", () => {
  const tela = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
  const topo = tela.slice(tela.indexOf('<div className="dashboard-header">'), tela.indexOf("{fromCache && <OfflineNotice"));
  const blocoDoMes = tela.slice(tela.indexOf('chave="mes"'), tela.indexOf('chave="acumulado"'));

  test("o topo fica só com o título e a data de hoje", () => {
    assert.match(topo, /<h1 className="dashboard-title">Início<\/h1>/);
    assert.match(topo, /formatCurrentDate\(\)/);
    assert.doesNotMatch(topo, /inicio-mes|<button/);
  });

  test("o seletor está na ação do bloco \"Em {mês}\", com as setas, o rótulo e o \"Mês atual\"", () => {
    const acao = blocoDoMes.slice(blocoDoMes.indexOf("acao={"), blocoDoMes.indexOf("carregandoResumo"));
    assert.match(blocoDoMes, /titulo=\{`Em \$\{rotuloMes\}`\}/);
    assert.match(acao, /className="inicio-mes" role="group"/);
    assert.match(acao, /aria-label="Mês anterior"[\s\S]*onClick=\{\(\) => irParaMes\(anterior\)\}/);
    assert.match(acao, /aria-label="Próximo mês"[\s\S]*onClick=\{\(\) => irParaMes\(proximo\)\}/);
    assert.match(acao, /irParaMes\(null\)[\s\S]*Mês atual/);
    assert.equal((tela.match(/className="inicio-mes"/g) || []).length, 1, "um seletor só");
  });

  test("o mês continua na URL, e o \"voltar\" desfaz a troca", () => {
    assert.match(tela, /setSearchParams\(paramsDoMes\(searchParams, destino, corrente\), \{ replace: false, preventScrollReset: true \}\)/);
    assert.match(tela, /lerMesDaUrl\(searchParams\.get\('mes'\)\)/);
  });

  test("o seletor fica FORA do botão que alterna o bloco (botão dentro de botão é inválido)", () => {
    const bloco = semComentarios(ler("src/components/dashboard/BlocoDoPainel.jsx"));
    const botao = bloco.slice(bloco.indexOf("<button"), bloco.indexOf("</button>"));
    assert.doesNotMatch(botao, /acao/);
    assert.match(bloco, /\{acao && <div className="bloco__acao">\{acao\}<\/div>\}/);
  });
});

// ── Decisão 4 — prioridades de coluna pela largura do conteúdo (DEC-163) ──
describe("Fase 4a2 · decisão 4 — as colunas pela largura do conteúdo (DEC-163)", () => {
  const css = semComentarios(ler("src/styles/modules.css"));
  const LISTAS = {
    honorarios: "src/pages/fees/FeeListPage.jsx",
    parcelas: "src/pages/installments/InstallmentListPage.jsx",
    pagamentos: "src/pages/payments/PaymentListPage.jsx",
    processos: "src/pages/processes/ProcessListPage.jsx",
    clientes: "src/pages/clients/ClientListPage.jsx",
    documentos: "src/pages/documents/DocumentListPage.jsx",
    secoes: "src/pages/secoes/SecaoListPage.jsx",
  };
  // As larguras das classes de <col>, lidas do próprio CSS.
  const larguraDaClasse = (classe) => {
    if (classe === "col-cede") return 220; // a largura dela quando a tabela rola
    const m = css.match(new RegExp(`(^|\\n)\\.${classe}\\s*\\{\\s*width: (\\d+)px;`));
    assert.ok(m, `largura de .${classe}`);
    return Number(m[2]);
  };
  const colunas = (arquivo) => [...semComentarios(ler(arquivo)).matchAll(/<col className="([^"]+)" \/>/g)].map((m) => {
    const classes = m[1].split(" ");
    const prio = classes.includes("prio-3") ? 3 : classes.includes("prio-2") ? 2 : 1;
    return { largura: larguraDaClasse(classes.find((c) => c.startsWith("col-"))), prio };
  });
  const ponto = (lista, prio) => {
    const m = css.match(new RegExp(`@container \\(max-width: ([\\d.]+)px\\) \\{ \\.data-table\\[data-lista="${lista}"\\] \\.prio-${prio} \\{ display: none; \\} \\}`));
    return m ? Number(m[1]) : null;
  };

  test("o contêiner é a área da tabela (`.table-wrapper`)", () => {
    assert.match(css, /\.table-wrapper \{[^}]*container-type: inline-size;/);
  });

  test("nenhuma prioridade depende mais da largura da janela", () => {
    assert.doesNotMatch(css, /@media[^{]*\{[^@]*\.prio-[23]/);
  });

  for (const [lista, arquivo] of Object.entries(LISTAS)) {
    test(`${lista}: a tabela diz qual lista é, e cada ponto é a soma das colunas que ficam`, () => {
      assert.match(semComentarios(ler(arquivo)), new RegExp(`data-table--primeira-fixa[^"]*" data-lista="${lista}"`));
      const cols = colunas(arquivo);
      const soma = (max) => cols.filter((c) => c.prio <= max).reduce((s, c) => s + c.largura, 0);
      const tem = (p) => cols.some((c) => c.prio === p);
      if (lista === "parcelas") {
        // Não cabe em área nenhuma (DEC-133): o ponto é o de antes, 1.192.
        assert.equal(ponto(lista, 2), 1191.98);
        assert.equal(ponto(lista, 3), null);
        return;
      }
      if (tem(3)) assert.equal(ponto(lista, 3), soma(3) - 0.02, `prio-3 de ${lista} sai abaixo de ${soma(3)}`);
      else assert.equal(ponto(lista, 3), null);
      if (tem(2)) assert.equal(ponto(lista, 2), soma(2) - 0.02, `prio-2 de ${lista} sai abaixo de ${soma(2)}`);
      else assert.equal(ponto(lista, 2), null);
    });
  }

  test("com a área de 1280 (1.192) e a de 1920 (1.240), só Parcelas passa da área", () => {
    for (const area of [1192, 1240]) {
      for (const [lista, arquivo] of Object.entries(LISTAS)) {
        if (lista === "parcelas") continue;
        const cols = colunas(arquivo).filter((c) => {
          const p = ponto(lista, c.prio);
          return c.prio === 1 || p === null || area > p;
        });
        const total = cols.reduce((s, c) => s + c.largura, 0);
        assert.ok(total <= area, `${lista} a ${area}: ${total}`);
      }
    }
  });

  test("Seções: a coluna Variáveis tem a largura do cabeçalho (col-xs, e não col-xxs)", () => {
    assert.match(semComentarios(ler(LISTAS.secoes)), /<col className="col-xs prio-3" \/>/);
  });
});

// ── Decisão 5 — "Precisa de atenção" com contexto (DEC-164) ──────────────
import { parcelaDaSemana, prazoDaParcela, emAbertoDaParcela } from "../../src/pages/dashboard/inicio.js";
import { vencidasDoAviso } from "../../src/pages/financeiro/visaoGeral.js";

describe("Fase 4a2 · decisão 5 — \"Precisa de atenção\" com honorário, processo e cliente (DEC-164)", () => {
  const tela = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
  const bloco = tela.slice(tela.indexOf('chave="atencao"'), tela.indexOf('chave="proximos"'));

  test("a linha vencida: \"{honorário} — Parcela N de M\", o em aberto, \"processo · cliente\" e o destino na parcela", () => {
    const [linha] = vencidasDoAviso({ parcelasVencidas: [{
      _id: "p1", titulo: "Parcela 4 de 6", subtitulo: "Contrato de honorários", data: "2026-10-01",
      emAberto: 1234567.89, processo: { numeroProcesso: "0001234-56.2026.8.16.0019", clientePrincipalNome: "Mariana Souza" },
      natureza: "derivada", origem: "parcela",
    }] }, Infinity);
    assert.equal(linha.titulo, "Contrato de honorários — Parcela 4 de 6");
    assert.equal(linha.subtitulo, "R$ 1.234.567,89 em aberto");
    assert.equal(linha.contexto, "0001234-56.2026.8.16.0019 · Mariana Souza");
    assert.equal(linha.destino, "/dashboard/parcelas/editar/p1");
    assert.equal(linha.tipo, "vencida");
  });

  test("todas as vencidas entram (sem o limite de 8 da Visão geral)", () => {
    const muitas = Array.from({ length: 12 }, (_, i) => ({ _id: `p${i}`, titulo: `Parcela ${i + 1}`, data: "2026-10-01", natureza: "derivada", origem: "parcela" }));
    assert.equal(vencidasDoAviso({ parcelasVencidas: muitas }, Infinity).length, 12);
  });

  test("a linha da semana: o mesmo formato, a partir de GET /installments", () => {
    const linha = parcelaDaSemana({
      _id: "i1", numeroParcela: 2, totalParcelas: 3, dataVencimento: "2026-10-30T12:00:00.000Z",
      valor: 4000, valorPago: 1000, status: "pendente",
      feeId: { _id: "f1", descricao: "Honorário de êxito" },
      processo: { numeroProcesso: "0009999-00.2026.8.16.0019", clientePrincipalNome: "Construtora Alfa" },
    }, new Date(2026, 9, 28, 10));
    assert.equal(linha.titulo, "Honorário de êxito — Parcela 2 de 3");
    assert.equal(linha.subtitulo, "R$ 3.000,00 em aberto · Vence em 2 dias");
    assert.equal(linha.contexto, "0009999-00.2026.8.16.0019 · Construtora Alfa");
    assert.equal(linha.destino, "/dashboard/parcelas/editar/i1");
    assert.equal(linha.data, "2026-10-30");
    assert.equal(linha.tipo, "vencimento");
  });

  test("o prazo em palavras é o de antes (saiu do componente sem mudar)", () => {
    const hoje = new Date(2026, 9, 28, 10);
    assert.equal(prazoDaParcela("2026-10-27T12:00:00", hoje), "Vencida");
    assert.equal(prazoDaParcela("2026-10-28T12:00:00", hoje), "Vence hoje");
    assert.equal(prazoDaParcela("2026-10-29T12:00:00", hoje), "Vence amanhã");
    assert.equal(prazoDaParcela("2026-11-04T12:00:00", hoje), "Vence em 7 dias");
    assert.equal(emAbertoDaParcela({ valor: 4000, valorPago: 1000 }), 3000);
    assert.equal(emAbertoDaParcela({ valor: 100, valorPago: 150 }), 0);
  });

  test("as duas listas do bloco usam a LinhaDeData; a linha inteira é o link", () => {
    assert.equal((bloco.match(/<LinhaDeData key=\{item\.chave\} item=\{item\} \/>/g) || []).length, 2);
    assert.doesNotMatch(bloco, /StatusBadge|upcoming-|link-interno/);
    assert.equal((bloco.match(/<Link\b/g) || []).length, 1, "só o \"Registrar pagamento\" da ação do bloco");
    assert.match(tela, /const linhasVencidas = vencidasDoAviso\(avisos, Infinity\);/);
    assert.match(tela, /const linhasDaSemana = upcoming\.map\(\(inst\) => parcelaDaSemana\(inst\)\);/);
  });

  test("a fonte e o filtro da semana NÃO mudaram (a decisão 6 depende de resposta)", () => {
    assert.match(tela, /if \(inst\.status !== 'pendente'\) return false;\s*return new Date\(inst\.dataVencimento\) <= in7Days;/);
  });
});
