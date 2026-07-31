// ═══════════════════════════════════════════════════════════════════════════
// Fase 4.2 — extração do nome do recibo do `Content-Disposition`
//
// O header só é legível porque a rota o expõe em
// `Access-Control-Expose-Headers` (`paymentController.js:106`). Sem isso o
// navegador o esconde mesmo estando na resposta, e o arquivo salvo cairia com o
// nome alternativo — "recibo.pdf" para todos, indistinguíveis na pasta de
// downloads.
//
// A função é testada direto, com uma resposta literal: não há axios nem rede
// aqui, e é justamente por ela ser exportada que o teste é possível.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { nomeDoAnexo } from "../../src/utils/download.js";

const resposta = (contentDisposition) => ({
  headers: contentDisposition ? { "content-disposition": contentDisposition } : {}
});

// O recibo passa 'recibo.pdf' como alternativo; o download de documento passa
// `documento.${formato}`. A extração é a mesma nos dois.
const nomeDoRecibo = (response, alternativo = "recibo.pdf") =>
  nomeDoAnexo(response, alternativo);

describe("nomeDoAnexo lê o filename do Content-Disposition", () => {
  test("o formato que o backend emite: attachment com filename entre aspas", () => {
    assert.equal(
      nomeDoRecibo(resposta('attachment; filename="recibo-maria-aparecida-costa-2026-07-31.pdf"')),
      "recibo-maria-aparecida-costa-2026-07-31.pdf"
    );
  });

  test("filename sem aspas também é aceito", () => {
    assert.equal(nomeDoRecibo(resposta("attachment; filename=recibo.pdf")), "recibo.pdf");
  });

  test("header ausente cai no nome alternativo, sem quebrar o download", () => {
    // É o que acontece se alguém remover o `Access-Control-Expose-Headers`: o
    // arquivo continua baixando, com nome genérico. Degradar é melhor que falhar.
    assert.equal(nomeDoRecibo(resposta(null)), "recibo.pdf");
    assert.equal(nomeDoRecibo(undefined), "recibo.pdf");
  });

  test("o alternativo é configurável pelo chamador", () => {
    assert.equal(nomeDoRecibo(resposta(null), "outro.pdf"), "outro.pdf");
  });

  test("é a MESMA função que o download de documento usa", async () => {
    // A regra de nome de arquivo tinha duas cópias no frontend e ia ganhar uma
    // terceira com o recibo. Agora tem uma, e este teste cobre as duas rotas.
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const { RAIZ } = await import("../helpers/cssScan.js");

    for (const service of ["src/api/documentService.js", "src/api/paymentService.js"]) {
      const codigo = readFileSync(resolve(RAIZ, service), "utf8");
      assert.match(
        codigo,
        /import\s*\{\s*nomeDoAnexo\s*\}\s*from\s*['"][^'"]*download['"]/,
        `${service} voltou a ter cópia própria da extração de filename`
      );
    }
  });

  test("o ponto-e-vírgula seguinte não entra no nome", () => {
    assert.equal(
      nomeDoRecibo(resposta('attachment; filename="recibo.pdf"; charset=utf-8')),
      "recibo.pdf"
    );
  });
});
