// ═══════════════════════════════════════════════════════════════════════════
// F-5a — A POLÍTICA: o que se guarda, quanto cabe, o que sai primeiro
//
// A fase decidiu que a camada que fala com o IndexedDB é FINA e sem decisão, e
// que toda decisão vive em função pura — porque `node --test` não tem
// navegador e a fase proíbe dependência nova (inclusive wrapper de IndexedDB).
// Este arquivo é o que essa decisão comprou: a política inteira, executada de
// verdade, sem `jsdom`, sem fake de banco e sem teste frágil.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  isStorable,
  estimateBytes,
  chooseEvictions,
  decideSource,
  MAX_ENTRY_BYTES,
  MAX_ENTRIES,
  MAX_TOTAL_BYTES
} from "../../src/offline/cachePolicy.js";

describe("o que se guarda", () => {
  test("guarda o que ela consulta", () => {
    const veredito = isStorable({ resource: "clients", value: [{ nome: "Ana" }] });
    assert.equal(veredito.ok, true);
    assert.equal(typeof veredito.bytes, "number");
  });

  test("NÃO guarda binário — PDF e DOCX ficam de fora", () => {
    // Parte 2 da fase: são grandes, e o valor de tê-los offline é baixo perto
    // do custo. A recusa é dupla (a allowlist de recursos e esta), porque as
    // duas erram de formas diferentes.
    const binarios = [
      new ArrayBuffer(8),
      new Uint8Array([1, 2, 3]),
      ...(typeof Blob !== "undefined" ? [new Blob(["%PDF-1.7"])] : [])
    ];
    for (const binario of binarios) {
      const veredito = isStorable({ resource: "fees", value: binario });
      assert.equal(veredito.ok, false, `guardou um binário: ${binario?.constructor?.name}`);
      assert.match(veredito.motivo, /binário/);
    }
  });

  test("recusa entrada acima do teto por entrada", () => {
    const gigante = { texto: "x".repeat(MAX_ENTRY_BYTES + 1) };
    const veredito = isStorable({ resource: "processes", value: gigante });
    assert.equal(veredito.ok, false);
    assert.match(veredito.motivo, /acima do teto/);
  });

  test("recusa recurso fora da lista, e valor ausente", () => {
    assert.equal(isStorable({ resource: "documents", value: [] }).ok, false);
    assert.equal(isStorable({ resource: "clients", value: undefined }).ok, false);
    assert.equal(isStorable({ resource: "clients", value: null }).ok, false);
  });

  test("o tamanho é medido em bytes UTF-8, não em caracteres", () => {
    // "Conceição" tem 9 caracteres e 11 bytes — "ç" e "ã" custam 2 cada. Medir
    // por `.length` subestimaria justamente os nomes próprios e os títulos de
    // processo, que são o grosso do que se guarda.
    assert.equal(estimateBytes("Conceicao"), 11);   // 9 letras + 2 aspas
    assert.equal(estimateBytes("Conceição"), 13);   // dois acentos, 1 byte extra cada
    assert.equal(estimateBytes(undefined), 0);

    const ciclo = {};
    ciclo.ele = ciclo;
    assert.equal(estimateBytes(ciclo), Infinity, "o que não serializa não cabe no banco");
  });
});

describe("o descarte: o mais ANTIGO sai primeiro", () => {
  const entrada = (chave, atualizadoEm, bytes) => ({ chave, atualizadoEm, bytes });

  test("dentro dos limites, não descarta nada", () => {
    const descartar = chooseEvictions({
      entries: [entrada("a", 1, 10), entrada("b", 2, 10)],
      incomingKey: "c",
      incomingBytes: 10
    });
    assert.deepEqual(descartar, []);
  });

  test("estourando o total, sai a mais antiga — e só o necessário", () => {
    const descartar = chooseEvictions({
      entries: [
        entrada("velha", 1000, 400),
        entrada("media", 2000, 400),
        entrada("nova", 3000, 400)
      ],
      incomingKey: "chegando",
      incomingBytes: 400,
      maxTotalBytes: 1200
    });
    assert.deepEqual(descartar, ["velha"], "descartou demais, ou descartou a errada");
  });

  test("estourando a contagem, sai a mais antiga", () => {
    const descartar = chooseEvictions({
      entries: [entrada("velha", 1, 1), entrada("nova", 9, 1)],
      incomingKey: "chegando",
      incomingBytes: 1,
      maxEntries: 2
    });
    assert.deepEqual(descartar, ["velha"]);
  });

  test("a entrada que CHEGA nunca é candidata — nem quando já existia", () => {
    // Substituir uma entrada devolve o espaço dela: sem isso, recarregar a
    // mesma tela duas vezes descartaria outra por um espaço que não faltava.
    const descartar = chooseEvictions({
      entries: [entrada("chegando", 1, 900), entrada("outra", 2, 100)],
      incomingKey: "chegando",
      incomingBytes: 900,
      maxTotalBytes: 1000
    });
    assert.deepEqual(descartar, []);
  });

  test("empate no instante descarta em ordem determinística", () => {
    // Duas telas carregadas no mesmo milissegundo. Sem desempate, o teste (e o
    // descarte) dependeriam da ordem em que o banco devolveu as entradas.
    const descartar = chooseEvictions({
      entries: [entrada("b", 5, 500), entrada("a", 5, 500)],
      incomingKey: "z",
      incomingBytes: 500,
      maxTotalBytes: 1000
    });
    assert.deepEqual(descartar, ["a"]);
  });

  test("os limites publicados são os que valem", () => {
    assert.equal(MAX_TOTAL_BYTES, 5 * 1024 * 1024);
    assert.equal(MAX_ENTRIES, 120);
    assert.equal(MAX_ENTRY_BYTES, 256 * 1024);
    // O teto por entrada é folgado dentro do total: se um deles pudesse
    // sozinho estourar o outro, o descarte entraria em laço.
    assert.ok(MAX_ENTRY_BYTES * 2 < MAX_TOTAL_BYTES);
  });
});

describe("servir da rede ou do cache", () => {
  test("com sinal, a REDE manda — sempre", () => {
    // Cache-first com dado autenticado serviria o saldo do mês passado sem
    // ninguém pedir. É o mesmo motivo pelo qual o `sw.js` não cacheia `/api/`.
    assert.equal(decideSource({ online: true, hasCache: true }), "network");
    assert.equal(decideSource({ online: true, hasCache: false }), "network");
  });

  test("sem sinal, com dado guardado, serve o guardado", () => {
    assert.equal(decideSource({ online: false, hasCache: true }), "cache");
  });

  test("sem sinal e sem dado guardado NÃO é erro de rede", () => {
    // É "esta tela você ainda não abriu neste aparelho" — e a mensagem que sai
    // disso diz isso, não "falha ao carregar".
    assert.equal(decideSource({ online: false, hasCache: false }), "unavailable");
  });
});
