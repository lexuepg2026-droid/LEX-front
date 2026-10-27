// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.3 — DETALHE DO PROCESSO (parte a: itens 1 e 2)
//
// A suíte é `node --test` sem DOM: fiação por varredura, regras puras
// executadas. A posição do ⋮ na tela é medida no navegador (relatório 3.3a).
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ler = (caminho) => readFileSync(join(RAIZ, caminho), "utf8");
const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const LISTAS = [
  "src/pages/fees/FeeListPage.jsx",
  "src/pages/installments/InstallmentListPage.jsx",
  "src/pages/payments/PaymentListPage.jsx",
];

describe("3.3 · item 1 — a coluna de ações fixa à direita (DEC-107)", () => {
  test("as três listas usam a tabela com ações fixas, e o ⋮ continua sendo a última coluna", () => {
    for (const arquivo of LISTAS) {
      const fonte = semComentarios(ler(arquivo));
      // Fase 3.7 (DEC-133): os <th> ganharam a classe de prioridade (`prio-2`/`prio-3`); a trava passa a aceitá-la e continua exigindo os mesmos nomes, na mesma ordem e alinhados ao colgroup. A tabela ganhou `data-table--primeira-fixa` depois das três classes.
      assert.match(fonte, /className="data-table data-table--fixed data-table--acoes-fixas data-table--primeira-fixa[ "]/, arquivo);
      const thead = fonte.match(/<thead>([\s\S]*?)<\/thead>/)[1];
      const ths = [...thead.matchAll(/<th(?:\s+className="[^"]*")?>([^<]+)<\/th>/g)].map((m) => m[1]);
      assert.equal(ths.at(-1), "Ações", arquivo);
      const colgroup = fonte.match(/<colgroup>([\s\S]*?)<\/colgroup>/)[1];
      const cols = [...colgroup.matchAll(/<col\b[^>]*>/g)].map((m) => m[0]);
      assert.equal(cols.length, ths.length, `${arquivo}: colgroup e cabeçalho alinhados`);
      assert.match(cols.at(-1), /col-acoes-menu/, arquivo);
    }
  });

  test("a regra: sticky à direita, fundo opaco da linha, z-index 1, hover igual ao da linha", () => {
    const css = ler("src/styles/modules.css");
    const bloco = css.slice(css.indexOf(".data-table--acoes-fixas th:last-child,"));
    assert.match(bloco, /position: sticky;\s*right: 0;\s*z-index: 1;\s*background-color: var\(--color-bg\);/);
    assert.match(bloco, /\.data-table--acoes-fixas th:last-child \{\s*background-color: var\(--color-surface-raised\);/);
    assert.match(bloco, /tr:hover > td:last-child \{\s*background-image: linear-gradient\(var\(--color-accent-muted\), var\(--color-accent-muted\)\);/);
    assert.match(bloco, /\.lista-balao \.data-table--acoes-fixas td:last-child \{\s*background-color: var\(--color-surface\);/);
    assert.match(bloco, /\.lista-balao \.data-table--acoes-fixas tbody tr:hover > td:last-child \{\s*background-image: none;\s*background-color: var\(--color-surface-raised\);/);
  });

  test("nem transform nem filter na regra nova — o menu ⋮ em portal depende disso (DEC-046)", () => {
    const css = ler("src/styles/modules.css");
    const bloco = css.slice(css.indexOf("A COLUNA DE AÇÕES FIXA À DIREITA")).replace(/\/\*[\s\S]*?\*\//g, "");
    assert.doesNotMatch(bloco, /(^|[\s;{])(transform|filter|perspective|contain)\s*:/m);
  });

  test("a lista de honorários perdeu Percentual e Valor base", () => {
    const fonte = semComentarios(ler("src/pages/fees/FeeListPage.jsx"));
    assert.doesNotMatch(fonte, /<th>Percentual<\/th>|<th>Valor base<\/th>/);
    assert.doesNotMatch(fonte, /formatPercent|fee\.valorBase/);
    // Fase 3.7 (DEC-133): o Tipo é `prio-3` e a Descrição passou a ser a
    // primeira coluna; o Valor continua logo depois do Tipo.
    assert.match(fonte, /<th className="prio-3">Tipo<\/th>\s*<th>Valor<\/th>/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Item 2 — processos não liberados, por processo (DEC-108)
// ═══════════════════════════════════════════════════════════════════════════
import { destinoDosNaoLiberados } from "../../src/pages/dashboard/inicio.js";

describe("3.3 · item 2 — o cartão de não liberados", () => {
  test("com um processo, abre o processo", () => {
    assert.deepEqual(destinoDosNaoLiberados({ processosNaoLiberados: 1, processoNaoLiberadoId: "p1" }),
      { tipo: "processo", destino: "/dashboard/processos/detalhe/p1", rotulo: "Abrir o processo" });
  });

  // REESCRITO na Fase 3.4 (DEC-118): com mais de um, a lista JÁ FILTRADA por
  // `?portal=nao_liberado` (o filtro nasceu na 3.4, com a mesma regra do
  // número, DEC-115). Com nenhum, a lista comum. Back antigo sem o id não
  // ganha destino inventado: vai à lista filtrada, que é verdade para 1.
  test("com mais de um, a lista filtrada; com nenhum, a lista comum", () => {
    for (const resumo of [
      { processosNaoLiberados: 2, processoNaoLiberadoId: null },
      { processosNaoLiberados: 1 }, // back antigo, sem o id
    ]) {
      assert.deepEqual(destinoDosNaoLiberados(resumo),
        { tipo: "lista", destino: "/dashboard/processos?portal=nao_liberado", rotulo: "Ver os processos não liberados" });
    }
    for (const resumo of [{ processosNaoLiberados: 0, processoNaoLiberadoId: null }, undefined]) {
      assert.deepEqual(destinoDosNaoLiberados(resumo),
        { tipo: "lista", destino: "/dashboard/processos", rotulo: "Ver a lista de processos" });
    }
  });

  test("a tela usa o destino derivado e continua sem filtro novo na lista", () => {
    const fonte = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(fonte, /const naoLiberados = destinoDosNaoLiberados\(summary\);/);
    assert.match(fonte, /<Link to=\{naoLiberados\.destino\} className="card-note card-note--link">\s*\{naoLiberados\.rotulo\}/);
    assert.doesNotMatch(fonte, /processos\?liberado/);
  });
});
