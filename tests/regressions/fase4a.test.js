// ═══════════════════════════════════════════════════════════════════════════
// FASE 4a — manutenção sem decisão pendente (DEC-156 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. O foco de verdade (o primeiro
// Tab, o Enter, o Tab seguinte) fica na verificação do navegador e no roteiro
// visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../..", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── Item 1 — "Pular para o conteúdo" (DEC-156) ───────────────────────────
describe("Fase 4a · item 1 — \"Pular para o conteúdo\" (DEC-156)", () => {
  const componente = semComentarios(ler("src/components/ui/PularParaConteudo.jsx"));
  const css = semComentarios(ler("src/components/ui/PularParaConteudo.css"));
  const layouts = {
    advogada: semComentarios(ler("src/components/layout/AppLayout.jsx")),
    portal: semComentarios(ler("src/components/portal/PortalLayout.jsx"))
  };

  test("o link leva ao #conteudo, move o foco para lá e não deixa o hash na URL", () => {
    assert.match(componente, /export const ID_DO_CONTEUDO = 'conteudo'/);
    assert.match(componente, /href=\{`#\$\{ID_DO_CONTEUDO\}`\}/);
    assert.match(componente, />\s*Pular para o conteúdo\s*</);
    assert.match(componente, /e\.preventDefault\(\);\s*alvo\.focus\(\);/);
  });

  for (const [qual, fonte] of Object.entries(layouts)) {
    test(`layout da ${qual === "portal" ? "portal" : "advogada"}: o link é o PRIMEIRO elemento, antes de qualquer outro focável`, () => {
      const corpo = fonte.slice(fonte.indexOf("return ("));
      const posLink = corpo.indexOf("<PularParaConteudo />");
      assert.ok(posLink > 0, "o layout monta o link");
      for (const depois of ["<Header", "<header", "<FaixaContexto", "<EmailConfirmationBanner", "<button", "<main"]) {
        const pos = corpo.indexOf(depois);
        if (pos !== -1) assert.ok(posLink < pos, `o link vem antes de ${depois}`);
      }
    });

    test(`layout da ${qual === "portal" ? "portal" : "advogada"}: o <main> é o alvo, com tabIndex={-1}`, () => {
      assert.match(fonte, /<main id=\{ID_DO_CONTEUDO\} tabIndex=\{-1\}/);
      assert.equal((fonte.match(/<main\b/g) || []).length, 1, "um <main> só");
    });
  }

  test("nas telas de autenticação o link não entra (o primeiro Tab já é o \"Voltar\")", () => {
    const auth = semComentarios(ler("src/components/layout/LayoutAutenticacao.jsx"));
    assert.doesNotMatch(auth, /PularParaConteudo/);
  });

  test("o portal o importa de ui/, nunca de layout/ (isolamento da Fase 3.2)", () => {
    assert.match(layouts.portal, /from '\.\.\/ui\/PularParaConteudo\.jsx'/);
    assert.doesNotMatch(layouts.portal, /layout\/PularParaConteudo/);
  });

  test("escondido sem display:none (senão não recebe foco), visível no foco, com o anel da marca", () => {
    const repouso = css.match(/\.pular-conteudo\s*\{([^}]*)\}/)[1];
    assert.doesNotMatch(repouso, /display:\s*none|visibility:\s*hidden/);
    assert.match(repouso, /position:\s*fixed/);
    assert.match(repouso, /clip:\s*rect\(0 0 0 0\)/);
    const foco = css.match(/\.pular-conteudo:focus\s*\{([^}]*)\}/)[1];
    assert.match(foco, /clip:\s*auto/);
    assert.match(foco, /background-color:\s*var\(--color-marca-escuro\)/);
    assert.match(foco, /color:\s*var\(--color-marca-texto\)/);
    const anel = css.match(/\.pular-conteudo:focus-visible\s*\{([^}]*)\}/)[1];
    assert.match(anel, /outline:\s*var\(--focus-ring-width\) solid var\(--color-marca-foco\)/);
    // A regra 8 da fase: `--color-primary` é só fundo, e aqui nem fundo é.
    assert.doesNotMatch(css, /--color-primary/);
  });

  test("o <main> focado mostra o anel por dentro, nos dois layouts", () => {
    assert.match(semComentarios(ler("src/components/layout/AppLayout.css")),
      /\.main-content:focus-visible\s*\{[^}]*outline-offset:\s*calc\(-1 \* var\(--focus-ring-width\)\)/);
    assert.match(semComentarios(ler("src/components/portal/Portal.css")),
      /\.portal__conteudo:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--color-marca-foco\)/);
  });

  test("os pares de contraste do link estão medidos", () => {
    const pares = ler("tests/css/contrastePares.js");
    for (const nome of [
      "pular para o conteúdo: texto / --color-marca-escuro",
      "pular para o conteúdo: anel / --color-marca-escuro",
      "pular para o conteúdo: anel / --color-marca-fundo (cabeçalho, portal)"
    ]) assert.ok(pares.includes(nome), nome);
  });
});

// ── Item 2 — a frase própria do percentual (DEC-157) ─────────────────────
import {
  validarHonorario,
  mensagemDoCampoPercentual,
  MENSAGEM_FAIXA_DO_PERCENTUAL,
  PERCENTUAL_MINIMO,
  PERCENTUAL_MAXIMO
} from "../../src/utils/feeCalc.js";

describe("Fase 4a · item 2 — \"O percentual vai de 0,01 a 100.\" (DEC-157)", () => {
  const base = { processoId: "p1", descricao: "Contrato", tipo: "percentual", valorBase: 1000 };
  const tela = semComentarios(ler("src/pages/fees/FeeFormPage.jsx"));

  test("a frase é exatamente a decidida, e a faixa continua 0,01–100 (a regra não mudou)", () => {
    assert.equal(MENSAGEM_FAIXA_DO_PERCENTUAL, "O percentual vai de 0,01 a 100.");
    assert.equal(PERCENTUAL_MINIMO, 0.01);
    assert.equal(PERCENTUAL_MAXIMO, 100);
  });

  test("acima de 100 e abaixo de 0,01 o envio é barrado, com a frase, no campo percentual", () => {
    for (const fora of [150, 100.01, 1000, 0.009, 0.001, 0, -5, "abc"]) {
      const p = validarHonorario({ ...base, percentual: fora });
      assert.deepEqual(p, { campo: "percentual", mensagem: MENSAGEM_FAIXA_DO_PERCENTUAL }, String(fora));
    }
  });

  test("100 e 0,01 passam (as bordas são do intervalo)", () => {
    for (const dentro of [100, "100", 0.01, "0.01", 12.5, 33.33]) {
      assert.equal(validarHonorario({ ...base, percentual: dentro }), null, String(dentro));
    }
  });

  test("o `invalid` do navegador vira a frase própria — faixa, vazio e casas decimais", () => {
    assert.equal(mensagemDoCampoPercentual({ rangeOverflow: true }), MENSAGEM_FAIXA_DO_PERCENTUAL);
    assert.equal(mensagemDoCampoPercentual({ rangeUnderflow: true, stepMismatch: true }), MENSAGEM_FAIXA_DO_PERCENTUAL);
    assert.equal(mensagemDoCampoPercentual({ badInput: true }), MENSAGEM_FAIXA_DO_PERCENTUAL);
    assert.equal(mensagemDoCampoPercentual({ valueMissing: true }), "Honorário do tipo percentual exige o percentual contratado");
    assert.equal(mensagemDoCampoPercentual({ stepMismatch: true }), "O percentual aceita até duas casas decimais.");
  });

  test("o campo mantém min/max/step e intercepta o `invalid` com preventDefault (sem o balão do navegador)", () => {
    const campo = tela.match(/<input\s+id="fee-percentual"[\s\S]*?\/>/)[0];
    for (const attr of ['min="0.01"', 'max="100"', 'step="0.01"', "required", "onInvalid={handlePercentualInvalido}",
      "className={campoComErro === 'percentual' ? 'input-erro' : undefined}"]) {
      assert.ok(campo.includes(attr), attr);
    }
    assert.match(tela, /const handlePercentualInvalido = \(e\) => \{\s*e\.preventDefault\(\);/);
    assert.match(tela, /setErroDoPercentual\(mensagemDoCampoPercentual\(e\.target\.validity\)\);\s*setCampoComErro\('percentual'\);/);
    // Sem `noValidate`: os outros campos continuam com a validação de sempre.
    assert.doesNotMatch(tela, /noValidate/);
  });

  test("a frase aparece NO CAMPO, ligada ao input, e o handleSubmit não envia com o problema", () => {
    assert.match(tela, /\{erroDoPercentual && \(\s*<span id="fee-percentual-erro" className="form-erro-campo" role="alert">/);
    assert.match(tela, /aria-describedby=\{erroDoPercentual \? 'fee-percentual-erro' : undefined\}/);
    const submit = tela.slice(tela.indexOf("const handleSubmit"), tela.indexOf("setLoading(true)"));
    assert.match(submit, /const problema = validarHonorario\(formData\);\s*if \(problema\) \{[\s\S]*?return;\s*\}/);
    assert.doesNotMatch(submit, /feeService\./, "nada é enviado antes da validação");
  });

  test("a classe da frase tem regra, na folha que a tela importa, com o par medido", () => {
    const css = semComentarios(ler("src/pages/clients/ClientPage.css"));
    assert.match(css, /\.form-erro-campo\s*\{[^}]*color:\s*var\(--color-danger-text\)/);
    assert.match(ler("tests/css/contrastePares.js"), /honorário: erro do percentual \/ --color-bg/);
  });
});
