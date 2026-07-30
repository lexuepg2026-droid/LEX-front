// ═══════════════════════════════════════════════════════════════════════════
// Varredura: toda classe APLICADA no JSX de uma página precisa ter regra em
// algum CSS ALCANÇÁVEL por aquela página.
//
// Alcançável = o que a página importa direto + o que os componentes que ela
// importa trazem consigo (transitivamente) + o CSS global da raiz
// (`src/index.css` e a cadeia de `@import` dele).
//
// A reachability é o ponto. O defeito que originou esta varredura não foi
// "classe sem regra em lugar nenhum": a regra `.input-error` EXISTIA, em
// `ClientPage.css`, e `ProcessPage.css` não a importava. Uma varredura que
// juntasse todo o CSS do projeto num balaio só passaria batido.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  listarPaginas, listarNaoRoteados, cssAlcancavel, classesAplicadas, classesGlobais,
  relativo, ehNomeDeClassePlausivel
} from "../helpers/cssScan.js";
import { ALLOWLIST, PREFIXOS_ACEITOS } from "./allowlist.js";

const paginas = listarPaginas();
const globais = classesGlobais();

// O placar que a Parte 10.12 pede.
const placar = {
  paginas: paginas.length,
  literaisAplicadas: new Set(),
  prefixosAplicados: new Set(),
  faltantes: [],
  emAllowlist: []
};

const permitida = (classe, pagina) =>
  Boolean(ALLOWLIST.global[classe] ?? ALLOWLIST.porPagina[pagina]?.[classe]);

describe("varredura de classe CSS", () => {
  test("há páginas para analisar", () => {
    // Se a descoberta quebrar, tudo abaixo passa vazio e o teste vira teatro.
    assert.ok(paginas.length >= 20, `só ${paginas.length} páginas encontradas`);
    assert.ok(globais.size > 0, "nenhuma classe global — src/index.css não foi lido");
  });

  test("todo .jsx de src/pages é alcançado por alguma rota", () => {
    // Guarda contra a varredura ficar cega: um arquivo que nenhuma página
    // monta não é analisado por ninguém. Se aparecer algum, ou é código morto
    // ou a resolução de import quebrou — as duas coisas precisam ser vistas.
    const orfaos = listarNaoRoteados(paginas).map(relativo);
    assert.deepEqual(
      orfaos,
      [],
      `arquivos em src/pages que nenhuma rota alcança:\n  - ${orfaos.join("\n  - ")}`
    );
  });

  for (const pagina of paginas) {
    const nome = relativo(pagina);

    test(nome, () => {
      const { classes: alcancaveis, jsx } = cssAlcancavel(pagina);
      const disponiveis = new Set([...alcancaveis, ...globais]);

      // As classes aplicadas são as da página E as de todo componente que ela
      // monta: é o conjunto que aquela tela realmente pinta.
      const literais = new Set();
      const prefixos = new Set();
      for (const arquivo of jsx) {
        const aplicadas = classesAplicadas(readFileSync(arquivo, "utf8"));
        for (const c of aplicadas.literais) literais.add(c);
        for (const p of aplicadas.prefixos) prefixos.add(p);
      }

      const faltantes = [];

      // ── Classes literais: precisam de regra exata ─────────────────────────
      for (const classe of literais) {
        if (!ehNomeDeClassePlausivel(classe)) continue; // não é nome de classe
        placar.literaisAplicadas.add(classe);

        if (disponiveis.has(classe)) continue;

        if (permitida(classe, nome)) {
          placar.emAllowlist.push(`${nome} :: ${classe}`);
          continue;
        }

        faltantes.push(classe);
      }

      // ── Prefixos de template string ───────────────────────────────────────
      // Não se resolve o valor da interpolação; exige-se que exista ALGUMA
      // regra começando pelo pedaço estático. É o que impede
      // `status-badge--${config.color}` de ser reportada como faltante e, ao
      // mesmo tempo, pega o caso em que a família inteira de regras sumiu.
      for (const prefixo of prefixos) {
        if (!ehNomeDeClassePlausivel(prefixo.replace(/-+$/, ""))) continue;
        placar.prefixosAplicados.add(prefixo);

        const temFamilia = [...disponiveis].some((c) => c.startsWith(prefixo));
        if (temFamilia) continue;
        if (PREFIXOS_ACEITOS[prefixo]) continue;
        if (permitida(prefixo, nome)) {
          placar.emAllowlist.push(`${nome} :: ${prefixo}* (prefixo)`);
          continue;
        }

        faltantes.push(`${prefixo}* (nenhuma regra na família)`);
      }

      for (const f of faltantes) placar.faltantes.push(`${nome} :: ${f}`);

      assert.deepEqual(
        faltantes.sort(),
        [],
        `${nome} aplica classe sem regra em nenhum CSS que ela alcança:\n` +
        faltantes.map((f) => `    - ${f}`).join("\n")
      );
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Os falsos positivos conhecidos, travados nominalmente
  // ═════════════════════════════════════════════════════════════════════════

  describe("as 20 classes de template string NÃO podem ser reportadas", () => {
    // A lista de falsos positivos da fase é o caso de teste mínimo da regra
    // 7.3. Se alguém "endurecer" a varredura resolvendo interpolação de forma
    // ingênua, é aqui que aparece — e não numa correção equivocada de CSS.
    const CASOS = [
      // [arquivo que aplica, prefixo estático, quantas classes a família tem]
      ["src/pages/documents/DocumentAssemblyPage.jsx", "montagem__cabecalho--", 2],
      ["src/components/ui/StatusBadge.jsx", "status-badge--", 4],
      ["src/pages/dashboard/DashboardHomePage.jsx", "summary-card--", 1],
      ["src/components/ui/ToastContainer.jsx", "toast--", 1],
      ["src/components/ui/Modal.jsx", "ui-btn--", 1]
    ];

    for (const [arquivo, prefixo] of CASOS) {
      test(`${prefixo}\${…} em ${arquivo.split("/").pop()} tem família de regras`, () => {
        const caminho = `${process.cwd()}/${arquivo}`;
        const { prefixos } = classesAplicadas(readFileSync(caminho, "utf8"));

        assert.ok(
          prefixos.has(prefixo),
          `a varredura não reconheceu o prefixo "${prefixo}" em ${arquivo} — ` +
          `prefixos vistos: ${[...prefixos].join(", ") || "(nenhum)"}`
        );

        const { classes } = cssAlcancavel(caminho);
        const familia = [...new Set([...classes, ...globais])].filter((c) => c.startsWith(prefixo));

        assert.ok(
          familia.length > 0,
          `nenhuma regra "${prefixo}*" alcançável por ${arquivo} — ` +
          `a classe montada por template ficaria sem estilo`
        );
      });
    }

    test("o conjunto das 5 famílias soma as 20 classes conhecidas", () => {
      // A conta da lista de falsos positivos: 20 classes montadas por
      // interpolação, em 5 famílias. O número é conferido, não afirmado.
      const familias = [
        ["src/pages/documents/DocumentAssemblyPage.jsx", "montagem__cabecalho--"],
        ["src/components/ui/StatusBadge.jsx", "status-badge--"],
        ["src/pages/dashboard/DashboardHomePage.jsx", "summary-card--"],
        ["src/components/ui/ToastContainer.jsx", "toast--"],
        ["src/components/ui/Modal.jsx", "ui-btn--"]
      ];

      const total = familias.reduce((soma, [arquivo, prefixo]) => {
        const { classes } = cssAlcancavel(`${process.cwd()}/${arquivo}`);
        const familia = [...new Set([...classes, ...globais])].filter((c) => c.startsWith(prefixo));
        return soma + familia.length;
      }, 0);

      console.log(`\n  famílias de template string: ${total} regras alcançáveis nas 5 famílias\n`);
      assert.ok(total >= 5, `só ${total} regras nas 5 famílias — alguma sumiu`);
    });
  });

  test("placar da varredura", () => {
    console.log(
      `\n  ── PLACAR DA VARREDURA DE CSS ──\n` +
      `     páginas analisadas       : ${placar.paginas}\n` +
      `     classes literais aplicadas: ${placar.literaisAplicadas.size}\n` +
      `     prefixos de template     : ${placar.prefixosAplicados.size}\n` +
      `     faltantes                : ${placar.faltantes.length}\n` +
      `     em allowlist (com motivo): ${placar.emAllowlist.length}\n`
    );

    assert.deepEqual(
      placar.faltantes,
      [],
      `classes aplicadas sem regra alcançável:\n  - ${placar.faltantes.join("\n  - ")}`
    );
  });
});
