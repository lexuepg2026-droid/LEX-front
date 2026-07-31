// ═══════════════════════════════════════════════════════════════════════════
// PORTAL DO CLIENTE — o que a varredura de CSS não alcança
//
// A varredura de `appliedClasses.test.js` já pega as páginas do portal
// automaticamente, porque elas estão em `AppRoutes.jsx`. O que ela NÃO pega, e
// este arquivo pega:
//
//   1. import cruzado entre o portal e as telas da advogada;
//   2. o portal usando a instância de HTTP errada;
//   3. os quatro códigos de erro estáveis deixando de ser tratados;
//   4. formulário novo sem `.form-group` — destaque de erro inerte;
//   5. o chunk do portal deixando de ser separado.
//
// ── Por que análise estática, e o que ela não prova ────────────────────────
// Sem navegador e sem jsdom, como todo o resto desta suíte. Isto NÃO prova que
// o portal funciona: prova que as decisões estruturais da Fase 3.2 continuam
// escritas no código. São exatamente as que somem num refactor distraído sem
// quebrar build nem lint — um `import api from '../api/axiosConfig'` colado por
// engano num arquivo do portal passa nos dois, e só aparece quando um cliente
// erra a senha e é jogado para o login da advogada.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";

import { RAIZ } from "../helpers/cssScan.js";

const SRC = resolve(RAIZ, "src");

// Todos os arquivos que compõem o portal. Lista derivada de diretório, e não
// escrita à mão: arquivo novo do portal entra na varredura sozinho, que é o
// ponto — uma lista manual deixaria de cobrir justamente o arquivo que alguém
// acrescentar sem ler este teste.
const arquivosDoPortal = () => {
  const encontrados = [];

  const andar = (dir) => {
    if (!existsSync(dir)) return;
    for (const nome of readdirSync(dir).sort()) {
      const caminho = resolve(dir, nome);
      if (statSync(caminho).isDirectory()) andar(caminho);
      else if (/\.(jsx?|css)$/.test(nome)) encontrados.push(caminho);
    }
  };

  andar(resolve(SRC, "pages", "portal"));
  andar(resolve(SRC, "components", "portal"));
  encontrados.push(resolve(SRC, "contexts", "PortalAuthContext.jsx"));
  encontrados.push(resolve(SRC, "api", "portalAxios.js"));
  encontrados.push(resolve(SRC, "api", "portalService.js"));

  return encontrados.filter((c) => existsSync(c));
};

const ler = (caminho) => readFileSync(caminho, "utf8");
const rel = (caminho) => relative(RAIZ, caminho);

const importsDe = (codigo) => {
  const alvos = [];
  for (const m of codigo.matchAll(/import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g)) {
    alvos.push(m[1]);
  }
  for (const m of codigo.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    alvos.push(m[1]);
  }
  return alvos;
};

describe("portal do cliente: fronteiras estruturais", () => {
  const arquivos = arquivosDoPortal();

  test("há arquivos de portal para analisar", () => {
    // Se a descoberta quebrar, tudo abaixo passa vazio e o arquivo vira teatro.
    assert.ok(
      arquivos.length >= 8,
      `só ${arquivos.length} arquivos de portal encontrados — a descoberta quebrou`
    );
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 1. Nenhum import cruzado
  // ═════════════════════════════════════════════════════════════════════════

  // Módulos que são EXCLUSIVOS das telas da advogada. Não é "tudo que não é do
  // portal": `utils/apiError`, `utils/toast` e `react` são infraestrutura
  // compartilhada e devem mesmo ser reaproveitados — reescrever
  // `getApiErrorMessage` no portal seria pior.
  //
  // O que não pode atravessar é o que carrega DECISÃO da outra superfície: a
  // instância de HTTP com o interceptor que redireciona para `/login`, o
  // contexto de sessão da advogada, o portão de rota dela, e o CSS e os
  // componentes de layout do sistema de gestão.
  const PROIBIDOS = [
    { fragmento: "api/axiosConfig", motivo: "a instância da advogada — o interceptor dela manda 401 para /login" },
    { fragmento: "contexts/AuthContext", motivo: "o contexto de sessão da advogada" },
    { fragmento: "common/ProtectedRoute", motivo: "o portão de rota da advogada" },
    { fragmento: "layout/Sidebar", motivo: "o menu do sistema de gestão" },
    { fragmento: "layout/Header", motivo: "o cabeçalho da advogada" },
    { fragmento: "layout/AppLayout", motivo: "o layout da advogada" },
    { fragmento: "layout/BottomNav", motivo: "a navegação da advogada" },
    { fragmento: "api/clientService", motivo: "service da API da advogada" },
    { fragmento: "api/processService", motivo: "service da API da advogada" },
    { fragmento: "api/documentService", motivo: "service da API da advogada" },
    { fragmento: "api/authService", motivo: "service da API da advogada" },
    { fragmento: "api/dashboardService", motivo: "service da API da advogada" },
    { fragmento: "api/feeService", motivo: "service da API da advogada" },
    { fragmento: "api/installmentService", motivo: "service da API da advogada" },
    { fragmento: "api/paymentService", motivo: "service da API da advogada" },
    { fragmento: "api/secaoService", motivo: "service da API da advogada" },
    { fragmento: "api/financeiroService", motivo: "service da API da advogada" },
  ];

  test("nenhum arquivo do portal importa módulo exclusivo das telas da advogada", () => {
    const violacoes = [];

    for (const arquivo of arquivos) {
      if (arquivo.endsWith(".css")) continue;
      const codigo = ler(arquivo);
      for (const alvo of importsDe(codigo)) {
        for (const { fragmento, motivo } of PROIBIDOS) {
          if (alvo.includes(fragmento)) {
            violacoes.push(`${rel(arquivo)} importa "${alvo}" — ${motivo}`);
          }
        }
      }
    }

    assert.deepEqual(
      violacoes,
      [],
      `import cruzado entre o portal e as telas da advogada:\n  - ${violacoes.join("\n  - ")}`
    );
  });

  test("nenhum CSS do portal importa CSS das telas da advogada", () => {
    const violacoes = [];

    for (const arquivo of arquivos.filter((a) => a.endsWith(".css"))) {
      const css = ler(arquivo);
      for (const m of css.matchAll(/@import\s+(?:url\()?\s*['"]([^'"]+)['"]/g)) {
        const alvo = m[1];
        // Só `styles/` (tokens e global) é compartilhado por desenho.
        if (alvo.startsWith("http")) continue;
        if (alvo.includes("styles/")) continue;
        violacoes.push(`${rel(arquivo)} importa "${alvo}"`);
      }
    }

    assert.deepEqual(violacoes, [], `CSS do portal importando CSS da advogada:\n  - ${violacoes.join("\n  - ")}`);
  });

  test("o layout do portal não monta Sidebar nem Header", () => {
    const layout = ler(resolve(SRC, "components", "portal", "PortalLayout.jsx"));

    // Import já é coberto acima; aqui se checa o USO, porque um dia alguém
    // pode declarar o componente no mesmo arquivo em vez de importar.
    for (const proibido of ["<Sidebar", "<Header", "<AppLayout", "<BottomNav"]) {
      assert.ok(
        !layout.includes(proibido),
        `PortalLayout.jsx monta "${proibido}" — o portal não tem o menu do sistema de gestão`
      );
    }

    // E tem o que precisa ter: uma saída visível.
    assert.match(
      layout,
      /Sair/,
      "PortalLayout.jsx precisa do botão de sair — o aparelho pode ser emprestado"
    );
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 2. Instância de HTTP correta, nas duas direções
  // ═════════════════════════════════════════════════════════════════════════

  test("todo arquivo do portal que fala HTTP usa a instância do portal", () => {
    const violacoes = [];

    for (const arquivo of arquivos) {
      if (arquivo.endsWith(".css")) continue;
      const codigo = ler(arquivo);

      // `axios.create` fora de `portalAxios.js` seria uma terceira instância,
      // sem o interceptor de sessão do portal.
      if (codigo.includes("axios.create") && !arquivo.endsWith("portalAxios.js")) {
        violacoes.push(`${rel(arquivo)} cria uma instância de axios própria`);
      }
    }

    assert.deepEqual(violacoes, [], violacoes.join("\n"));
  });

  test("nenhuma tela da advogada usa a instância do portal", () => {
    // A direção contrária importa tanto quanto: uma tela da advogada que
    // chamasse `portalApi` mandaria o cookie errado e perderia o interceptor
    // que a devolve ao login dela.
    const violacoes = [];
    const doPortal = new Set(arquivos.map(String));

    const andar = (dir) => {
      for (const nome of readdirSync(dir).sort()) {
        const caminho = resolve(dir, nome);
        if (statSync(caminho).isDirectory()) {
          andar(caminho);
          continue;
        }
        if (!/\.jsx?$/.test(nome)) continue;
        if (doPortal.has(String(caminho))) continue;
        // `AppRoutes.jsx` monta o ramo do portal por `lazy()` — é a fronteira,
        // e é o único lugar de fora que pode nomear os arquivos do portal.
        if (caminho.endsWith(resolve(SRC, "routes", "AppRoutes.jsx"))) continue;

        const codigo = ler(caminho);
        for (const alvo of importsDe(codigo)) {
          if (alvo.includes("portalAxios") || alvo.includes("portalService")) {
            violacoes.push(`${rel(caminho)} importa "${alvo}" — é tela da advogada`);
          }
        }
      }
    };
    andar(SRC);

    assert.deepEqual(violacoes, [], violacoes.join("\n"));
  });

  test("portalService usa portalApi em toda chamada, e nunca `api`", () => {
    const codigo = ler(resolve(SRC, "api", "portalService.js"));

    // Toda rota chamada passa por `portalApi.`
    const chamadas = [...codigo.matchAll(/(\w+)\.(get|post|patch|put|delete)\s*\(/g)];
    assert.ok(chamadas.length >= 8, `só ${chamadas.length} chamadas HTTP encontradas em portalService.js`);

    for (const [, objeto, metodo] of chamadas) {
      assert.equal(
        objeto,
        "portalApi",
        `portalService.js chama \`${objeto}.${metodo}()\` — tem de ser \`portalApi\``
      );
    }

    // E toda rota é do prefixo do portal.
    for (const m of codigo.matchAll(/portalApi\.\w+\(\s*[`'"]([^`'"]+)/g)) {
      assert.ok(
        m[1].startsWith("/portal"),
        `portalService.js chama "${m[1]}", que não é rota do portal`
      );
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 3. Os quatro códigos de erro estáveis, e o 429
  // ═════════════════════════════════════════════════════════════════════════

  test("os quatro códigos de erro estáveis aparecem tratados no portal", () => {
    // Vocabulário fechado do backend (`src/config/portalErrors.js`). Se um
    // deles sumir do frontend, a tela volta a rotear por texto de mensagem —
    // que é exatamente como a Fase 1.3 quebrou.
    const CODIGOS = [
      "credenciaisInvalidas",
      "sessaoPortalInvalida",
      "senhaPortalProvisoria",
      "confirmacaoExigeSenhaPropria",
    ];

    const tudo = arquivos
      .filter((a) => !a.endsWith(".css"))
      .map(ler)
      .join("\n");

    for (const codigo of CODIGOS) {
      assert.ok(
        tudo.includes(codigo),
        `o código "${codigo}" não aparece em nenhum arquivo do portal — ` +
        `sem ele a tela não tem como rotear e voltaria a depender do texto da mensagem`
      );
    }
  });

  test("o 429 tem caminho próprio no login, separado do 401", () => {
    const login = ler(resolve(SRC, "pages", "portal", "PortalLoginPage.jsx"));

    assert.match(
      login,
      /429/,
      "PortalLoginPage.jsx não trata 429 — confundir excesso de tentativas com " +
      "credencial inválida faz o cliente tentar de novo e estender o bloqueio"
    );
    assert.match(login, /401/, "PortalLoginPage.jsx precisa tratar o 401 do login");

    // Os dois caminhos escrevem em estados DIFERENTES. Se os dois caíssem na
    // mesma variável de mensagem, a distinção existiria no código e não na
    // tela.
    assert.match(
      login,
      /setExcessoDeTentativas\(true\)/,
      "o 429 precisa de estado próprio, distinto da mensagem de credencial inválida"
    );
  });

  test("o login do portal não valida o FORMATO do código de acesso", () => {
    const login = ler(resolve(SRC, "pages", "portal", "PortalLoginPage.jsx"));

    // O backend normaliza caixa e espaço de propósito, porque a advogada dita
    // o código por telefone. Uma máscara ou um regex aqui recusaria o que o
    // servidor aceita — a tela nunca pode ser mais rígida que a API.
    const suspeitas = [
      /\/\^LEX/i,                      // regex ancorado no prefixo
      /maskCodigo|maskLex/,            // máscara de código
      /toUpperCase\(\)\s*!==/,         // comparação de caixa como validação
    ];

    for (const suspeita of suspeitas) {
      assert.ok(
        !suspeita.test(login),
        `PortalLoginPage.jsx parece validar o formato do código (${suspeita}) — ` +
        `o backend aceita minúsculas e espaços, e a tela não pode recusar o que ele aceita`
      );
    }

    // A única validação de cliente permitida é campo vazio.
    assert.match(
      login,
      /trim\(\)\s*===\s*''/,
      "a validação de campo vazio precisa continuar existindo"
    );
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 4. `.form-group` nos formulários novos
  // ═════════════════════════════════════════════════════════════════════════

  test("todo input do portal está dentro de .form-group", () => {
    // O seletor do destaque de erro é `.form-group input.input-erro`. Um input
    // fora desse invólucro tem o destaque INERTE: a classe é aplicada e
    // visualmente nada acontece. A varredura de CSS não pega, porque a regra
    // existe — foi o defeito da Fase 2E.1, e este é o teste que impede a
    // repetição.
    const comFormulario = arquivos.filter(
      (a) => !a.endsWith(".css") && ler(a).includes("<input")
    );

    assert.ok(comFormulario.length >= 2, "esperava ao menos 2 arquivos do portal com input");

    for (const arquivo of comFormulario) {
      const codigo = ler(arquivo);
      const inputs = (codigo.match(/<input/g) ?? []).length;
      const grupos = (codigo.match(/className="form-group"/g) ?? []).length;

      assert.ok(
        grupos >= inputs,
        `${rel(arquivo)} tem ${inputs} <input> e só ${grupos} .form-group — ` +
        `input fora do invólucro tem destaque de erro inerte (o seletor é ` +
        `\`.form-group input.input-erro\`)`
      );
    }
  });

  test("a folha do portal declara .form-group input.input-erro", () => {
    // O portal não importa CSS das telas da advogada, então a regra precisa
    // existir na folha dele. Sem isto, o teste acima passaria e o destaque
    // continuaria inerte — o invólucro certo sem a regra não pinta nada.
    const css = ler(resolve(SRC, "components", "portal", "Portal.css"));

    assert.match(
      css,
      /\.form-group\s+input\.input-erro/,
      "Portal.css precisa da regra `.form-group input.input-erro` — sem ela o " +
      "destaque de erro do portal fica inerte, como na Fase 2E.1"
    );
  });

  // ═════════════════════════════════════════════════════════════════════════
  // 5. Carregamento em chunk próprio
  // ═════════════════════════════════════════════════════════════════════════

  test("todo o portal entra por lazy() em AppRoutes.jsx", () => {
    const rotas = ler(resolve(SRC, "routes", "AppRoutes.jsx"));

    // Import estático de qualquer coisa do portal derruba o chunk separado: o
    // cliente passaria a baixar o bundle das telas da advogada, e a advogada o
    // do portal. É invisível em lint e em build — só aparece no tamanho do
    // arquivo, que ninguém olha.
    for (const m of rotas.matchAll(/import\s+[^'"]*?\sfrom\s+['"]([^'"]+)['"]/g)) {
      assert.ok(
        !m[1].includes("portal") && !m[1].includes("Portal"),
        `AppRoutes.jsx importa "${m[1]}" ESTATICAMENTE — o portal precisa entrar ` +
        `por lazy() para ficar em chunk próprio`
      );
    }

    // E as páginas do portal estão de fato em `lazy()`.
    for (const pagina of ["PortalLoginPage", "PortalPasswordPage", "PortalProcessPage"]) {
      assert.match(
        rotas,
        new RegExp(`lazy\\(\\(\\)\\s*=>\\s*import\\(['"][^'"]*${pagina}`),
        `${pagina} precisa entrar por lazy() em AppRoutes.jsx`
      );
    }
  });

  test("o build separa o chunk do portal", (t) => {
    // Verificação do ARTEFATO, não da causa. O teste de `lazy()` acima prova
    // que a intenção está escrita; este prova que o Vite de fato a cumpriu —
    // e são coisas diferentes, porque a configuração de bundling pode mudar
    // sem ninguém tocar em `AppRoutes.jsx`.
    const assets = resolve(RAIZ, "dist", "assets");

    if (!existsSync(assets)) {
      // `skip` explícito, e não passar em silêncio: sem `dist/` este teste não
      // verificou nada, e o relatório precisa dizer isso em vez de somar mais
      // um "ok" que não olhou para lugar nenhum.
      t.skip("dist/ não existe — rode `npm run build` para exercer esta verificação");
      return;
    }

    const arquivosDoBuild = readdirSync(assets);
    const chunksDoPortal = arquivosDoBuild.filter(
      (n) => n.startsWith("Portal") && n.endsWith(".js")
    );

    assert.ok(
      chunksDoPortal.length >= 3,
      `esperava ao menos 3 chunks do portal em dist/assets, achei ${chunksDoPortal.length}: ` +
      `${chunksDoPortal.join(", ") || "(nenhum)"}`
    );

    // O bundle principal não pode conter o texto das telas do portal: se
    // contiver, o `lazy()` existe mas o código foi para dentro do chunk
    // inicial mesmo assim, e o cliente baixa tudo.
    const principal = arquivosDoBuild.find((n) => n.startsWith("index-") && n.endsWith(".js"));
    assert.ok(principal, "não achei o chunk principal em dist/assets");

    const conteudo = readFileSync(resolve(assets, principal), "utf8");
    assert.ok(
      !conteudo.includes("Código de acesso ou senha inválidos"),
      "o texto da tela de login do portal está no chunk PRINCIPAL — " +
      "o cliente e a advogada estão baixando o bundle um do outro"
    );
  });

  test("as rotas do portal ficam fora do ProtectedRoute da advogada", () => {
    const rotas = ler(resolve(SRC, "routes", "AppRoutes.jsx"));

    // O bloco `/portal` não pode estar aninhado no `/dashboard`. A checagem é
    // por posição: o ramo do portal precisa FECHAR antes de o do dashboard
    // abrir. Um cliente que caísse no portão da advogada seria mandado para a
    // tela de login de um sistema que não é dele.
    const inicioPortal = rotas.indexOf('path="/portal"');
    const inicioDashboard = rotas.indexOf('path="/dashboard"');

    assert.ok(inicioPortal !== -1, 'AppRoutes.jsx precisa da rota "/portal"');
    assert.ok(inicioDashboard !== -1, 'AppRoutes.jsx precisa da rota "/dashboard"');

    const trechoDoPortal = rotas.slice(
      inicioPortal,
      inicioDashboard > inicioPortal ? inicioDashboard : rotas.length
    );

    assert.ok(
      !trechoDoPortal.includes("<ProtectedRoute"),
      "o ramo do portal não pode passar pelo ProtectedRoute da advogada"
    );
    assert.ok(
      trechoDoPortal.includes("<PortalProtectedRoute"),
      "o ramo do portal precisa do portão próprio"
    );
  });
});
