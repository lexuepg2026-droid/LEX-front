// ═══════════════════════════════════════════════════════════════════════════
// PORTAL — a fase processual chega ao cliente em linguagem que ele entende
// (F-6.1, DEC-054).
//
// O que este arquivo trava: toda fase que a advogada pode escolher tem rótulo
// E explicação no portal. `rotuloFase` devolve o valor cru quando não conhece a
// chave — comportamento certo para não esconder dado, mas que faria uma quinta
// fase aparecer para o cliente como `execucao_provisoria`, sem frase nenhuma.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { FASE_PROCESSO_OPTIONS } from "../../src/utils/enums.js";
import {
  rotuloFase, explicacaoFase, EXPLICACAO_TRANSITO_EM_JULGADO,
  formatarData, formatarDataCivil
} from "../../src/utils/portalLabels.js";
import { RAIZ } from "../helpers/cssScan.js";

describe("portal: fase do processo", () => {
  test("toda fase do vocabulário da advogada tem rótulo e explicação no portal", () => {
    assert.equal(FASE_PROCESSO_OPTIONS.length, 4, "o vocabulário da Laís tem 4 fases");

    for (const { value, label } of FASE_PROCESSO_OPTIONS) {
      assert.equal(
        rotuloFase(value), label,
        `o rótulo de "${value}" no portal diverge do da advogada`
      );
      assert.ok(
        explicacaoFase(value).length > 0,
        `a fase "${value}" não tem explicação para o cliente`
      );
    }
  });

  test("fase desconhecida degrada para o valor cru, e ausente para travessão", () => {
    assert.equal(rotuloFase("fase_nova"), "fase_nova");
    assert.equal(explicacaoFase("fase_nova"), "");
    assert.equal(rotuloFase(undefined), "—");
    assert.equal(rotuloFase(null), "—");
  });

  test("a explicação do trânsito em julgado existe", () => {
    assert.ok(EXPLICACAO_TRANSITO_EM_JULGADO.length > 0);
  });

  test("a tela mostra a fase e o trânsito em julgado, e só quando existem", () => {
    const codigo = readFileSync(
      resolve(RAIZ, "src", "pages", "portal", "PortalProcessPage.jsx"), "utf8"
    );

    assert.match(codigo, /processo\.fase\s*&&/, "a fase precisa ser condicional a existir");
    assert.match(codigo, /rotuloFase\(processo\.fase\)/, "a fase precisa sair pelo rótulo do portal");
    assert.match(
      codigo, /processo\.transitoEmJulgadoEm\s*&&/,
      "o trânsito em julgado só aparece quando há data"
    );
  });

  test("data sem hora não recua um dia (meia-noite UTC ≠ 21h de Brasília)", () => {
    // É exatamente o que o backend devolve para `2026-03-15`.
    const iso = "2026-03-15T00:00:00.000Z";

    assert.equal(formatarDataCivil(iso), "15/03/2026");
    // O contraste que justifica a função: em Brasília o mesmo texto recua.
    assert.equal(formatarData(iso), "14/03/2026");

    assert.equal(formatarDataCivil(null), "—");
    assert.equal(formatarDataCivil("lixo"), "—");
  });

  test("a tela usa a data civil nos dois campos de data sem hora", () => {
    const codigo = readFileSync(
      resolve(RAIZ, "src", "pages", "portal", "PortalProcessPage.jsx"), "utf8"
    );

    assert.match(codigo, /formatarDataCivil\(processo\.dataDistribuicao\)/);
    assert.match(codigo, /formatarDataCivil\(processo\.transitoEmJulgadoEm\)/);
    assert.doesNotMatch(
      codigo, /formatarData\(processo\./,
      "campo de data sem hora formatado em Brasília volta a recuar um dia"
    );
  });
});
