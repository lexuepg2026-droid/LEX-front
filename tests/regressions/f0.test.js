// ═══════════════════════════════════════════════════════════════════════════
// FASE F-0 — varreduras das correções de faxina
//
// ── O que estas varreduras provam, e o que NÃO provam ──────────────────────
// São análise de arquivo, sem navegador, no padrão de `financial/estatica.test.js`.
// Não pintam pixel e não clicam. O que provam é a REGRESSÃO ESPECÍFICA de cada
// item — o endereço de desenvolvimento voltando para dentro de um `axios.create`,
// o `<Loading />` sumindo de um formulário num refactor, a listagem por processo
// voltando a pedir a página inteira sem dizer que truncou.
//
// Três dos quatro defeitos desta fase eram invisíveis para lint, build e suíte.
// É por isso que a guarda precisa existir: nenhum deles quebrava nada.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import { RAIZ } from "../helpers/cssScan.js";

const ler = (relativo) => readFileSync(resolve(RAIZ, relativo), "utf8");

const semComentarios = (codigo) =>
  codigo
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

// ═══════════════════════════════════════════════════════════════════════════
// 1 — A URL base da API
// ═══════════════════════════════════════════════════════════════════════════
describe("F-0: a URL base da API tem fonte única e não vaza para produção", () => {
  const INSTANCIAS = ["src/api/axiosConfig.js", "src/api/portalAxios.js"];

  test("as duas instâncias de axios leem `api/baseURL.js`", () => {
    for (const arquivo of INSTANCIAS) {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /from\s+['"]\.\/baseURL['"]/,
        `${arquivo}: a URL base precisa vir do módulo compartilhado. ` +
        "Duas cópias da mesma decisão divergem — bastaria mudar o fallback de um " +
        "lado para o portal e as telas da advogada falarem com servidores diferentes."
      );
      assert.match(codigo, /baseURL:\s*BASE_URL/, `${arquivo}: usa BASE_URL na criação da instância`);
    }
  });

  test("nenhuma instância escreve o endereço de desenvolvimento à mão", () => {
    for (const arquivo of INSTANCIAS) {
      const codigo = semComentarios(ler(arquivo));
      assert.doesNotMatch(
        codigo, /localhost:3001/,
        `${arquivo}: o endereço de desenvolvimento voltou para dentro da instância. ` +
        "Era assim que ele chegava ao bundle de produção."
      );
    }
  });

  test("o fallback é guardado por `import.meta.env.DEV`, na forma que o Vite substitui", () => {
    const codigo = semComentarios(ler("src/api/baseURL.js"));

    assert.match(
      codigo, /import\.meta\.env\.DEV/,
      "sem a guarda, o bundle de produção sai apontando para a máquina de quem compilou"
    );

    // A forma importa: o Vite só troca `import.meta.env.DEV` por `false` quando
    // ele aparece LITERALMENTE. Lendo a flag de um parâmetro (`env?.DEV`), a
    // substituição não acontece, o ramo não vira código morto e o literal
    // `http://localhost:3001` viaja para o arquivo publicado — foi exatamente o
    // que a primeira versão desta guarda fez, e o `grep` no `dist/` pegou.
    assert.doesNotMatch(
      codigo, /\benv\?\.\s*DEV\b/,
      "a flag precisa ser lida na forma literal `import.meta.env.DEV`, não de um parâmetro"
    );

    // O ramo de produção não pode ter fallback nenhum: precisa lançar.
    assert.match(codigo, /throw new Error/, "sem VITE_API_URL em produção, o módulo precisa falhar alto");
  });

  test("o build de produção tem guarda em `vite.config.js`", () => {
    const codigo = semComentarios(ler("vite.config.js"));

    assert.match(codigo, /VITE_API_URL/, "a guarda precisa nomear a variável que exige");
    assert.match(codigo, /apply:\s*['"]build['"]/, "vale só no build — `npm run dev` continua sem exigir nada");
    assert.match(codigo, /throw new Error/, "faltando a variável, o build precisa ABORTAR, não avisar");
    assert.match(
      codigo, /mode\s*!==\s*['"]production['"]/,
      "a exigência é do modo produção"
    );
  });

  test("`.env.production.example` existe e documenta a variável", () => {
    assert.ok(
      existsSync(resolve(RAIZ, ".env.production.example")),
      "sem o exemplo, a mensagem de erro do build manda copiar um arquivo que não existe"
    );
    assert.match(ler(".env.production.example"), /^VITE_API_URL=/m);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2 — `<Loading />` na leitura dos formulários de edição
// ═══════════════════════════════════════════════════════════════════════════
describe("F-0: os formulários de edição mostram carregamento na leitura", () => {
  const FORMULARIOS = [
    "src/pages/fees/FeeFormPage.jsx",
    "src/pages/payments/PaymentFormPage.jsx",
    "src/pages/installments/InstallmentFormPage.jsx",
    "src/pages/clients/ClientFormPage.jsx",
    "src/pages/processes/ProcessFormPage.jsx"
  ];

  test("os cinco importam e renderizam `<Loading />` enquanto leem", () => {
    for (const arquivo of FORMULARIOS) {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /import Loading from/,
        `${arquivo}: precisa do componente de carregamento do projeto`
      );
      assert.match(
        codigo, /if\s*\(carregandoRegistro\)\s*return\s*<Loading\s*\/>/,
        `${arquivo}: sem a guarda, abrir a edição pinta o formulário VAZIO e os campos ` +
        "aparecem de repente quando o GET volta — e a advogada digita por cima do que " +
        "ainda vai ser sobrescrito."
      );
    }
  });

  test("o estado começa em `true` quando há id — senão o vazio pisca antes do spinner", () => {
    for (const arquivo of FORMULARIOS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /useState\(Boolean\(id\)\)/,
        `${arquivo}: iniciar em \`false\` mostra o formulário vazio por um quadro antes do spinner`
      );
    }
  });

  test("o carregamento termina SEMPRE, inclusive quando a leitura falha", () => {
    // Sem isto, um GET que falha deixa o spinner girando para sempre e a tela
    // nunca chega a mostrar a mensagem de erro que ela já sabe montar.
    for (const arquivo of FORMULARIOS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /finally\s*\{?\s*\(?\s*\)?\s*=?>?\s*[\s\S]{0,40}setCarregandoRegistro\(false\)/,
        `${arquivo}: \`setCarregandoRegistro(false)\` precisa estar num \`finally\`, não só no caminho feliz`
      );
    }
  });

  test("`loading` continua sendo o do botão Salvar — os dois estados não se misturam", () => {
    for (const arquivo of FORMULARIOS) {
      const codigo = semComentarios(ler(arquivo));
      assert.match(
        codigo, /disabled=\{loading\}/,
        `${arquivo}: o estado do botão Salvar não pode ter sido substituído pelo da leitura`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3 — As listagens por processo depois da paginação do backend
//
// Até a F-0, `?processoId=` tinha caminho próprio no backend e devolvia TUDO,
// ignorando `limit`. Estas duas telas renderizam o array inteiro, sem paginador
// — funcionavam por causa do defeito. Corrigido o backend, o default de 20
// passaria a truncar em silêncio.
// ═══════════════════════════════════════════════════════════════════════════
describe("F-0: listagens por processo pedem o teto e avisam quando truncam", () => {
  const LISTAGENS = [
    ["src/pages/payments/PaymentListPage.jsx", "recebimentos"],
    ["src/pages/installments/InstallmentListPage.jsx", "parcelas"]
  ];

  test("as duas pedem explicitamente o teto de 100", () => {
    for (const [arquivo] of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /const LIMITE = 100/,
        `${arquivo}: precisa pedir o teto da API. Pedir 20 truncaria a lista em silêncio ` +
        "agora que o backend respeita a paginação também no caminho de processoId."
      );
      assert.match(codigo, /limit:\s*LIMITE/, `${arquivo}: o limite pedido precisa ser o declarado`);
    }
  });

  test("as duas leem o `total` do envelope e avisam quando a lista está incompleta", () => {
    for (const [arquivo, rotulo] of LISTAGENS) {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /setTotal\(/,
        `${arquivo}: sem ler o \`total\`, a tela não tem como saber que truncou`
      );
      assert.match(
        codigo, /total\s*!==\s*null\s*&&\s*total\s*>/,
        `${arquivo}: o aviso precisa comparar o total com o que foi exibido`
      );
      assert.match(
        codigo, /aviso-lista-parcial/,
        `${arquivo}: uma lista curta com cara de completa faz a advogada somar ${rotulo} que não estão ali`
      );
    }
  });

  test("a classe do aviso alcança regra CSS pela própria tela", () => {
    // Mesma regra da varredura de `appliedClasses.test.js`: a folha é importada
    // pelo componente que aplica a classe, e não pelo layout que o monta.
    const css = ler("src/styles/modules.css");
    assert.match(css, /\.aviso-lista-parcial\s*\{/, "a classe aplicada precisa ter regra");

    for (const [arquivo] of LISTAGENS) {
      assert.match(
        ler(arquivo), /styles\/modules\.css/,
        `${arquivo}: precisa importar a folha que declara a regra que ele aplica`
      );
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4 — O service worker e o lint
// ═══════════════════════════════════════════════════════════════════════════
describe("F-0: o service worker declara os globais no lugar que o flat config lê", () => {
  test("a diretiva `eslint-env` não voltou ao sw.js", () => {
    // Varredura pela DIRETIVA (comentário de bloco), não pela string solta —
    // mesma razão de `css/foco.test.js`: o comentário que explica o defeito
    // contém a expressão, e uma varredura ingênua derrubaria a própria
    // explicação. A saída óbvia seria apagar o comentário, que é o contrário
    // do que se quer. Esta asserção já falhou uma vez por isso, nesta fase.
    assert.doesNotMatch(
      ler("public/sw.js"), /\/\*\s*eslint-env\b/,
      "o flat config do ESLint 9 já ignora a diretiva `eslint-env` (com aviso) e o ESLint 10 " +
      "a reporta como ERRO — o comentário que existia para calar o lint viraria o motivo de " +
      "ele falhar. Os globais vivem em `eslint.config.js`."
    );
  });

  test("os globais de service worker e de Node vivem no eslint.config.js", () => {
    const codigo = semComentarios(ler("eslint.config.js"));

    assert.match(codigo, /files:\s*\[['"]public\/sw\.js['"]\]/, "o sw.js precisa do próprio bloco");
    assert.match(codigo, /globals\.serviceworker/, "`self`, `caches` e `clients` não existem em globals.browser");
    assert.match(codigo, /globals\.node/, "`vite.config.js` usa `process.cwd()` na guarda do build");
  });
});
