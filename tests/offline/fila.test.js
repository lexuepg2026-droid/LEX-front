// ═══════════════════════════════════════════════════════════════════════════
// F-5b — A FILA: o que entra, em que ordem sai, e o que ela diz
//
// Mesma restrição da F-5a: `node --test` não tem IndexedDB e a fase proíbe
// dependência nova. A saída é a mesma, e é o que torna a fila auditável — toda
// DECISÃO vive em função pura, executada aqui de verdade:
//
//   • o que pode ser enfileirado (e o financeiro NÃO pode);
//   • a montagem da entrada, com a chave de idempotência e o `updatedAt` visto;
//   • a ordem do reenvio e a PARADA na primeira falha;
//   • a frase em português de cada tipo de falha.
//
// O que sobra sem cobertura automática — o banco de verdade e o gesto humano —
// está nos passos 244 a 251 do roteiro.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  identificarOperacao,
  ehEnfileiravel,
  caminhoDaRequisicao,
  OPERACOES
} from "../../src/offline/outboxOperations.js";
import {
  montarEntrada,
  marcarFalha,
  marcarPendente,
  novaChaveDeIdempotencia
} from "../../src/offline/outboxEntry.js";
import {
  ordenarFila,
  proximaEntrada,
  planejarReenvio,
  filaTravada,
  contarFalhas
} from "../../src/offline/outboxPlan.js";
import {
  classificarFalha,
  mensagemDaFalha,
  descreverEntrada,
  mensagemDeDescarte,
  mensagemDeLogoutComFila,
  tituloDaRequisicao,
  MENSAGEM_ENFILEIRADO
} from "../../src/offline/outboxMessages.js";
import { buildQueueKey, parseKey, belongsToUser, keysOfOtherUsers } from "../../src/offline/cacheKey.js";

// ═════════════════════════════════════════════════════════════════════════
// PARTE 0 — o que pode entrar na fila
// ═════════════════════════════════════════════════════════════════════════

describe("só compromisso da agenda e mudança de fase entram na fila", () => {
  test("as quatro operações da lista são reconhecidas", () => {
    assert.equal(identificarOperacao({ method: "post", url: "/events" })?.id, "criarEvento");
    assert.equal(identificarOperacao({ method: "patch", url: "/events/6a70f9" })?.id, "atualizarEvento");
    assert.equal(identificarOperacao({ method: "patch", url: "/events/6a70f9/concluir" })?.id, "concluirEvento");
    assert.equal(identificarOperacao({ method: "patch", url: "/processes/6a70f9/fase" })?.id, "mudarFase");
    assert.equal(OPERACOES.length, 4, "a lista cresceu sem passar por aqui");
  });

  // ⚠️ O BLOCO MAIS IMPORTANTE DESTE ARQUIVO.
  //
  // Toda validação de dinheiro depende de estado do servidor que o navegador
  // offline não tem como conferir — o saldo em aberto, se a parcela já foi
  // quitada, se o honorário foi reparcelado, quanto ainda é estornável. Um
  // pagamento enfileirado às 10h pode ser inválido às 15h, e aí a fila teria de
  // explicar à advogada por que um recebimento que ela deu como registrado não
  // existe — depois de ela já ter dito ao cliente que estava pago.
  test("o FINANCEIRO nunca entra na fila", () => {
    const financeiro = [
      ["post", "/fees"],
      ["patch", "/fees/6a70f9"],
      ["delete", "/fees/6a70f9"],
      ["post", "/fees/6a70f9/renegotiations"],
      ["post", "/installments"],
      ["patch", "/installments/6a70f9"],
      ["delete", "/installments/6a70f9"],
      ["post", "/payments"],
      ["patch", "/payments/6a70f9"],
      ["post", "/payments/6a70f9/reversals"]
    ];

    for (const [metodo, url] of financeiro) {
      assert.equal(
        ehEnfileiravel({ method: metodo, url }), false,
        `${metodo.toUpperCase()} ${url} entrou na fila — dinheiro enfileirado é a mentira ` +
        "sobre dinheiro que o Financeiro 2.0 levou oito subfases para impedir"
      );
    }
  });

  test("cliente, processo, documento e portal também ficam fora", () => {
    const fora = [
      ["post", "/clients"],
      ["patch", "/clients/6a70f9"],
      ["post", "/processes"],
      ["patch", "/processes/6a70f9"],
      ["post", "/documents/modelos/6a70f9/gerar"],
      ["patch", "/documents/6a70f9/texto"],
      ["post", "/portal/login"],
      ["patch", "/portal/senha"],
      ["post", "/secoes"],
      ["patch", "/auth/me"]
    ];
    for (const [metodo, url] of fora) {
      assert.equal(ehEnfileiravel({ method: metodo, url }), false, `${metodo} ${url}`);
    }
  });

  test("APAGAR compromisso fica de fora, e por um motivo próprio", () => {
    // Apagar offline um compromisso que ainda não foi criado no servidor
    // exigiria remapear identificador local quando a criação subisse — a
    // armadilha clássica de fila, e a que produz o pior defeito: apagar o
    // registro errado.
    assert.equal(ehEnfileiravel({ method: "delete", url: "/events/6a70f9" }), false);
  });

  test("leitura nunca é enfileirada", () => {
    assert.equal(ehEnfileiravel({ method: "get", url: "/events" }), false);
  });

  test("o caminho é normalizado — prefixo, query e URL absoluta", () => {
    assert.equal(caminhoDaRequisicao("/api/events?page=2"), "/events");
    assert.equal(caminhoDaRequisicao("https://lex.exemplo/api/events/abc"), "/events/abc");
    assert.equal(caminhoDaRequisicao("/events/"), "/events");
    assert.equal(caminhoDaRequisicao(""), null);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// A ENTRADA
// ═════════════════════════════════════════════════════════════════════════

describe("a entrada carrega o que o reenvio precisa", () => {
  test("chave de idempotência, versão vista, instante e estado", () => {
    const entrada = montarEntrada({
      method: "patch",
      url: "/events/6a70f9",
      body: { titulo: "Audiência de instrução" },
      versaoVista: "2026-08-29T10:00:00.000Z",
      titulo: "Audiência de instrução",
      agora: 1000
    });

    assert.equal(entrada.operacao, "atualizarEvento");
    assert.equal(entrada.estado, "pendente");
    assert.equal(entrada.criadoEm, 1000);
    assert.equal(entrada.versaoVista, "2026-08-29T10:00:00.000Z");
    assert.match(entrada.chaveIdempotencia, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(entrada.id, entrada.chaveIdempotencia, "id e chave são a mesma coisa");
    assert.equal(entrada.tentativas, 0);
    assert.equal(entrada.falha, null);
  });

  test("operação fora da lista LANÇA — não entra por caminho não revisado", () => {
    assert.throws(
      () => montarEntrada({ method: "post", url: "/payments", body: { valor: 100 } }),
      /não enfileirável/
    );
  });

  test("duas chaves nunca se repetem", () => {
    const chaves = new Set();
    for (let i = 0; i < 200; i += 1) chaves.add(novaChaveDeIdempotencia());
    assert.equal(chaves.size, 200);
  });

  test("marcar falha guarda o motivo e conta a tentativa; voltar a pendente limpa", () => {
    const entrada = montarEntrada({ method: "post", url: "/events", agora: 1 });
    const falhada = marcarFalha(entrada, { classificacao: "conflito", mensagem: "..." });

    assert.equal(falhada.estado, "falhou");
    assert.equal(falhada.tentativas, 1);
    assert.equal(falhada.falha.classificacao, "conflito");
    // A entrada é append-only: o CONTEÚDO não muda, só o estado.
    assert.equal(falhada.id, entrada.id);
    assert.equal(falhada.chaveIdempotencia, entrada.chaveIdempotencia);
    assert.equal(falhada.body, entrada.body);

    const denovo = marcarPendente(falhada);
    assert.equal(denovo.estado, "pendente");
    assert.equal(denovo.falha, null);
    assert.equal(
      denovo.chaveIdempotencia, entrada.chaveIdempotencia,
      "a chave precisa sobreviver ao 'tentar de novo' — é ela que impede o segundo registro"
    );
  });

  test("o título sai do corpo, e a fase sai como RÓTULO", () => {
    assert.equal(tituloDaRequisicao("criarEvento", { titulo: " Audiência " }), "Audiência");
    assert.equal(tituloDaRequisicao("atualizarEvento", { titulo: "" }), null);
    // "conhecimento" cru na tela é o defeito que a DEC-054 corrigiu.
    assert.equal(tituloDaRequisicao("mudarFase", { fase: "conhecimento" }), "Fase de conhecimento");
    assert.equal(tituloDaRequisicao("concluirEvento", { concluido: true }), null);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// A ORDEM, E A PARADA
// ═════════════════════════════════════════════════════════════════════════

describe("o reenvio vai em ordem de criação", () => {
  const entrada = (id, criadoEm, estado = "pendente", seq = 0) =>
    ({ id, criadoEm, estado, seq });

  test("ordena por instante, e `seq` desempata dentro do mesmo milissegundo", () => {
    const fila = [
      entrada("c", 3000), entrada("a", 1000), entrada("b2", 2000, "pendente", 1),
      entrada("b1", 2000, "pendente", 0)
    ];
    assert.deepEqual(ordenarFila(fila).map((e) => e.id), ["a", "b1", "b2", "c"]);
  });

  test("criar e depois editar: a ordem é o que faz a segunda funcionar", () => {
    // Fora de ordem, a edição chega antes da criação e falha com "não
    // encontrado" — por um motivo que não tem nada a ver com o que a advogada
    // fez.
    const criacao = montarEntrada({ method: "post", url: "/events", agora: 100, seq: 0 });
    const edicao = montarEntrada({ method: "patch", url: "/events/x", agora: 100, seq: 1 });

    assert.equal(proximaEntrada([edicao, criacao]).id, criacao.id);
  });
});

describe("se uma falha, PARA", () => {
  const entrada = (id, criadoEm, estado) => ({ id, criadoEm, estado, seq: 0 });

  test("a fila trava na entrada falhada, e não pula para a seguinte", () => {
    const fila = [
      entrada("primeira", 1, "falhou"),
      entrada("segunda", 2, "pendente"),
      entrada("terceira", 3, "pendente")
    ];

    assert.equal(
      proximaEntrada(fila), null,
      "pular a falhada produziria um estado que ninguém pediu — metade das " +
      "alterações aplicadas, sem que nada na tela explique quais"
    );
    assert.equal(filaTravada(fila), true);
    assert.deepEqual(planejarReenvio(fila).enviaveis, []);
    assert.equal(planejarReenvio(fila).travadaPor, "primeira");
  });

  test("com a falhada resolvida, a fila volta a andar", () => {
    const fila = [
      entrada("primeira", 1, "pendente"),
      entrada("segunda", 2, "pendente")
    ];
    assert.equal(proximaEntrada(fila).id, "primeira");
    assert.deepEqual(planejarReenvio(fila).enviaveis, ["primeira", "segunda"]);
    assert.equal(planejarReenvio(fila).travadaPor, null);
  });

  test("uma falha no MEIO trava dali para a frente, e não o começo", () => {
    const fila = [
      entrada("a", 1, "pendente"),
      entrada("b", 2, "falhou"),
      entrada("c", 3, "pendente")
    ];
    assert.deepEqual(planejarReenvio(fila).enviaveis, ["a"]);
    assert.equal(planejarReenvio(fila).travadaPor, "b");
    assert.equal(contarFalhas(fila), 1);
  });

  test("fila vazia não tem próxima, e não está travada", () => {
    assert.equal(proximaEntrada([]), null);
    assert.equal(filaTravada([]), false);
  });

  // O laço do reenvio, simulado com as MESMAS funções que `enviarFila` usa:
  // ele pergunta a próxima, envia, e para quando a resposta é `null`.
  test("o laço envia até a primeira falha e para ali", () => {
    let fila = [
      montarEntrada({ method: "post", url: "/events", agora: 1, seq: 0 }),
      montarEntrada({ method: "patch", url: "/events/x", agora: 2, seq: 1 }),
      montarEntrada({ method: "patch", url: "/processes/y/fase", agora: 3, seq: 2 })
    ];
    const enviadas = [];
    const falhaEm = fila[1].id;

    // O laço NÃO para por conta própria na falha: ele só marca a entrada e
    // pergunta a próxima. Quem manda parar é `proximaEntrada`, devolvendo
    // `null` — e é justamente isso que este teste existe para provar. Um laço
    // que parasse sozinho passaria mesmo com a regra da parada quebrada.
    let voltas = 0;
    for (;;) {
      voltas += 1;
      assert.ok(voltas < 10, "o laço não terminou — a parada da fila sumiu");

      const proxima = proximaEntrada(fila);
      if (!proxima) break;

      if (proxima.id === falhaEm) {
        fila = fila.map((e) => (e.id === proxima.id ? marcarFalha(e, { classificacao: "recusado" }) : e));
        continue;
      }
      fila = fila.filter((e) => e.id !== proxima.id);
      enviadas.push(proxima.id);
    }

    assert.equal(enviadas.length, 1, "enviou além da falha");
    assert.equal(fila.length, 2, "a fila precisa manter a falhada E a que veio depois");
    assert.equal(fila[0].estado, "falhou");
  });
});

// ═════════════════════════════════════════════════════════════════════════
// AS FRASES
// ═════════════════════════════════════════════════════════════════════════

describe("a fila fala português", () => {
  test("cada tipo de falha tem a sua classificação", () => {
    assert.equal(classificarFalha({ status: 409, regra: "conflitoDeVersao" }), "conflito");
    assert.equal(classificarFalha({ status: 409, regra: "chaveReutilizada" }), "recusado");
    assert.equal(classificarFalha({ status: 400 }), "recusado");
    assert.equal(classificarFalha({ status: 404 }), "recusado");
    assert.equal(classificarFalha({ status: 500 }), "servidor");
    assert.equal(classificarFalha({ status: null }), "semSinal");
    assert.equal(classificarFalha({ offline: true, status: 500 }), "semSinal");
  });

  test("nenhuma frase mostra código HTTP, método ou rota", () => {
    for (const classificacao of ["conflito", "recusado", "servidor", "semSinal"]) {
      const frase = mensagemDaFalha(classificacao, { motivoDoServidor: "Título é obrigatório" });
      assert.ok(!/\b(4\d\d|5\d\d)\b/.test(frase), `código HTTP na frase: ${frase}`);
      assert.ok(!/POST|PATCH|\/events/.test(frase), `rota na frase: ${frase}`);
    }
  });

  test("a do conflito manda COMPARAR, e não escolhe por ela", () => {
    const frase = mensagemDaFalha("conflito");
    assert.match(frase, /outro aparelho/);
    assert.match(frase, /escolha/i);
  });

  test("a do servidor repassa o motivo, que é mais específico que o nosso texto", () => {
    const frase = mensagemDaFalha("recusado", { motivoDoServidor: "Título é obrigatório" });
    assert.match(frase, /Título é obrigatório/);
  });

  test("a descrição diz O QUE ERA e DE QUANDO", () => {
    const agora = new Date(2026, 7, 29, 16, 5).getTime();
    const ontem = new Date(2026, 7, 28, 14, 32).getTime();

    const entrada = montarEntrada({
      method: "post", url: "/events", titulo: "Audiência de instrução", agora: ontem
    });

    const frase = descreverEntrada(entrada, agora);
    assert.equal(frase, 'Compromisso "Audiência de instrução", criado ontem às 14:32');
  });

  test("a descrição da mudança de fase nomeia a fase, e não a rota", () => {
    const agora = new Date(2026, 7, 29, 16, 5).getTime();
    const entrada = montarEntrada({
      method: "patch", url: "/processes/abc/fase", titulo: "Execução", agora
    });
    assert.match(descreverEntrada(entrada, agora), /^Fase do processo "Execução", alterada hoje às/);
  });

  test("o descarte NOMEIA o que se perde, e diz que não volta", () => {
    const agora = Date.now();
    const entrada = montarEntrada({
      method: "post", url: "/events", titulo: "Reunião com a cliente", agora
    });
    const frase = mensagemDeDescarte(entrada, agora);

    assert.match(frase, /Reunião com a cliente/);
    assert.match(frase, /nunca chegou ao servidor/);
    assert.match(frase, /não há como recuperá-la/i);
  });

  test("o aviso do logout diz QUANTAS são, e concorda no plural", () => {
    assert.match(mensagemDeLogoutComFila(1), /Há 1 alteração que ainda não foi enviada/);
    assert.match(mensagemDeLogoutComFila(3), /Há 3 alterações que ainda não foram enviadas/);
    for (const n of [1, 3]) {
      assert.match(mensagemDeLogoutComFila(n), /descartada|descartadas/);
    }
  });

  test("a frase do enfileiramento NÃO é uma frase de erro", () => {
    assert.match(MENSAGEM_ENFILEIRADO, /Sem conexão/);
    assert.match(MENSAGEM_ENFILEIRADO, /fila/);
    assert.match(MENSAGEM_ENFILEIRADO, /quando o sinal voltar/);
    assert.ok(!/erro|falha|não foi possível/i.test(MENSAGEM_ENFILEIRADO), MENSAGEM_ENFILEIRADO);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// A FILA HERDA O ESCOPO DA DEC-058
// ═════════════════════════════════════════════════════════════════════════

describe("a fila é escopada por usuário, como o resto do espelho", () => {
  const ADVOGADA = "6a6d14c1f4f3d95c1de02636";
  const ESTAGIARIA = "6a70f9ef34bf6204963a6030";
  const CHAVE = "3f2504e0-4f89-11d3-9a0c-0305e82c3301";

  test("a chave da entrada carrega o dono", () => {
    const chave = buildQueueKey({ userId: ADVOGADA, chave: CHAVE });
    assert.ok(chave.includes(ADVOGADA));
    assert.deepEqual(parseKey(chave), { userId: ADVOGADA, fila: true, chave: CHAVE });
    assert.equal(belongsToUser(chave, ADVOGADA), true);
    assert.equal(belongsToUser(chave, ESTAGIARIA), false);
  });

  test("sem usuário não há entrada de fila", () => {
    for (const vazio of [undefined, null, "", "  "]) {
      assert.throws(() => buildQueueKey({ userId: vazio, chave: CHAVE }), /sem usuário/);
    }
    assert.throws(() => buildQueueKey({ userId: ADVOGADA, chave: "" }), /chave de idempotência/);
  });

  test("a troca de conta apaga a fila da outra advogada junto com o cache dela", () => {
    // Uma regra só para as duas coisas: a limpeza da DEC-058 não precisou de
    // uma segunda versão para a fila, e por isso as duas não têm como divergir.
    const minha = buildQueueKey({ userId: ADVOGADA, chave: CHAVE });
    const dela = buildQueueKey({ userId: ESTAGIARIA, chave: CHAVE });

    assert.deepEqual(keysOfOtherUsers([minha, dela], ADVOGADA), [dela]);
  });
});
