// ═══════════════════════════════════════════════════════════════════════════
// FASE 0 — correções em produção antes do porte do visual (DEC-066 a DEC-069)
//
// Cada bloco trava um defeito que já estava no ar. Testes de análise do
// código-fonte, como o resto da suíte (sem DOM), exceto onde o módulo pode ser
// carregado de verdade — e aí ele é executado, não lido.
// ═══════════════════════════════════════════════════════════════════════════
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// `utils/toast.js` não importa nada, então carrega em `node --test` com a
// extensão explícita. O impedimento registrado em `tests/offline/estatica.test.js`
// é do `axiosConfig.js`, que importa `'../utils/toast'` SEM extensão — não deste
// módulo.
import { toast, subscribe } from "../../src/utils/toast.js";
import { LIMITE_DO_SELETOR, avisoDeSeletorLimitado } from "../../src/utils/seletorLimitado.js";
import { rotuloDoProcessoFiltrado, trechoDoProcessoFiltrado } from "../../src/utils/processoFiltrado.js";
import { descricaoDoRecorteFinanceiro } from "../../src/components/financeiro/filterSummary.js";

const RAIZ = fileURLToPath(new URL("../../", import.meta.url));
const ler = (caminho) => readFileSync(join(RAIZ, caminho), "utf8");
const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const arquivosDeSrc = (dir = join(RAIZ, "src"), acc = []) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosDeSrc(caminho, acc);
    else if (/\.jsx?$/.test(nome)) acc.push(caminho);
  }
  return acc;
};

// ═══════════════════════════════════════════════════════════════════════════
// 1 — DEC-066: `toast.info` existia nas telas e não no módulo
// ═══════════════════════════════════════════════════════════════════════════
describe("Fase 0 · item 1 — o toast tem os três tons que as telas chamam", () => {
  test("toast expõe success, error e info, todos como função", () => {
    for (const tom of ["success", "error", "info"]) {
      assert.equal(typeof toast[tom], "function", `toast.${tom}`);
    }
  });

  test("toast.info entrega { type: 'info', message } a quem assina", () => {
    const recebidos = [];
    const sair = subscribe((t) => recebidos.push(t));
    toast.info("Ficou na fila.");
    sair();
    assert.equal(recebidos.length, 1);
    assert.equal(recebidos[0].type, "info");
    assert.equal(recebidos[0].message, "Ficou na fila.");
    assert.equal(typeof recebidos[0].id, "number");
  });

  test("nenhuma tela chama um método de toast que o módulo não tem", () => {
    // É a varredura que teria pego o defeito: cinco chamadas a `toast.info`
    // desde a F-3, e o `TypeError` só aparecia no clique.
    const existentes = new Set(Object.keys(toast));
    const faltando = [];
    for (const caminho of arquivosDeSrc()) {
      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      for (const [, metodo] of codigo.matchAll(/\btoast\.([a-zA-Z]+)\(/g)) {
        if (!existentes.has(metodo)) faltando.push(`${caminho.slice(RAIZ.length)}: toast.${metodo}`);
      }
    }
    assert.deepEqual(faltando, []);
  });

  test("o tom info tem regra de CSS, com fundo sólido e texto branco", () => {
    // Desde a Fase 1 a cor vem de token (`--color-info-solid`, #1F5A96), e o
    // contraste é medido nos dois modos por `tests/css/contraste.test.js`. O que
    // fica travado aqui é a decisão da DEC-066: fundo SÓLIDO e texto branco.
    const css = ler("src/styles/toast.css");
    const regra = css.match(/\.toast--info\s*\{([^}]*)\}/);
    assert.ok(regra, ".toast--info existe");
    assert.match(regra[1], /background-color:\s*var\(--color-info-solid\)/);
    assert.match(regra[1], /(^|[;\s])color:\s*var\(--color-on-solid\)/);

    const variaveis = ler("src/styles/variables.css");
    assert.match(variaveis, /--color-on-solid:\s*#FFFFFF;/i, "texto branco");
    const solidos = [...variaveis.matchAll(/--color-info-solid:\s*([^;]+);/g)].map((m) => m[1].trim());
    assert.ok(solidos.length > 0, "--color-info-solid declarado");
    for (const v of solidos) assert.match(v, /^#[0-9a-f]{6}$/i, `fundo sólido, sem alfa: ${v}`);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — DEC-067: os seletores pediam 20 e calavam o resto
// ═══════════════════════════════════════════════════════════════════════════
describe("Fase 0 · item 2 — o seletor pede o teto do backend e diz quando corta", () => {
  test("o teto é o mesmo `Math.min(100, …)` dos controllers", () => {
    assert.equal(LIMITE_DO_SELETOR, 100);
  });

  test("a frase só aparece quando o total passa do que veio", () => {
    assert.equal(avisoDeSeletorLimitado(100, 137), "Mostrando os 100 mais recentes de 137.");
    assert.equal(avisoDeSeletorLimitado(100, 100), null);
    assert.equal(avisoDeSeletorLimitado(12, 12), null);
    // Envelope sem `total` (resposta antiga): não se inventa um corte.
    assert.equal(avisoDeSeletorLimitado(20, null), null);
    assert.equal(avisoDeSeletorLimitado(20, undefined), null);
  });

  const FORMULARIOS = [
    ["src/pages/fees/FeeFormPage.jsx", /processService\.listProcesses\(\{ page: 1, limit: LIMITE_DO_SELETOR \}\)/],
    ["src/pages/installments/InstallmentFormPage.jsx", /feeService\.listFees\(\{ page: 1, limit: LIMITE_DO_SELETOR \}\)/],
  ];

  for (const [arquivo, chamada] of FORMULARIOS) {
    test(`${arquivo.split("/").pop()} pede o teto e mostra o aviso`, () => {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, chamada);
      // A chamada sem argumento é o defeito: voltaria aos 20 do padrão.
      assert.doesNotMatch(codigo, /\.(listProcesses|listFees)\(\)/);
      assert.match(codigo, /avisoDeSeletorLimitado\(/);
      assert.match(codigo, /className="form-hint"/);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 — DEC-069: o cartão conta pendente E parcialmente pago, e diz isso
// ═══════════════════════════════════════════════════════════════════════════
describe("Fase 0 · item 4 — o cartão se chama \"Honorários em aberto\"", () => {
  test("a chave da API é a mesma e o rótulo mudou", () => {
    const codigo = semComentarios(ler("src/pages/dashboard/DashboardHomePage.jsx"));
    assert.match(codigo, /key: 'honorariosAReceber',\s*label: 'Honorários em aberto'/);
    assert.doesNotMatch(codigo, /Honorários a Receber/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 — DEC-070: o filtro `?processoId=` aparece, e sai com um clique
// ═══════════════════════════════════════════════════════════════════════════
describe("Fase 0 · item 5 — o filtro de processo da URL é visível", () => {
  test("o rótulo é 'número — título', e aguenta o campo que faltar", () => {
    assert.equal(
      rotuloDoProcessoFiltrado({ numeroProcesso: "0001234-56.2024.8.16.0001", titulo: "Ação de cobrança" }),
      "0001234-56.2024.8.16.0001 — Ação de cobrança"
    );
    assert.equal(rotuloDoProcessoFiltrado({ titulo: "Sem número" }), "Sem número");
    assert.equal(rotuloDoProcessoFiltrado({ numeroProcesso: "  ", titulo: "Só título" }), "Só título");
    assert.equal(rotuloDoProcessoFiltrado(null), null);
  });

  test("a frase do recorte nomeia o processo, ou diz 'deste processo' sem inventar", () => {
    assert.equal(trechoDoProcessoFiltrado("123 — Ação"), 'do processo "123 — Ação"');
    assert.equal(trechoDoProcessoFiltrado(null), "deste processo");
  });

  test("o processo entra em descricaoDoRecorteFinanceiro depois da busca", () => {
    assert.equal(
      descricaoDoRecorteFinanceiro({ processo: { rotulo: "123 — Ação" } }),
      'do processo "123 — Ação"'
    );
    assert.equal(
      descricaoDoRecorteFinanceiro({ busca: "pix", processo: { rotulo: "123 — Ação" } }),
      'com "pix" e do processo "123 — Ação"'
    );
    // Sem o filtro, a frase não muda — as três listas continuam dizendo o que diziam.
    assert.equal(descricaoDoRecorteFinanceiro({ busca: "pix" }), 'com "pix"');
  });

  const LISTAS = [
    "src/pages/fees/FeeListPage.jsx",
    "src/pages/installments/InstallmentListPage.jsx",
    "src/pages/payments/PaymentListPage.jsx",
    "src/pages/documents/DocumentListPage.jsx",
  ];

  for (const arquivo of LISTAS) {
    test(`${arquivo.split("/").pop()} mostra o chip e lê o processo pelo hook`, () => {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /useProcessoFiltrado\(\)/);
      assert.match(codigo, /<ProcessFilterChip[\s\S]*?onRemover=\{filtroProcesso\.remover\}/);
      // A leitura crua do parâmetro é o defeito: filtrava sem mostrar.
      assert.doesNotMatch(codigo, /searchParams\.get\('processoId'\)/);
    });
  }

  for (const arquivo of LISTAS.slice(0, 3)) {
    test(`${arquivo.split("/").pop()} põe o processo na frase e o "Limpar" o remove`, () => {
      const codigo = semComentarios(ler(arquivo));
      assert.match(codigo, /processo: processoId \? \{ rotulo: filtroProcesso\.rotulo \} : null/);
      assert.match(codigo, /limpar=\{limparTudo\}/);
      assert.match(codigo, /temFiltro=\{filtrado\}/);
      assert.match(codigo, /if \(processoId\) filtroProcesso\.remover\(\)/);
    });
  }

  test("o hook usa o mesmo recurso offline do detalhe e tira só o processoId da URL", () => {
    const hook = semComentarios(ler("src/hooks/useProcessoFiltrado.js"));
    assert.match(hook, /resource: 'process'/);
    assert.match(hook, /params: \{ id: processoId \}/);
    assert.match(hook, /enabled: Boolean\(processoId\)/);
    assert.match(hook, /proximo\.delete\('processoId'\)/);
  });

  test("o × tem rótulo acessível, e o chip importa a própria folha", () => {
    const chip = ler("src/components/ui/ProcessFilterChip.jsx");
    assert.match(chip, /aria-label="Remover o filtro de processo"/);
    assert.match(chip, /import '\.\/ProcessFilterChip\.css'/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7 — o aviso de e-mail não promete o que o backend não aplica
// ═══════════════════════════════════════════════════════════════════════════
describe("Fase 0 · item 7 — o texto do aviso de e-mail é verdadeiro", () => {
  const aviso = semComentarios(ler("src/components/layout/EmailConfirmationBanner.jsx"));
  // O JSX quebra a frase em linhas; a comparação é sobre o texto corrido.
  const corrido = aviso.replace(/\s+/g, " ");

  test("a frase falsa sobre a recuperação de senha saiu", () => {
    assert.doesNotMatch(corrido, /não conseguirá recuperar a senha/);
  });

  test("a frase nova está lá", () => {
    // Encurtada na Fase 2b (DEC-088) para caber numa linha, sem passar a
    // prometer nada: diz para que serve confirmar, e não o que acontece se não.
    assert.match(
      corrido,
      /<strong>Confirme seu e-mail<\/strong> \(\{user\.email\}\) para receber os avisos e o link de recuperação de senha\./
    );
  });
});
