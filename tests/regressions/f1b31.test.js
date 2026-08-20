// ═══════════════════════════════════════════════════════════════════════════
// FASE F-1b.3.1 — O MENU DE AÇÕES SAI DA TELA (frontend)
//
// ── O defeito ────────────────────────────────────────────────────────────
// Na validação manual da F-1b.3 os passos 173, 174, 176 e 177 passaram e os
// passos 178 e 179 falharam: o botão ⋮ recebia o anel de foco e ABRIA o
// painel, mas o painel saía cortado — nas TRÊS listagens.
//
// Foco e abertura funcionando descartam as causas de comportamento (o
// `keydown` registrado, o estado, o `outline`). Sobrou posicionamento — e
// "nas três" é a assinatura de causa estrutural: é um componente só, dentro
// de um wrapper só.
//
// ── A causa, medida na Parte 1 e fixada aqui ─────────────────────────────
// TODO ancestral com `overflow` diferente de `visible` recorta descendente
// posicionado. Havia TRÊS, aninhados, e o mais interno era a própria célula:
//   1. `.data-table--fixed td`  → `overflow: hidden`
//   2. `.table-wrapper`         → `overflow-x: auto`
//   3. `.main-content`          → `overflow-y: auto`
// Recorte não é ordem de pintura: nenhum `z-index` atravessa isso.
//
// ── O que dá para provar sem DOM ─────────────────────────────────────────
// A suíte é `node --test` sem renderizador (Fase 2E.2). Não dá para provar
// que o painel apareceu inteiro em 360 px — isso é o roteiro, passos 181 e
// 182. Dá para provar a CAUSA (o painel não é mais filho do wrapper que
// recorta), a CONTA (função pura, com as duas viradas) e a HIGIENE (os
// ouvintes de rolagem são devolvidos).
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { posicaoDoPainel } from "../../src/components/ui/actionMenuPosition.js";
import { pluralDe, pluralizar } from "../../src/components/ui/plural.js";
import { resumoDaPagina, frasePosicao } from "../../src/components/ui/paginacao.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const menu = semComentarios(ler("src/components/ui/ActionMenu.jsx"));
const menuCss = ler("src/components/ui/ActionMenu.css").replace(/\/\*[\s\S]*?\*\//g, "");
const modulesCss = ler("src/styles/modules.css").replace(/\/\*[\s\S]*?\*\//g, "");

const LISTAGENS_FINANCEIRAS = [
  "src/pages/payments/PaymentListPage.jsx",
  "src/pages/installments/InstallmentListPage.jsx",
  "src/pages/fees/FeeListPage.jsx"
];

// Retângulo no formato que `getBoundingClientRect()` devolve — com `right` e
// `bottom` derivados, que é onde um teste escrito à mão erra.
const rect = (left, top, width, height) => ({
  left, top, width, height, right: left + width, bottom: top + height
});

// ═══════════════════════════════════════════════════════════════════════════
// 1 — O PAINEL SAI DO CONTÊINER QUE RECORTA (a causa)
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.1 — o painel é renderizado em portal", () => {
  test("o componente importa `createPortal` do `react-dom`", () => {
    assert.match(
      menu, /import\s*\{[^}]*createPortal[^}]*\}\s*from\s*['"]react-dom['"]/,
      "o portal vem do `react-dom`, que já é dependência — zero dependência nova"
    );
  });

  test("e monta o painel no `document.body`", () => {
    assert.match(
      menu, /createPortal\(\s*painel\s*,\s*document\.body\s*\)/,
      "`document.body` é o único ancestral garantidamente livre dos três `overflow`"
    );
  });

  test("nenhum painel de menu é declarado dentro da subárvore do wrapper", () => {
    // A prova negativa que importa: se alguma listagem voltasse a escrever o
    // painel na mão dentro do `<table>`, ele voltaria a ser recortado pelo
    // `<td>` — e o defeito voltaria calado, sem quebrar nada mais.
    for (const arquivo of LISTAGENS_FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.ok(
        !/action-menu__lista/.test(codigo),
        `${arquivo}: o painel do menu não pode ser declarado dentro da tabela — ` +
        `o \`<td>\` tem \`overflow: hidden\` e recorta`
      );
    }

    // E no próprio componente: a classe do painel aparece UMA vez, no elemento
    // que vai para o portal. Duas ocorrências seriam um painel fora dele.
    const ocorrencias = menu.match(/className="action-menu__lista"/g) || [];
    assert.equal(
      ocorrencias.length, 1,
      "há exatamente um painel, e ele é o que o portal leva para o `body`"
    );
  });

  test("o painel é `fixed`, e não mais `absolute`", () => {
    assert.match(
      menuCss, /\.action-menu__lista\s*\{[^}]*position:\s*fixed/,
      "`absolute` é ancorado ao contêiner que recorta; `fixed`, ao viewport"
    );
    assert.ok(
      !/\.action-menu__lista\s*\{[^}]*position:\s*absolute/.test(menuCss),
      "sobrou `position: absolute` no painel"
    );
  });

  test("nenhum ancestral do menu cria bloco de contenção", () => {
    // `position: fixed` deixa de ser ancorado ao viewport se QUALQUER ancestral
    // tiver `transform`, `filter`, `contain` ou `perspective`. Se alguém puser
    // um desses no layout ou na tabela, o portal continua funcionando e o
    // POSICIONAMENTO volta a errar — sem erro nenhum no console.
    const ANCESTRAIS = [
      "src/components/layout/AppLayout.css",
      "src/styles/modules.css"
    ];
    for (const arquivo of ANCESTRAIS) {
      const css = ler(arquivo).replace(/\/\*[\s\S]*?\*\//g, "");
      // `text-transform` não conta — não cria bloco de contenção. A borda de
      // palavra é o que separa um do outro.
      assert.ok(
        !/(^|[\s;{])(transform|filter|perspective|contain)\s*:/m.test(css),
        `${arquivo}: propriedade que cria bloco de contenção quebraria o \`fixed\` do menu`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — A CONTA DO POSICIONAMENTO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.1 — onde o painel cai", () => {
  const painel = { width: 180, height: 160 };
  const desktop = { width: 1024, height: 768 };

  test("alinha pela DIREITA do gatilho, abrindo para baixo", () => {
    const gatilho = rect(900, 300, 40, 40);
    const { top, left } = posicaoDoPainel(gatilho, painel, desktop);
    assert.equal(left, 760, "a borda direita do painel encosta na do gatilho (940 - 180)");
    assert.equal(top, 344, "e abre logo abaixo do gatilho (340 + 4 de folga)");
  });

  test("vira para a ESQUERDA quando a borda esquerda ficaria fora — o caso de 360 px", () => {
    const gatilho = rect(120, 300, 40, 40);
    const { left } = posicaoDoPainel(gatilho, painel, { width: 360, height: 640 });
    // Alinhado pela direita daria 160 - 180 = -20: metade do menu fora da tela.
    assert.equal(left, 120, "alinha pela esquerda do gatilho");
    assert.ok(left >= 0, "a coordenada nunca é negativa");
  });

  test("vira para CIMA quando não cabe abaixo — a última linha visível", () => {
    const gatilho = rect(900, 700, 40, 40);
    const { top } = posicaoDoPainel(gatilho, painel, desktop);
    // Abaixo daria 744 + 160 = 904, muito além dos 768 da tela.
    assert.equal(top, 536, "abre acima do gatilho (700 - 160 - 4)");
  });

  test("um painel maior que a tela ainda fica DENTRO do viewport", () => {
    // O caso degenerado: não cabe em lugar nenhum. A regra da fase é que a
    // coordenada nunca sai do viewport — então ele encosta na margem.
    const { top, left } = posicaoDoPainel(
      rect(10, 10, 40, 40), { width: 400, height: 900 }, { width: 360, height: 640 }
    );
    assert.ok(left >= 0 && top >= 0, "nem `left` nem `top` saem da tela");
    assert.equal(left, 8);
    assert.equal(top, 8);
  });

  test("varrendo a tela inteira, nenhuma posição sai do viewport", () => {
    // A prova que uma bateria de casos escolhidos a dedo não dá: qualquer
    // gatilho, em qualquer canto, nas duas larguras que o projeto sustenta.
    for (const tela of [{ width: 360, height: 640 }, { width: 1024, height: 768 }]) {
      for (let x = 0; x <= tela.width - 40; x += 40) {
        for (let y = 0; y <= tela.height - 40; y += 40) {
          const { top, left } = posicaoDoPainel(rect(x, y, 40, 40), painel, tela);
          assert.ok(left >= 0, `left ${left} negativo em ${tela.width}x${tela.height}`);
          assert.ok(top >= 0, `top ${top} negativo em ${tela.width}x${tela.height}`);
          assert.ok(
            left + painel.width <= tela.width,
            `o painel passa da borda direita em ${tela.width}x${tela.height}`
          );
          assert.ok(
            top + painel.height <= tela.height,
            `o painel passa da borda de baixo em ${tela.width}x${tela.height}`
          );
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — O QUE NÃO PODIA QUEBRAR NA MUDANÇA
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.1 — o comportamento que sobreviveu ao portal", () => {
  test("Esc continua fechando e devolvendo o foco ao gatilho", () => {
    assert.match(menu, /addEventListener\(\s*["']keydown["']/, "escuta o teclado");
    assert.match(menu, /["']Escape["']/, "e reconhece o Esc");
    assert.match(menu, /gatilhoRef/, "guarda a referência do gatilho");
    assert.match(
      menu, /gatilhoRef\.current\?\.focus\(\)/,
      "e a chama no fechamento — sem isso o foco vai para o início do documento"
    );
    assert.match(menu, /abriuAlgumaVez/, "sem roubar o foco na montagem de cada linha");
  });

  test("o clique fora considera o PAINEL, que não é mais descendente do gatilho", () => {
    // A armadilha do portal: `raizRef.contains(alvo)` sozinho passaria a
    // fechar o menu no primeiro clique DENTRO dele.
    assert.match(menu, /painelRef\.current\?\.contains\(/, "o painel entra na conta");
    assert.match(menu, /gatilhoRef\.current\?\.contains\(/, "e o gatilho também");
    assert.match(menu, /addEventListener\(\s*["']mousedown["']/, "por `mousedown`, não `click`");
  });

  test("nenhuma regra CSS remove o anel de foco do gatilho", () => {
    assert.ok(!/outline\s*:\s*none/.test(menuCss), "`outline: none` na folha do menu");
    assert.ok(
      !/\.action-menu__gatilho[^{]*\{[^}]*outline\s*:\s*(none|0)/.test(menuCss),
      "o anel de foco do gatilho vem da regra global e não é sobrescrito aqui"
    );
  });

  test("os papéis de acessibilidade continuam no painel", () => {
    assert.match(menu, /aria-haspopup="menu"/);
    assert.match(menu, /aria-expanded=\{aberto\}/);
    assert.match(menu, /role="menu"/);
    assert.match(menu, /role="menuitem"/);
  });

  test("a ação destrutiva continua distinta", () => {
    assert.match(menu, /destrutivo/);
    assert.match(menuCss, /\.action-menu__item--destrutivo\s*\{[^}]*--color-danger/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 — ROLAGEM FECHA O MENU, E OS OUVINTES SÃO DEVOLVIDOS
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.1 — rolar fecha, e o cleanup devolve os ouvintes", () => {
  test("escuta `scroll` e `resize`", () => {
    // Um painel `fixed` ancorado a um botão que rolou fica flutuando descolado
    // da linha a que pertence. Menu apontando para a linha errada é pior que
    // menu nenhum.
    assert.match(menu, /addEventListener\(\s*["']scroll["']/, "a rolagem fecha o menu");
    assert.match(menu, /addEventListener\(\s*["']resize["']/, "e o redimensionamento também");
  });

  test("o `scroll` é escutado em CAPTURA", () => {
    // `scroll` não borbulha. Sem `capture: true`, a rolagem horizontal da
    // `.table-wrapper` e a vertical da `.main-content` — que são exatamente as
    // duas desta tela — nunca chegariam a um ouvinte do `window`.
    assert.match(
      menu, /addEventListener\(\s*["']scroll["'],\s*\w+,\s*true\s*\)/,
      "sem captura, a rolagem que importa passa despercebida"
    );
  });

  test("os quatro ouvintes são removidos no cleanup", () => {
    // Vazamento de ouvinte numa lista de 20 linhas é 20 órfãos por página
    // virada.
    for (const evento of ["keydown", "mousedown", "scroll", "resize"]) {
      assert.match(
        menu, new RegExp(`removeEventListener\\(\\s*["']${evento}["']`),
        `o ouvinte de \`${evento}\` não é devolvido`
      );
    }
    assert.match(
      menu, /removeEventListener\(\s*["']scroll["'],\s*\w+,\s*true\s*\)/,
      "remover sem a captura não remove o ouvinte que foi posto COM captura"
    );

    const adicionados = (menu.match(/\.addEventListener\(/g) || []).length;
    const removidos = (menu.match(/\.removeEventListener\(/g) || []).length;
    assert.equal(adicionados, removidos, "cada ouvinte posto tem o seu removido");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 — A CÉLULA DE AÇÕES E O TRUNCAMENTO
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.1 — a nota da célula cabe inteira", () => {
  test("a coluna de ações comporta a nota mais longa", () => {
    const largura = modulesCss.match(/\.col-acoes-menu\s*\{\s*width:\s*(\d+)px/);
    assert.ok(largura, "a coluna do menu precisa ter largura declarada");
    assert.ok(
      Number(largura[1]) >= 120,
      `\`col-acoes-menu\` tem ${largura[1]}px: "Reparcelada" em 0.85rem itálico ` +
      `não cabe, e \`overflow: hidden\` da célula corta sem avisar`
    );
  });

  test("a nota não quebra nem encolhe", () => {
    assert.match(
      modulesCss, /\.sem-recibo[\s\S]{0,200}?white-space:\s*nowrap/,
      "a nota precisa de `nowrap` explícito"
    );
    assert.match(modulesCss, /\.acao-indisponivel[\s\S]{0,200}?white-space:\s*nowrap/);
    assert.match(
      modulesCss, /\.actions-cell\s+\.sem-recibo[\s\S]*?flex-shrink:\s*0/,
      "sem `flex-shrink: 0` o flex espreme a nota até o truncamento"
    );
  });

  test("as três listagens empilham a nota acima do gatilho", () => {
    assert.match(
      modulesCss, /\.actions-cell--menu\s*\{[^}]*flex-direction:\s*column/,
      "a célula do menu empilha"
    );
    for (const arquivo of LISTAGENS_FINANCEIRAS) {
      assert.match(
        semComentarios(ler(arquivo)), /className="actions-cell actions-cell--menu"/,
        `${arquivo}: a célula de ações precisa da classe empilhada`
      );
    }
  });

  test("a largura recuperada não recriou truncamento na coluna de moeda", () => {
    // A regressão da F-1b.2: "R$ 3.50…". Os 24 px que a coluna de ações ganhou
    // saíram da coluna AUTO de texto livre, que trunca por projeto — nunca da
    // coluna de dinheiro.
    const moeda = modulesCss.match(/\.col-money\s*\{\s*width:\s*(\d+)px/);
    assert.ok(moeda, "`col-money` precisa continuar existindo");
    assert.ok(
      Number(moeda[1]) >= 150,
      `\`col-money\` caiu para ${moeda[1]}px — valor cortado é pior que valor ausente`
    );

    for (const arquivo of LISTAGENS_FINANCEIRAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.ok(
        !/className="cell-num cell-truncate"|className="cell-truncate cell-num"/.test(codigo),
        `${arquivo}: coluna de dinheiro não recebe truncamento`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6 — SINGULAR E PLURAL
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.1 — a pluralização", () => {
  // As quatro palavras dos rodapés do sistema.
  const PALAVRAS = [
    ["parcela", "parcelas"],
    ["pagamento", "pagamentos"],
    ["honorário", "honorários"],
    ["movimentação", "movimentações"]
  ];

  test("0, 1, 2 e um número grande, nas quatro palavras", () => {
    for (const [singular, plural] of PALAVRAS) {
      // Zero vai para o plural — é a concordância do português.
      assert.equal(pluralizar(0, singular), plural, `0 ${singular}`);
      assert.equal(pluralizar(1, singular), singular, `1 ${singular} — o defeito da fase`);
      assert.equal(pluralizar(2, singular), plural, `2 ${singular}`);
      assert.equal(pluralizar(137, singular), plural, `137 ${singular}`);
    }
  });

  test("`movimentação` não vira `movimentaçãos`", () => {
    // A regra de "ão" precisa vir ANTES da de vogal, e é a única das quatro
    // palavras que a exige.
    assert.equal(pluralDe("movimentação"), "movimentações");
    assert.equal(pluralDe("seção"), "seções");
  });

  test("o acento do singular sobrevive", () => {
    assert.equal(pluralDe("honorário"), "honorários");
  });

  test("uma palavra já no plural não ganha um segundo `s`", () => {
    assert.equal(pluralDe("parcelas"), "parcelas");
  });

  test("entrada vazia ou não-texto volta como veio, sem estourar", () => {
    assert.equal(pluralDe(""), "");
    assert.equal(pluralDe(undefined), undefined);
    assert.equal(pluralDe(null), null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 7 — OS RODAPÉS DAS QUATRO LISTAGENS
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.1 — o rodapé concorda com a contagem", () => {
  test('"1 parcelas" não acontece mais', () => {
    // O caso exato observado na validação: Parcelas filtradas por honorário.
    assert.equal(frasePosicao(resumoDaPagina({ page: 1, limit: 20, total: 1 }), "parcela"),
      "1 parcela");
  });

  test("página única diz o total; paginada diz o intervalo", () => {
    assert.equal(frasePosicao(resumoDaPagina({ page: 1, limit: 20, total: 11 }), "pagamento"),
      "11 pagamentos");
    assert.equal(frasePosicao(resumoDaPagina({ page: 1, limit: 20, total: 23 }), "parcela"),
      "1–20 de 23 parcelas");
    assert.equal(frasePosicao(resumoDaPagina({ page: 2, limit: 20, total: 23 }), "parcela"),
      "21–23 de 23 parcelas");
  });

  test("as quatro listagens passam o rótulo no SINGULAR", () => {
    const RODAPES = [
      ["src/pages/payments/PaymentListPage.jsx", "pagamento"],
      ["src/pages/installments/InstallmentListPage.jsx", "parcela"],
      ["src/pages/fees/FeeListPage.jsx", "honorário"],
      ["src/components/financeiro/FeeStatement.jsx", "movimentação"]
    ];
    for (const [arquivo, singular] of RODAPES) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, new RegExp(`rotulo="${singular}"`),
        `${arquivo}: o rótulo do paginador é o singular — o plural é de \`pluralizar\``
      );
    }
  });

  test("o paginador não escreve plural na mão", () => {
    const paginador = semComentarios(ler("src/components/ui/Paginador.jsx"));
    assert.ok(
      !/registros|pagamentos|parcelas|honorários|movimentações/.test(paginador),
      "nenhum plural literal sobrou no componente — a concordância é da função pura"
    );
  });
});
