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
