// ═══════════════════════════════════════════════════════════════════════════
// `--color-text-muted` NÃO É COR DE TEXTO (DEC-075, trava da Fase 2a)
//
// O token mede ~3:1 nos dois modos. A Fase 1 trocou os 41 usos de texto por
// `--color-text-discreto` e deixou SETE, todos não textuais, listados no
// relatório da fase (seção 3). Um comentário em `variables.css` pede para não
// usá-lo em texto; esta varredura é o que impede o oitavo.
//
// Quem precisar de um novo uso não textual (ícone decorativo) acrescenta à
// lista com o motivo — a lista é a decisão, escrita.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = new URL("../../src", import.meta.url).pathname;

const PERMITIDOS = {
  "components/dashboard/BlocoDoPainel.css .bloco__icone": "ícone decorativo ao lado do título",
  "pages/dashboard/DashboardPage.css .card-icon": "ícone decorativo do cartão",
  "pages/dashboard/DashboardPage.css .summary-card--neutral .card-icon": "ícone decorativo do cartão neutro",
  "components/ui/EmptyState.css .empty-state__icon": "ícone decorativo, já esmaecido",
  "components/secoes/VariableSelector.css .var-selector__search-icon": "lupa decorativa dentro do campo",
  "components/documents/SecaoLibraryPanel.css .biblioteca__busca": "o wrapper só pinta a lupa; o input tem cor própria",
  "pages/documents/DocumentFinalTextPage.css .final__lacuna-ir:disabled": "controle desabilitado (isento pelo WCAG 1.4.3)",
};

const arquivos = (dir, exts) => readdirSync(dir).flatMap((nome) => {
  const c = join(dir, nome);
  if (statSync(c).isDirectory()) return arquivos(c, exts);
  return exts.some((e) => nome.endsWith(e)) ? [c] : [];
});

const semComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

const usosEmCss = () => {
  const usos = [];
  for (const caminho of arquivos(RAIZ, [".css"])) {
    const rel = relative(RAIZ, caminho);
    if (rel === "styles/variables.css") continue;
    const css = semComentarios(readFileSync(caminho, "utf8"));
    for (const regra of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const seletor = regra[1].split(/\s+/).filter(Boolean).join(" ");
      const n = [...regra[2].matchAll(/(?:^|;)\s*color\s*:[^;]*var\(--color-text-muted\b/g)].length;
      for (let i = 0; i < n; i++) usos.push(`${rel} ${seletor}`);
    }
  }
  return usos;
};

describe("--color-text-muted não é cor de texto", () => {
  test("nenhum `color:` fora dos sete usos permitidos", () => {
    const usos = usosEmCss();
    const fora = usos.filter((u) => !(u in PERMITIDOS));
    assert.deepEqual(
      fora, [],
      "use --color-text-discreto para texto discreto (DEC-075). --color-text-muted mede ~3:1 " +
      "e só serve para o que não é texto:\n  " + fora.join("\n  ")
    );
  });

  test("a lista de permitidos não guarda uso que já sumiu", () => {
    // Lista com entrada morta vira licença para o próximo que reusar o seletor.
    const usos = new Set(usosEmCss());
    assert.deepEqual(Object.keys(PERMITIDOS).filter((p) => !usos.has(p)), []);
  });

  test("nenhum JSX pinta com o token (`fill`, `color`, `stroke`)", () => {
    const culpados = [];
    for (const caminho of arquivos(RAIZ, [".jsx", ".js"])) {
      const fonte = readFileSync(caminho, "utf8").replace(/\/\/[^\n]*/g, "");
      if (/(?:fill|color|stroke)\s*:\s*['"`]var\(--color-text-muted\)/.test(fonte)) {
        culpados.push(relative(RAIZ, caminho));
      }
    }
    assert.deepEqual(culpados, [], "use var(--color-text-discreto) (DEC-075)");
  });
});
