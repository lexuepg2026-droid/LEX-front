// ═══════════════════════════════════════════════════════════════════════════
// F-5a — O ESCOPO POR USUÁRIO: o risco número um da fase
//
// O `tests/pwa/pwa.test.js` já trava uma regra desde a Fase 4.5: **nenhuma
// entrada de `/api/` no Cache Storage**, porque resposta autenticada em cache
// compartilhado vaza para o próximo usuário do navegador. **IndexedDB tem
// exatamente o mesmo problema, e aquele teste não o cobre** — é outra API.
//
// O caso concreto, e ele não é hipotético: o computador do escritório, a
// advogada e a estagiária. Um navegador usado por duas pessoas guardaria os
// dados da primeira e os entregaria à segunda.
//
// As três regras da fase, e o que cada uma exige aqui:
//
//   1. todo dado guardado é escopado pelo id do usuário — e **nenhuma leitura
//      atravessa escopo, nem por engano de chave**;
//   2. o logout APAGA (a prova de que ele é chamado está na varredura estática);
//   3. entrar com outro id limpa o do anterior ANTES de escrever.
//
// A regra 1 é provada aqui, em função pura. As 2 e 3 dependem de fiação, e
// estão em `tests/offline/estatica.test.js`.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  buildKey,
  parseKey,
  belongsToUser,
  keysOfOtherUsers,
  serializeParams,
  isCacheableResource,
  CACHEABLE_RESOURCES,
  KEY_PREFIX
} from "../../src/offline/cacheKey.js";

const ADVOGADA = "6a6d14c1f4f3d95c1de02636";
const ESTAGIARIA = "6a70f9ef34bf6204963a6030";

describe("a chave NÃO existe sem usuário", () => {
  // ⚠️ É esta asserção que a mutação obrigatória (b) — montar a chave sem o id
  // do usuário — precisa derrubar. Um `buildKey` que devolvesse uma chave
  // "anônima" em vez de lançar é o vazamento inteiro: duas pessoas escrevendo
  // e lendo do MESMO escopo padrão.
  for (const ausente of [undefined, null, "", "   ", 0, {}, []]) {
    test(`lança para userId ${JSON.stringify(ausente)}`, () => {
      assert.throws(
        () => buildKey({ userId: ausente, resource: "clients", params: { page: 1 } }),
        /chave sem usuário/,
        "sem dono não pode haver chave — escopo padrão é onde os dados de duas pessoas se encontram"
      );
    });
  }

  test("o id do usuário está DENTRO da chave, não ao lado dela", () => {
    const chave = buildKey({ userId: ADVOGADA, resource: "clients", params: { page: 1 } });
    assert.ok(chave.includes(ADVOGADA), `a chave não carrega o dono: ${chave}`);
    assert.ok(chave.startsWith(`${KEY_PREFIX}|u:${ADVOGADA}|`));
  });

  test("recurso fora da lista do que se guarda é recusado", () => {
    assert.throws(() => buildKey({ userId: ADVOGADA, resource: "documentDownload" }), /não está na lista/);
    assert.throws(() => buildKey({ userId: ADVOGADA, resource: "portalProcesso" }), /não está na lista/);
    assert.equal(isCacheableResource("clients"), true);
    assert.equal(isCacheableResource("documents"), false);
  });
});

describe("nenhuma leitura atravessa escopo", () => {
  test("a MESMA consulta, dois usuários, duas chaves", () => {
    const consulta = { resource: "processes", params: { situacao: "ativos", page: 1 } };
    const daAdvogada = buildKey({ userId: ADVOGADA, ...consulta });
    const daEstagiaria = buildKey({ userId: ESTAGIARIA, ...consulta });

    assert.notEqual(daAdvogada, daEstagiaria);
    assert.equal(belongsToUser(daAdvogada, ADVOGADA), true);
    assert.equal(belongsToUser(daAdvogada, ESTAGIARIA), false);
    assert.equal(belongsToUser(daEstagiaria, ADVOGADA), false);
  });

  test("chave ilegível não é de ninguém — o lado seguro do erro", () => {
    for (const lixo of ["", "qualquer-coisa", "lex-offline|u:|r:clients|p:", null, 42, `${KEY_PREFIX}|u:${ADVOGADA}|r:clients`]) {
      assert.equal(belongsToUser(lixo, ADVOGADA), false, `deveria recusar: ${lixo}`);
    }
  });

  test("busca com `|` não forja a chave de outro usuário", () => {
    // O `|` é o separador. Sem `encodeURIComponent` nos valores, uma busca
    // digitada como `x|u:<outro id>` montaria uma chave que o `parseKey` leria
    // como sendo de outra pessoa — o vazamento vindo pelo campo de busca.
    const forja = `x|u:${ESTAGIARIA}|r:clients|p:`;
    const chave = buildKey({ userId: ADVOGADA, resource: "clients", params: { busca: forja } });

    assert.equal(parseKey(chave).userId, ADVOGADA);
    assert.equal(belongsToUser(chave, ESTAGIARIA), false);
  });

  test("id de usuário com `|` é recusado, e não sanitizado em silêncio", () => {
    assert.throws(() => buildKey({ userId: `a|u:${ESTAGIARIA}`, resource: "clients" }), /separador/);
  });
});

describe("a limpeza da troca de conta escolhe certo", () => {
  const minhas = [
    buildKey({ userId: ADVOGADA, resource: "clients", params: { page: 1 } }),
    buildKey({ userId: ADVOGADA, resource: "fees" })
  ];
  const dela = [
    buildKey({ userId: ESTAGIARIA, resource: "clients", params: { page: 1 } }),
    buildKey({ userId: ESTAGIARIA, resource: "payments" })
  ];
  const lixo = ["lex-offline|clients", "outra-coisa", `${KEY_PREFIX}|u:|r:fees|p:`];

  test("apaga o do outro usuário e o ilegível, mantém o meu", () => {
    const apagar = keysOfOtherUsers([...minhas, ...dela, ...lixo], ADVOGADA);

    assert.deepEqual(apagar.sort(), [...dela, ...lixo].sort());
    for (const minha of minhas) {
      assert.ok(!apagar.includes(minha), "apagou dado do próprio usuário");
    }
  });

  test("sem usuário, TUDO é de outro — inclusive o que era meu", () => {
    // O caminho de quem chega sem id: não há como provar que algo é dele, e o
    // que não se prova, apaga.
    assert.deepEqual(keysOfOtherUsers([...minhas, ...dela], undefined).sort(), [...minhas, ...dela].sort());
  });
});

describe("a serialização dos parâmetros é estável", () => {
  test("a ordem em que a tela monta o objeto não é informação", () => {
    assert.equal(
      serializeParams({ situacao: "ativos", busca: "ana" }),
      serializeParams({ busca: "ana", situacao: "ativos" })
    );
  });

  test("vazio, null e undefined saem — uma requisição, uma chave", () => {
    assert.equal(serializeParams({ busca: undefined, situacao: "ativos" }), "situacao=ativos");
    assert.equal(serializeParams({ busca: "", situacao: "ativos" }), "situacao=ativos");
    assert.equal(serializeParams({ busca: null, situacao: "ativos" }), "situacao=ativos");
    assert.equal(serializeParams(undefined), "");
    assert.equal(serializeParams({}), "");
  });

  test("parâmetro objeto é recusado — chave que ninguém consegue prever", () => {
    assert.throws(() => serializeParams({ filtro: { de: 1 } }), /texto, número ou booleano/);
  });

  test("a chave volta inteira pelo `parseKey`", () => {
    const chave = buildKey({ userId: ADVOGADA, resource: "installments", params: { page: 2, feeId: "abc" } });
    assert.deepEqual(parseKey(chave), {
      userId: ADVOGADA,
      resource: "installments",
      params: "feeId=abc&page=2"
    });
  });
});

describe("a lista do que se guarda", () => {
  test("cobre o que ela consulta", () => {
    for (const recurso of ["clients", "processes", "fees", "installments", "payments", "events"]) {
      assert.ok(CACHEABLE_RESOURCES.includes(recurso), `falta ${recurso}`);
    }
  });

  test("NÃO cobre download, documento gerado nem portal do cliente", () => {
    // Parte 2 da fase: PDF e DOCX são binários grandes e o valor de tê-los
    // offline é baixo perto do custo. E o portal roda no aparelho do cliente,
    // que pode ser emprestado (passo 93) — cache de dado jurídico ali é decisão
    // de privacidade, e ninguém a tomou.
    for (const recurso of CACHEABLE_RESOURCES) {
      assert.ok(
        !/download|pdf|docx|portal|document/i.test(recurso),
        `"${recurso}" não devia estar na lista do que se guarda`
      );
    }
  });
});
