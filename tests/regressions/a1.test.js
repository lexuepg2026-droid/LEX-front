// ═══════════════════════════════════════════════════════════════════════════
// A-1 — A ORDEM ALFABÉTICA (DEC-062) E A REGRA DE E-MAIL (DEC-063)
//
// A suíte deste repositório é `node --test` **sem DOM** (decisão da 2E.2), e
// por isso este arquivo tem duas naturezas de teste, que não se confundem:
//
//   • as funções PURAS (`utils/email.js`, `utils/ordemCliente.js`) são
//     EXECUTADAS de verdade — é o que prova que a regra decide certo;
//   • a fiação das telas é conferida por VARREDURA ESTÁTICA, que prova que a
//     linha existe e não que ela roda. É a mesma troca de sempre, e o que
//     fecha a outra metade são os passos 261 a 266 do roteiro manual.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { emailValido, normalizarEmail, MENSAGEM_EMAIL_INVALIDO } from "../../src/utils/email.js";
import {
  ORDENS_CLIENTE,
  ORDEM_CLIENTE_PADRAO,
  VALORES_ORDEM_CLIENTE
} from "../../src/utils/ordemCliente.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(AQUI, "..", "..");
const ler = (rel) => readFileSync(resolve(RAIZ, rel), "utf8");

// As varreduras limpam comentários antes de analisar. Sem isso, o comentário
// que EXPLICA uma remoção — e que cita a linha removida — derrubaria a própria
// varredura que o explica, e a saída óbvia seria apagar a explicação. Mesma
// armadilha de `css/foco.test.js` desde a 4.5.
const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const LISTA_CLIENTES = "src/pages/clients/ClientListPage.jsx";
const LOGIN = "src/pages/auth/LoginPage.jsx";
const CADASTRO = "src/pages/auth/RegisterPage.jsx";

// ═══════════════════════════════════════════════════════════════════════════
// 1 — DEC-062: o seletor de ordenação, e o padrão A–Z
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-062 — a ordenação na tela", () => {
  test("o vocabulário tem dois valores, e o padrão é A–Z", () => {
    assert.deepEqual([...VALORES_ORDEM_CLIENTE], ["nome_asc", "nome_desc"]);
    assert.equal(ORDEM_CLIENTE_PADRAO, "nome_asc", "o padrão é alfabético, não data de cadastro");
    assert.ok(
      VALORES_ORDEM_CLIENTE.includes(ORDEM_CLIENTE_PADRAO),
      "o padrão precisa ser um valor do vocabulário"
    );
  });

  test("cada opção tem rótulo legível, e eles não se repetem", () => {
    const rotulos = ORDENS_CLIENTE.map((o) => o.rotulo);
    assert.equal(new Set(rotulos).size, rotulos.length, "dois valores com o mesmo rótulo");
    for (const { rotulo } of ORDENS_CLIENTE) {
      assert.match(rotulo, /Nome/, "o rótulo diz por qual campo se ordena");
      assert.ok(rotulo.length > 0);
    }
  });

  test("a listagem monta o seletor a partir da fonte única", () => {
    const codigo = semComentarios(ler(LISTA_CLIENTES));
    assert.match(codigo, /ORDENS_CLIENTE\.map/, "o seletor sai do vocabulário, não do JSX");
    assert.match(codigo, /aria-label="Ordenação da lista"/, "o seletor é anunciado");

    // Nenhum `<option value="nome_asc">` escrito à mão: seria a segunda lista,
    // livre para divergir — o defeito que `statusVisual.js` existe para não
    // repetir desde a 4.3.
    assert.doesNotMatch(
      codigo,
      /<option value="nome_(asc|desc)"/,
      "🚨 opção de ordenação escrita à mão no JSX — é a segunda lista"
    );
  });

  test("o padrão da tela é o padrão declarado, e não uma string solta", () => {
    const codigo = semComentarios(ler(LISTA_CLIENTES));
    assert.match(
      codigo,
      /ordem: ORDEM_CLIENTE_PADRAO/,
      "o inicial vem da constante — uma string aqui divergiria no dia em que o padrão mudasse"
    );
    assert.doesNotMatch(codigo, /ordem: 'nome_asc'/, "padrão escrito à mão");
  });

  test("a ordenação vai para a API", () => {
    const servico = semComentarios(ler("src/api/clientService.js"));
    assert.match(servico, /ordem/, "o serviço precisa repassar `ordem`");
    assert.match(servico, /if \(ordem\) params\.ordem = ordem/, "só envia quando há valor");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — DEC-062: mudar a ordenação VOLTA PARA A PÁGINA 1
//
// É a regra do passo 175, e o defeito que ela evita é traiçoeiro: quem está na
// página 4 e inverte a ordem continua na página 4 de uma lista que virou do
// avesso. A tela não erra — ela mostra, corretamente, a quarta página de outro
// conjunto — e não há nada explicando por que os nomes mudaram.
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-062 — a página volta para 1, e a ordem sobrevive à paginação", () => {
  test("a listagem usa `useListFilters`, que é onde a regra mora", () => {
    const codigo = semComentarios(ler(LISTA_CLIENTES));
    assert.match(codigo, /useListFilters/, "a regra do setPage(1) não se reescreve à mão");
    assert.match(codigo, /definirFiltro\('ordem'/, "trocar a ordem passa por `definirFiltro`");
    assert.match(codigo, /definirFiltro\('situacao'/, "e a situação também");
    assert.match(codigo, /definirFiltro\('busca'/, "e a busca também");
  });

  test("🚨 NENHUM controle escreve o filtro sem passar por `definirFiltro`", () => {
    const codigo = semComentarios(ler(LISTA_CLIENTES));
    // `setFiltros` direto pularia o `setPage(1)` — é a única forma de a regra
    // se perder sem que nada mais na tela mude.
    assert.doesNotMatch(
      codigo,
      /setFiltros\(/,
      "escrever o filtro direto pula o setPage(1) do hook"
    );
  });

  test("o hook de fato reinicia a página ao mudar um filtro", () => {
    // Executado de verdade, e não varrido: é a regra, não a fiação.
    const hook = semComentarios(ler("src/hooks/useListFilters.js"));
    const definir = hook.slice(hook.indexOf("const definirFiltro"));
    const corpo = definir.slice(0, definir.indexOf("}, []);"));
    assert.match(corpo, /setPage\(1\)/, "`definirFiltro` precisa reiniciar a página");
  });

  test("a página entra na consulta — a ordem sobrevive à navegação", () => {
    const codigo = semComentarios(ler(LISTA_CLIENTES));
    const consulta = codigo.slice(codigo.indexOf("const consulta = {"));
    const objeto = consulta.slice(0, consulta.indexOf("};"));

    // Os quatro juntos no MESMO objeto é o que faz trocar de página não perder
    // filtro nem ordem: a página é mais um campo da consulta, não um estado
    // paralelo.
    for (const campo of ["page", "limit", "ordem", "situacao"]) {
      assert.match(objeto, new RegExp(campo), `\`${campo}\` precisa estar na consulta`);
    }
  });

  test("o paginador está montado, com o rótulo no singular", () => {
    const codigo = semComentarios(ler(LISTA_CLIENTES));
    assert.match(codigo, /<Paginador/, "a listagem pagina de verdade");
    assert.match(codigo, /rotulo="cliente"/, "singular — quem conjuga é `pluralizar` (F-1b.3.1)");
    assert.match(codigo, /onMudarPagina=\{setPage\}/);
    // O `total` do envelope, e não `clientes.length`: o segundo é o tamanho da
    // PÁGINA, e o paginador exibiria "1–20 de 20" com 137 clientes no banco.
    assert.match(codigo, /total=\{total\}/);
    assert.match(codigo, /data\?\.total/, "o total vem do envelope da API");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — DEC-063: a regra de e-mail, executada
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-063 — a regra de e-mail", () => {
  // A MESMA tabela do backend (`tests/auth/email.test.js`). As duas listas são
  // idênticas de propósito: é ela que prova que a tela e o servidor concordam
  // caso a caso, e é ela que cai se alguém "melhorar" um dos dois lados.
  const CASOS = [
    ["daniel@lex.dev", true],
    ["daniel.rodrigues@lex.com.br", true],
    ["daniel+tag@lex.dev", true],
    ["daniel", false],
    ["daniel@", false],
    ["@lex.dev", false],
    ["daniel@lex", false],
    ["daniel @lex.dev", false],
    ["daniel@@lex.dev", false],
    ["daniel@lex..dev", false],
    ["  daniel@lex.dev  ", true]
  ];

  for (const [entrada, aceito] of CASOS) {
    test(`${aceito ? "aceita" : "recusa"} ${JSON.stringify(entrada)}`, () => {
      assert.equal(emailValido(entrada), aceito);
    });
  }

  test("o sinal de mais é aceito — é endereço válido e é usado", () => {
    assert.ok(emailValido("daniel+banca@lex.dev"));
    assert.ok(emailValido("a+b+c@x.com.br"));
  });

  test("a normalização é trim + caixa baixa e nunca devolve undefined", () => {
    assert.equal(normalizarEmail("  Daniel@LEX.dev "), "daniel@lex.dev");
    assert.equal(normalizarEmail(undefined), "");
    assert.equal(normalizarEmail(null), "");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 — DEC-063: a tela do login valida ANTES de enviar
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-063 — o login valida na tela, sem enviar", () => {
  test("o `LoginPage` confere o formato e sai sem chamar `login()`", () => {
    const codigo = semComentarios(ler(LOGIN));
    assert.match(codigo, /emailValido/, "a tela do login precisa validar o formato");

    const submit = codigo.slice(codigo.indexOf("const handleSubmit"));
    const guarda = submit.indexOf("if (!emailValido(email))");
    const chamada = submit.indexOf("await login(");
    assert.ok(guarda !== -1, "falta a guarda");
    assert.ok(
      guarda < chamada,
      "🚨 a guarda tem de vir ANTES do `await login()` — o ponto é não enviar"
    );

    // E o `return` dentro da guarda é o que impede a requisição de sair. Sem
    // ele a mensagem apareceria E a requisição partiria, que é o defeito com
    // cara de correção.
    const trecho = submit.slice(guarda, chamada);
    assert.match(trecho, /return;/, "a guarda precisa interromper o envio");
  });

  test("o `setLoading(true)` fica DEPOIS da guarda", () => {
    // Senão o botão entra em "Entrando..." e volta, piscando, para uma
    // requisição que nunca aconteceu.
    const codigo = semComentarios(ler(LOGIN));
    const submit = codigo.slice(codigo.indexOf("const handleSubmit"));
    assert.ok(
      submit.indexOf("if (!emailValido(email))") < submit.indexOf("setLoading(true)"),
      "a guarda precisa vir antes de o botão entrar em carregamento"
    );
  });

  test("a frase é a fonte única, e não um texto escrito na tela", () => {
    const codigo = semComentarios(ler(LOGIN));
    assert.match(codigo, /MENSAGEM_EMAIL_INVALIDO/);
    assert.doesNotMatch(codigo, /'E-mail inválido/, "frase escrita à mão na tela");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5 — DEC-063: NENHUMA tela monta a regra por conta própria
//
// O defeito que a A-1 encontrou foi exatamente este: a expressão vivia em
// `RegisterPage.jsx` **e** em `authValidation.js`, e as duas tinham o mesmo
// furo. Esta varredura é o que impede a terceira cópia.
// ═══════════════════════════════════════════════════════════════════════════
describe("DEC-063 — a regra tem UM dono", () => {
  test("nenhuma tela declara expressão de e-mail própria", () => {
    for (const arquivo of [LOGIN, CADASTRO, LISTA_CLIENTES]) {
      const codigo = semComentarios(ler(arquivo));
      assert.doesNotMatch(
        codigo,
        /EMAIL_REGEX|\[\^\\s@\]/,
        `🚨 ${arquivo}: expressão de e-mail escrita à mão — é a segunda regra`
      );
    }
  });

  test("o cadastro usa a fonte única, e a frase única", () => {
    const codigo = semComentarios(ler(CADASTRO));
    assert.match(codigo, /emailValido\(form\.email\)/, "o cadastro valida pela função única");
    assert.match(codigo, /MENSAGEM_EMAIL_INVALIDO/, "e usa a frase única");
    // A frase antiga tinha ponto final e a do servidor não — a mesma recusa
    // com duas caras, conforme a validação acontecesse antes ou depois do
    // envio.
    assert.doesNotMatch(codigo, /'E-mail inválido\.'/, "a frase divergente voltou");
  });

  test("a frase da tela é idêntica à do servidor, caractere a caractere", () => {
    // O backend a declara em `src/utils/email.js`; aqui basta travar o texto,
    // porque é ele que precisa bater. O par completo é conferido no teste de
    // paridade do backend.
    assert.equal(MENSAGEM_EMAIL_INVALIDO, "E-mail inválido");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 6 — PARIDADE COM O BACKEND
//
// As duas duplicações desta fase (o vocabulário de ordenação e a regra de
// e-mail) são espelhos SEM endpoint, de propósito: são constante, não dado.
// **O preço é a duplicação, e este bloco é o que a torna aceitável** — a mesma
// troca que `tiposEvento`, `fasesProcesso` e `tiposHonorario` já fazem.
// ═══════════════════════════════════════════════════════════════════════════
describe("A-1 — os espelhos não divergiram do backend", () => {
  const lerBackend = (rel) =>
    readFileSync(fileURLToPath(new URL(`../../../lex-backend/${rel}`, import.meta.url)), "utf8");

  test("o vocabulário de ordenação é o mesmo nos dois repos", () => {
    const fonte = lerBackend("src/utils/filtrosDeConsulta.js");
    const bloco = fonte.slice(fonte.indexOf("ORDENACOES_CLIENTE = Object.freeze("));
    const doBackend = [...bloco.slice(0, bloco.indexOf("]")).matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);

    assert.deepEqual(
      [...VALORES_ORDEM_CLIENTE],
      doBackend,
      "🚨 os valores divergiram — a tela mandaria um `ordem` que o backend recusa com 400"
    );
  });

  test("a regra de e-mail decide IGUAL nos dois repos, caso a caso", async () => {
    // Importado de verdade, e não varrido: o que precisa concordar é a
    // DECISÃO, não o texto do arquivo. Duas implementações podem ter a mesma
    // aparência e discordar num caso.
    const backend = await import(
      new URL("../../../lex-backend/src/utils/email.js", import.meta.url).href
    );

    const casos = [
      "daniel@lex.dev", "daniel.rodrigues@lex.com.br", "daniel+tag@lex.dev",
      "daniel", "daniel@", "@lex.dev", "daniel@lex", "daniel @lex.dev",
      "daniel@@lex.dev", "daniel@lex..dev", "  daniel@lex.dev  ",
      // Casos que não estão na tabela da fase: é aqui que duas cópias
      // costumam divergir, porque ninguém as escreveu pensando neles.
      "", "a@b.c", "daniel@lex.dev.", ".daniel@lex.dev", "DANIEL@LEX.DEV"
    ];

    for (const caso of casos) {
      assert.equal(
        emailValido(caso),
        backend.emailValido(caso),
        `🚨 a tela e o servidor discordam sobre ${JSON.stringify(caso)}`
      );
      assert.equal(normalizarEmail(caso), backend.normalizarEmail(caso));
    }
  });

  test("a frase é literalmente a mesma", async () => {
    const backend = await import(
      new URL("../../../lex-backend/src/utils/email.js", import.meta.url).href
    );
    assert.equal(MENSAGEM_EMAIL_INVALIDO, backend.MENSAGEM_EMAIL_INVALIDO);
  });
});
