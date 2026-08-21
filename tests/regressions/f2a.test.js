// ═══════════════════════════════════════════════════════════════════════════
// F-2a (frontend) — O 401 QUE DESLOGAVA, O RÓTULO QUE TRUNCAVA, AS GERAÇÕES
//                   QUE SE INTERCALAVAM
//
// Três defeitos independentes, um arquivo — o que eles têm em comum é serem
// todos de LEITURA: a tela mostrava a coisa certa no lugar errado, ou não
// mostrava, ou tirava a advogada dela.
//
//   DEC-050  o interceptor deslogava em qualquer 401, inclusive no da senha
//            atual errada. Quem errava a digitação era expulsa do sistema.
//   passo182 a coluna do rótulo exibia "Parce…" — largura de um número para um
//            texto que a DEC-048 alargou.
//   DEC-051  as parcelas vinham por número, e três gerações se intercalavam.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { ehSessaoPerdida } from "../../src/api/sessionLoss.js";
import {
  agruparParcelasPorPlano,
  precisaDeSeparador
} from "../../src/components/financeiro/installmentGrouping.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ═══════════════════════════════════════════════════════════════════════════
// 1 — DEC-050: o interceptor desloga em 401 e SÓ em 401
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-050 (frontend) — o interceptor de sessão perdida", () => {
  test("desloga em 401 recebido com sessão em pé", () => {
    assert.equal(ehSessaoPerdida(401, true), true);
  });

  test("NÃO desloga em 422 — é o defeito V-2", () => {
    // 422 é "sei quem você é, e este dado está errado": a senha atual digitada
    // errada na tela de troca de senha. Deslogar aqui expulsava a advogada por
    // um erro de digitação.
    assert.equal(ehSessaoPerdida(422, true), false);
  });

  test("NÃO desloga em nenhum outro status de erro", () => {
    for (const status of [400, 403, 404, 409, 422, 429, 500]) {
      assert.equal(
        ehSessaoPerdida(status, true),
        false,
        `${status} não é sessão perdida — só o 401 é (DEC-050)`
      );
    }
  });

  test("NÃO desloga em 401 quando não havia sessão a perder", () => {
    // A sondagem de `/auth/me` na subida do app e o login recusado. Reagir aqui
    // mandaria para `/login` quem está tentando chegar lá, com um "Sessão
    // expirada" sobre uma sessão que nunca existiu — e em `/registrar`
    // interromperia o cadastro.
    assert.equal(ehSessaoPerdida(401, false), false);
  });

  test("status ausente (erro de rede, requisição cancelada) não desloga", () => {
    assert.equal(ehSessaoPerdida(undefined, true), false);
  });

  test("nenhuma lista de rotas de exceção existe no interceptor", () => {
    // O ponto da DEC-050. Lista de exceção resolveria o V-2 e apodreceria: a
    // próxima rota que devolvesse 401 por engano não estaria nela, e o defeito
    // voltaria calado, num lugar diferente.
    //
    // Os dois testes de URL que existiam aqui — `url === '/auth/me'` e
    // `pathname === '/login'` — saíram. A decisão passou a ser sobre ESTADO.
    // Os DOIS arquivos: a regra (`sessionLoss.js`) e a fiação que a usa
    // (`axiosConfig.js`). Uma exceção por rota que voltasse a qualquer um dos
    // dois reintroduziria o defeito.
    for (const arquivo of ["src/api/sessionLoss.js", "src/api/axiosConfig.js"]) {
      const codigo = semComentarios(ler(arquivo));

      assert.doesNotMatch(
        codigo, /\/auth\/me/,
        `${arquivo}: voltou a exceção por rota \`/auth/me\``
      );
      assert.doesNotMatch(
        codigo, /window\.location\.pathname/,
        `${arquivo}: voltou a decisão por caminho da página`
      );
      assert.doesNotMatch(
        codigo, /error\.config|config\?\./,
        `${arquivo}: voltou a olhar a URL da requisição`
      );
    }

    const codigo = semComentarios(ler("src/api/sessionLoss.js"));

    // E a função que decide não recebe rota nenhuma: é essa ausência que
    // impede uma exceção de entrar.
    assert.match(
      codigo,
      /ehSessaoPerdida\s*=\s*\(status,\s*haviaSessao\)/,
      "a decisão precisa continuar saindo de (status, haviaSessao) e de nada mais"
    );
  });

  test("o AuthContext é quem informa a existência da sessão", () => {
    const codigo = semComentarios(ler("src/contexts/AuthContext.jsx"));
    assert.match(codigo, /registrarSessao/, "o contexto avisa o interceptor");

    // Toda transição de sessão passa por `registrarUsuario`. Um `setUser` solto
    // seria uma transição que o interceptor não veria — e a bandeira ficaria
    // mentindo até o próximo 401.
    const setUserSoltos = codigo.match(/setUser\(/g) ?? [];
    assert.equal(
      setUserSoltos.length,
      1,
      "só `registrarUsuario` pode chamar `setUser` — o resto passa por ele"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — A coluna do rótulo da parcela
// ═══════════════════════════════════════════════════════════════════════════
describe("F-2a — a coluna do rótulo não trunca mais", () => {
  const css = ler("src/styles/modules.css");

  // "Parcela 10 de 12" em 15 px ocupa ~114 px; com o padding (`--space-3` dos
  // dois lados) e as bordas, a coluna precisa de ~140 px. 160 é a medida
  // escolhida, com folga para variação de fonte.
  const LARGURA_MINIMA = 140;

  test("`.col-parcela` existe e é larga o bastante para 'Parcela 10 de 12'", () => {
    const m = css.match(/\.col-parcela\s*\{\s*width:\s*(\d+)px/);
    assert.ok(m, "a classe `.col-parcela` precisa existir");
    assert.ok(
      Number(m[1]) >= LARGURA_MINIMA,
      `a coluna do rótulo tem ${m[1]}px e precisa de pelo menos ${LARGURA_MINIMA}px — ` +
      "abaixo disso ela volta a exibir \"Parce…\""
    );
  });

  test("a listagem de parcelas usa `.col-parcela`, e não mais `col-xxs`", () => {
    const tela = ler("src/pages/installments/InstallmentListPage.jsx");
    assert.match(tela, /<col className="col-parcela" \/>/);

    // `col-xxs` (80 px) era a largura de quando a célula mostrava "1", "2",
    // "3". A DEC-048 trocou o conteúdo e a coluna ficou para trás.
    //
    // Sem comentários: o próprio `<colgroup>` traz uma nota que CITA `col-xxs`
    // para explicar o que saiu, e ela não pode contar como uso.
    const colgroup = semComentarios(tela).match(/<colgroup>[\s\S]*?<\/colgroup>/)[0];
    assert.doesNotMatch(
      colgroup, /col-xxs/,
      "a coluna do rótulo voltou para a largura de um número"
    );
  });

  test("toda célula da tabela é `nowrap` — o rótulo não quebra em duas linhas", () => {
    assert.match(
      css,
      /\.data-table th,\s*\.data-table td \{[^}]*white-space:\s*nowrap/,
      "sem `nowrap`, 'Parcela 10 de 12' quebraria e a linha mudaria de altura"
    );
  });

  test("a largura NÃO saiu da coluna de dinheiro (regressão da F-1b.2)", () => {
    // "Valor cortado é pior que valor ausente": uma célula vazia faz procurar o
    // número em outro lugar; "R$ 3.50…" parece um número e é lido como um.
    const m = css.match(/\.col-money\s*\{\s*width:\s*(\d+)px/);
    assert.ok(m, "`.col-money` precisa continuar existindo");
    assert.equal(Number(m[1]), 150, "a coluna de dinheiro continua em 150px");

    const tela = semComentarios(ler("src/pages/installments/InstallmentListPage.jsx"));
    const colgroup = tela.match(/<colgroup>[\s\S]*?<\/colgroup>/)[0];
    assert.equal(
      (colgroup.match(/col-money/g) ?? []).length,
      3,
      "as três colunas de dinheiro (Valor, Recebido, Em aberto) continuam em `col-money`"
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — DEC-051: as gerações agrupadas, o plano vigente primeiro
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-051 — a ordem das parcelas por geração", () => {
  // Três gerações: o plano original de 2, substituído em 01/08; a 2ª geração de
  // 3, substituída em 21/08; e a 3ª, de 2, viva.
  const tresGeracoes = () => [
    // De propósito fora de ordem na entrada: a função é que ordena.
    { _id: "v2", numeroParcela: 2, planoId: "R2", reparcelamentoId: null, reparceladaEm: null },
    { _id: "o1", numeroParcela: 1, planoId: null, reparcelamentoId: "R1", reparceladaEm: "2026-08-01" },
    { _id: "g3", numeroParcela: 3, planoId: "R1", reparcelamentoId: "R2", reparceladaEm: "2026-08-21" },
    { _id: "v1", numeroParcela: 1, planoId: "R2", reparcelamentoId: null, reparceladaEm: null },
    { _id: "g1", numeroParcela: 1, planoId: "R1", reparcelamentoId: "R2", reparceladaEm: "2026-08-21" },
    { _id: "o2", numeroParcela: 2, planoId: null, reparcelamentoId: "R1", reparceladaEm: "2026-08-01" },
    { _id: "g2", numeroParcela: 2, planoId: "R1", reparcelamentoId: "R2", reparceladaEm: "2026-08-21" }
  ];

  test("o plano VIGENTE vem primeiro", () => {
    const grupos = agruparParcelasPorPlano(tresGeracoes());
    assert.equal(grupos[0].vigente, true);
    assert.equal(grupos[0].chave, "R2");
    assert.deepEqual(grupos[0].parcelas.map((p) => p._id), ["v1", "v2"]);
  });

  test("os substituídos vêm depois, em ordem cronológica de substituição", () => {
    const grupos = agruparParcelasPorPlano(tresGeracoes());
    assert.equal(grupos.length, 3);

    // O original (substituído em 01/08) antes da 2ª geração (em 21/08): lido de
    // cima para baixo, o histórico sai na ordem em que aconteceu.
    assert.equal(grupos[1].chave, null, "o plano original");
    assert.equal(grupos[1].vigente, false);
    assert.equal(grupos[2].chave, "R1", "a segunda geração");
    assert.equal(grupos[2].vigente, false);
  });

  test("dentro de cada grupo, ordem numérica", () => {
    const grupos = agruparParcelasPorPlano(tresGeracoes());
    for (const grupo of grupos) {
      const numeros = grupo.parcelas.map((p) => p.numeroParcela);
      assert.deepEqual(
        numeros, [...numeros].sort((a, b) => a - b),
        `o grupo ${grupo.chave} saiu fora de ordem`
      );
    }
  });

  test("nada é apagado — as sete parcelas continuam na lista", () => {
    // O ponto da DEC-051: as canceladas continuam VISÍVEIS, com o rótulo
    // congelado e o badge "Reparcelada", como a DEC-048 exige. O que mudou é
    // onde ficam.
    const grupos = agruparParcelasPorPlano(tresGeracoes());
    const ids = grupos.flatMap((g) => g.parcelas.map((p) => p._id)).sort();
    assert.deepEqual(ids, ["g1", "g2", "g3", "o1", "o2", "v1", "v2"]);
  });

  test("a data de substituição do grupo alimenta o separador", () => {
    const grupos = agruparParcelasPorPlano(tresGeracoes());
    assert.equal(grupos[0].substituidoEm, null, "o vigente não foi substituído");
    assert.equal(grupos[1].substituidoEm.toISOString().slice(0, 10), "2026-08-01");
    assert.equal(grupos[2].substituidoEm.toISOString().slice(0, 10), "2026-08-21");
  });

  test("a parcela PAGA que ficou no plano velho não torna o grupo vigente", () => {
    // Um plano de 3 com a primeira já paga cancela só as outras duas: a paga
    // continua de pé, no plano velho. O grupo é substituído mesmo assim — é o
    // PLANO que foi substituído, não cada parcela.
    const grupos = agruparParcelasPorPlano([
      { _id: "paga", numeroParcela: 1, planoId: null, reparcelamentoId: null, reparceladaEm: null },
      { _id: "c2", numeroParcela: 2, planoId: null, reparcelamentoId: "R1", reparceladaEm: "2026-08-01" },
      { _id: "c3", numeroParcela: 3, planoId: null, reparcelamentoId: "R1", reparceladaEm: "2026-08-01" },
      { _id: "n1", numeroParcela: 1, planoId: "R1", reparcelamentoId: null, reparceladaEm: null }
    ]);

    assert.equal(grupos.length, 2);
    assert.equal(grupos[0].chave, "R1", "o plano novo é o vigente");
    assert.equal(grupos[1].vigente, false, "o plano velho é histórico, com a paga junto");
    assert.deepEqual(grupos[1].parcelas.map((p) => p._id), ["paga", "c2", "c3"]);
  });

  test("honorário nunca reparcelado: um grupo só, vigente, sem separador", () => {
    const grupos = agruparParcelasPorPlano([
      { _id: "a", numeroParcela: 1, planoId: null, reparcelamentoId: null },
      { _id: "b", numeroParcela: 2, planoId: null, reparcelamentoId: null }
    ]);
    assert.equal(grupos.length, 1);
    assert.equal(grupos[0].vigente, true);
    assert.equal(precisaDeSeparador(grupos), false, "um título sobre uma lista única é ruído");
  });

  test("lista vazia não quebra", () => {
    assert.deepEqual(agruparParcelasPorPlano([]), []);
    assert.deepEqual(agruparParcelasPorPlano(), []);
  });

  test("a página do honorário usa a função, e não ordena por conta própria", () => {
    const tela = semComentarios(ler("src/pages/fees/FeeDetailPage.jsx"));
    assert.match(tela, /agruparParcelasPorPlano\(parcelas\)/);
    assert.doesNotMatch(
      tela, /parcelas\.sort|\[\.\.\.parcelas\]\.sort/,
      "a ordem precisa sair da função pura, não de um sort na tela"
    );
  });
});
