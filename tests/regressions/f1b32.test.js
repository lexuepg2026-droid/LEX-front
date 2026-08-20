// ═══════════════════════════════════════════════════════════════════════════
// FASE F-1b.3.2 — O TECLADO NO MENU EM PORTAL (frontend)
//
// ── O defeito ────────────────────────────────────────────────────────────
// Na validação manual da F-1b.3.1 os passos 172, 175, 179, 181 e 182 passaram.
// O **178 falhou — por causa da própria correção**: o menu abria com Enter,
// mas o painel **não era acessível por Tab, só por mouse**.
//
// ── A causa: a outra metade do portal ────────────────────────────────────
// `createPortal` propaga EVENTOS pela árvore do React, mas a ordem de
// tabulação é a do **DOM real**. O painel é o último filho do `document.body`;
// o gatilho está numa célula no meio da tabela. Tab a partir do gatilho ia
// para a próxima célula da TABELA, não para dentro do menu.
//
// Antes da DEC-046 o painel era irmão imediato do gatilho e o Tab caía nele de
// graça. **Tirar o painel do contêiner que recortava tirou junto a ordem de
// foco natural.**
//
// ── Por que a suíte não pegou, e o que ela pega agora ────────────────────
// É FOCO. Não há DOM em `node --test` (Fase 2E.2), e o passo 178 existe
// exatamente para isto — funcionou como projetado: achou o que a suíte não
// alcança.
//
// O que dá para provar por varredura é a MECÂNICA, que é onde o defeito
// voltaria: que o foco é conduzido por chamada explícita, que a chamada vem
// DEPOIS do cálculo de posição, e que o `Tab` é interceptado com
// `preventDefault` — a linha que mais some numa refatoração.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const raiz = fileURLToPath(new URL("../../", import.meta.url));
const ler = (caminho) => readFileSync(join(raiz, caminho), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const menu = semComentarios(ler("src/components/ui/ActionMenu.jsx"));

// ═══════════════════════════════════════════════════════════════════════════
// 1 — O FOCO ENTRA NO PAINEL, E NA ORDEM CERTA
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.2 — o foco entra no painel ao abrir", () => {
  test("o componente foca o primeiro item por chamada explícita", () => {
    assert.match(
      menu, /itensFocaveis\(\)\[0\]\?\.focus\(\)/,
      "sem conduzir o foco, o Tab a partir do gatilho vai para a TABELA — " +
      "o painel é o último filho do `body`, e a ordem do Tab é a do DOM real"
    );
  });

  test("a chamada de foco vem DEPOIS do cálculo de posição", () => {
    // Focar antes focaria um elemento `visibility: hidden` no canto superior
    // esquerdo, e o navegador rolaria a página inteira até lá.
    const posCalculo = menu.indexOf("posicaoDoPainel(gatilho.getBoundingClientRect()");
    const posFoco = menu.indexOf("itensFocaveis()[0]?.focus()");
    assert.ok(posCalculo > 0, "o cálculo de posição precisa existir");
    assert.ok(posFoco > 0, "a chamada de foco precisa existir");
    assert.ok(
      posFoco > posCalculo,
      "o foco entra no painel DEPOIS de a posição estar calculada"
    );
  });

  test("e o efeito do foco DEPENDE da posição, que é o que garante a ordem", () => {
    // A ordem no arquivo não bastaria: é a lista de dependências que faz o
    // efeito só rodar quando `posicao` deixou de ser `null`.
    assert.match(
      menu, /if \(!aberto \|\| !posicao\) return;/,
      "o efeito de foco precisa desistir enquanto a posição não foi calculada"
    );
    assert.match(
      menu, /\}, \[aberto, posicao, itensFocaveis\]\);/,
      "`posicao` precisa estar nas dependências do efeito de foco"
    );
  });

  test("item desabilitado fica fora da lista focável", () => {
    // Um `<button disabled>` não é tabulável. Incluí-lo faria o ciclo parar
    // num elemento que o navegador se recusa a focar — o menu travaria no
    // "Baixando…" do recibo em curso.
    assert.match(
      menu, /\[role="menuitem"\]:not\(\[disabled\]\)/,
      "a consulta dos focáveis precisa excluir os desabilitados"
    );
  });

  test("nenhum `autoFocus` no projeto inteiro", () => {
    // Regra do projeto desde a F-1a: foco se move por chamada explícita, em
    // efeito, depois da posição.
    const arquivos = [];
    const varrer = (dir) => {
      for (const nome of readdirSync(join(raiz, dir))) {
        const rel = `${dir}/${nome}`;
        if (statSync(join(raiz, rel)).isDirectory()) varrer(rel);
        else if (/\.(jsx?|css)$/.test(nome)) arquivos.push(rel);
      }
    };
    varrer("src");
    assert.ok(arquivos.length > 50, "a varredura precisa alcançar o projeto todo");

    for (const arquivo of arquivos) {
      assert.ok(
        !/autoFocus/.test(semComentarios(ler(arquivo))),
        `${arquivo}: \`autoFocus\` rouba o foco na montagem`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — O TAB CIRCULA DENTRO DO PAINEL
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.2 — o Tab não escapa para a tabela", () => {
  test("o `keydown` trata `Tab`", () => {
    assert.match(menu, /e\.key !== ['"]Tab['"]/, "o Tab precisa ser interceptado");
  });

  test("distingue `shiftKey`", () => {
    assert.match(
      menu, /e\.shiftKey/,
      "Shift+Tab no primeiro item precisa ir para o último"
    );
  });

  test("chama `preventDefault` — a linha que mais some numa refatoração", () => {
    // Sem ela o navegador move o foco ANTES de o código correr, e a chamada de
    // `.focus()` vira correção tarde demais: o foco pisca na tabela e volta.
    const trecho = menu.slice(menu.indexOf("e.key !== 'Tab'"));
    const ocorrencias = (trecho.match(/e\.preventDefault\(\)/g) || []).length;
    assert.ok(
      ocorrencias >= 2,
      `o Tab precisa de \`preventDefault\` nos DOIS sentidos (achei ${ocorrencias})`
    );
  });

  test("o ciclo fecha nas duas pontas", () => {
    assert.match(
      menu, /ativo === primeiro[\s\S]{0,120}ultimo\.focus\(\)/,
      "Shift+Tab no primeiro vai para o último"
    );
    assert.match(
      menu, /ativo === ultimo[\s\S]{0,120}primeiro\.focus\(\)/,
      "Tab no último volta para o primeiro"
    );
  });

  test("foco que já escapou é trazido de volta", () => {
    assert.match(
      menu, /painelRef\.current\?\.contains\(ativo\)/,
      "enquanto o menu está aberto, o Tab pertence a ele"
    );
    assert.match(menu, /!dentro \|\| ativo === /, "o caso `fora do painel` entra na conta");
  });

  test("NÃO acrescentou setas — não há chamador", () => {
    // O passo 178 pede Tab, o Daniel testou Tab. Generalizar antes do segundo
    // caso é inventar requisito; se aparecer necessidade, é fase própria.
    assert.ok(
      !/ArrowUp|ArrowDown/.test(menu),
      "navegação por setas não tem chamador nesta fase"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — O QUE NÃO PODIA QUEBRAR (regressão da F-1b.3.1)
// ═══════════════════════════════════════════════════════════════════════════
describe("F-1b.3.2 — o que sobreviveu à mudança de foco", () => {
  test("Esc continua fechando e devolvendo o foco ao gatilho", () => {
    // É o único caminho de volta: com o Tab preso dentro do painel, sair dele
    // sem Esc deixaria de existir.
    assert.match(menu, /['"]Escape['"]/);
    assert.match(menu, /gatilhoRef/, "a referência do gatilho continua guardada");
    assert.match(
      menu, /gatilhoRef\.current\?\.focus\(\)/,
      "e continua sendo chamada no fechamento"
    );
    assert.match(menu, /abriuAlgumaVez/, "sem roubar o foco na montagem de cada linha");
  });

  test("o painel continua em portal, no `body`", () => {
    assert.match(menu, /createPortal\(\s*painel\s*,\s*document\.body\s*\)/);
  });

  test("os ouvintes de rolagem continuam postos e devolvidos", () => {
    assert.match(menu, /addEventListener\(\s*['"]scroll['"],\s*\w+,\s*true\s*\)/);
    assert.match(menu, /removeEventListener\(\s*['"]scroll['"],\s*\w+,\s*true\s*\)/);
    assert.match(menu, /addEventListener\(\s*['"]resize['"]/);
    assert.match(menu, /removeEventListener\(\s*['"]resize['"]/);

    const postos = (menu.match(/\.addEventListener\(/g) || []).length;
    const devolvidos = (menu.match(/\.removeEventListener\(/g) || []).length;
    assert.equal(postos, devolvidos, "cada ouvinte posto tem o seu removido");
  });
});
