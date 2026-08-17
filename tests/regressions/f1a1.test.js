// ═══════════════════════════════════════════════════════════════════════════
// REGRESSÕES DA FASE F-1a.1 — o foco da busca e o rótulo da reparcelada
//
// ── O que dá para provar sem DOM, e o que não dá ──────────────────────────
// A suíte é `node --test` sem renderizador (decisão da Fase 2E.2). **Não há
// como provar por script que o foco permanece no input** — isso exige montar a
// árvore, disparar um evento, deixar o efeito resolver e ler
// `document.activeElement`.
//
// O que dá para provar é a CAUSA, que é estrutural e estática: nenhuma
// listagem com filtro pode trocar a própria árvore por `<Loading/>` num
// `return` antecipado, porque é isso que desmonta o input a cada refetch. Se
// alguém reintroduzir o padrão, este arquivo cai — e é o padrão, não o
// sintoma, que produz o defeito.
//
// O passo manual que fecha a outra metade está no roteiro (passo 155): digitar
// na busca e conferir que o cursor não some. Inventar um teste de foco frágil
// aqui seria pior que o passo manual honesto.
//
// ── A varredura limpa comentários ANTES de analisar ───────────────────────
// Sem isso, o comentário de `ClientListPage` que EXPLICA a remoção — e que
// cita a linha removida entre crases — derrubaria a varredura que o explica, e
// a saída óbvia seria apagar a explicação. É a mesma armadilha que
// `css/foco.test.js` documenta desde a 4.5 e em que a F-0 caiu no `sw.js`.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// As listagens que refazem a consulta a partir de um controle da própria tela.
// São elas — e só elas — que sofrem o defeito: numa tela de detalhe o
// `loading` é do carregamento inicial e não volta a `true`.
const LISTAGENS_COM_FILTRO = [
  ["src/pages/clients/ClientListPage.jsx", "busca"],
  ["src/pages/fees/FeeListPage.jsx", "busca + tipo + status"],
  ["src/pages/processes/ProcessListPage.jsx", "busca + status"],
  ["src/pages/payments/PaymentListPage.jsx", "forma de pagamento"],
  ["src/pages/installments/InstallmentListPage.jsx", "status + desativadas"],
  // Já nascia certa — entra na lista para não sair do padrão numa refatoração
  // futura, e porque foi ela que serviu de referência para a correção.
  ["src/pages/secoes/SecaoListPage.jsx", "busca + tipo"]
];

describe("A-4 — o campo de busca não é desmontado a cada refetch", () => {
  for (const [arquivo, filtros] of LISTAGENS_COM_FILTRO) {
    test(`${arquivo.split("/").pop()} (${filtros}) não tem \`return\` antecipado de carregamento`, () => {
      const codigo = semComentarios(ler(arquivo));

      // A DECLARAÇÃO, não a string: `if (loading) return <Loading/>` em
      // qualquer espaçamento, e também a forma com chaves.
      const returnAntecipado =
        /if\s*\(\s*!?\s*\w*[Ll]oading\w*\s*\)\s*(\{\s*)?return\s+</;

      assert.ok(
        !returnAntecipado.test(codigo),
        `${arquivo} voltou a trocar a árvore inteira por <Loading/> num return ` +
        "antecipado. Isso desmonta os controles de filtro a cada consulta, e o " +
        "foco do input se perde. O indicador tem de ficar ABAIXO dos controles, " +
        "dentro do JSX."
      );
    });

    test(`${arquivo.split("/").pop()} renderiza o carregamento dentro do JSX`, () => {
      // Contraprova: sem ela, apagar o `<Loading/>` de vez passaria no teste
      // acima e deixaria a tela sem nenhum sinal de carregamento.
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo,
        /\{\s*\w*[Ll]oading\w*\s*\?\s*\(?\s*<Loading/,
        `${arquivo} deixou de exibir o estado de carregamento`
      );
    });
  }

  test("nenhuma listagem contorna o defeito com autoFocus ou .focus()", () => {
    // As duas saídas fáceis tratam o SINTOMA e criam um defeito pior: roubam o
    // foco de quem está navegando por teclado, e num `useEffect` disparado por
    // refetch fazem isso a cada tecla digitada.
    for (const [arquivo] of LISTAGENS_COM_FILTRO) {
      const codigo = semComentarios(ler(arquivo));
      assert.ok(!/autoFocus/.test(codigo), `${arquivo} usa autoFocus`);
      assert.ok(
        !/\.focus\(\)/.test(codigo),
        `${arquivo} chama .focus() — trate a causa, não o sintoma`
      );
    }
  });
});

describe("A-3 — a parcela reparcelada não mostra dívida fantasma", () => {
  test("a ficha só imprime `em aberto` quando a parcela NÃO foi reparcelada", () => {
    const codigo = semComentarios(
      ler("src/components/financeiro/ProcessFinancialSheet.jsx")
    );

    assert.match(
      codigo,
      /const\s+reparcelada\s*=\s*Boolean\(\s*p\.reparcelamentoId\s*\)/,
      "a ficha deixou de distinguir a parcela reparcelada"
    );
    assert.match(
      codigo,
      /\{\s*!reparcelada\s*&&\s*\(/,
      "o `em aberto` voltou a ser impresso incondicionalmente — a parcela " +
      "substituída passa a exibir dívida que não existe"
    );
  });

  test("o rótulo sai da fonte única de status, não de string na tela", () => {
    // `utils/statusVisual.js` é a fonte ÚNICA de rótulo e cor desde a 4.3 —
    // badge e fatia de gráfico saem dele. Um rótulo escrito à mão na ficha
    // seria o segundo mapa que aquela fase existiu para eliminar.
    const ficha = semComentarios(
      ler("src/components/financeiro/ProcessFinancialSheet.jsx")
    );
    assert.match(
      ficha,
      /<StatusBadge\s+status=\{\s*reparcelada\s*\?\s*['"]reparcelada['"]/,
      "a ficha deixou de usar o StatusBadge para a parcela reparcelada"
    );
    assert.ok(
      !/status-badge--/.test(ficha),
      "a ficha voltou a montar a classe do badge à mão"
    );

    const visual = ler("src/utils/statusVisual.js");
    assert.match(visual, /reparcelada:\s*\{\s*label:\s*['"]Reparcelada['"]/,
      "`reparcelada` saiu do vocabulário de status");
  });

  test("a parcela reparcelada mantém valor e recebido — é histórico auditável", () => {
    // Omitir a parcela inteira seria pior que o defeito: levaria junto o
    // registro de que aquela cobrança existiu e do que foi recebido nela.
    const codigo = semComentarios(
      ler("src/components/financeiro/ProcessFinancialSheet.jsx")
    );
    assert.match(codigo, /formatCurrency\(p\.valor\)/, "o valor da parcela sumiu");
    assert.match(codigo, /formatCurrency\(p\.valorPago\)/, "o recebido da parcela sumiu");
  });
});
