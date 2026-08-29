// ═══════════════════════════════════════════════════════════════════════════
// D-1 — O QUE O DEPLOY PRECISA QUE ESTEJA ESCRITO (frontend)
//
// A fase não muda comportamento: ela faz o repositório rodar fora do
// `localhost`. O que dá para travar aqui é o que só apareceria depois de
// publicado — o endereço de desenvolvimento viajando dentro do bundle, a
// variável que ninguém configurou, e a versão de Node que o hospedeiro
// escolheria por nós.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

import { RAIZ } from "../helpers/cssScan.js";

const ler = (relativo) => readFileSync(resolve(RAIZ, relativo), "utf8");

const arquivosFonte = (dir = resolve(RAIZ, "src"), acc = []) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosFonte(caminho, acc);
    else if (/\.jsx?$/.test(nome)) acc.push(caminho);
  }
  return acc;
};

describe("D-1 — o modelo de variáveis do build de produção", () => {
  const CAMINHO = ".env.production.example";

  test("o arquivo existe e lista TODA variável `VITE_` que o código lê", () => {
    assert.ok(existsSync(resolve(RAIZ, CAMINHO)), `falta ${CAMINHO}`);
    const modelo = ler(CAMINHO);

    const lidas = new Set();
    for (const arquivo of arquivosFonte()) {
      const codigo = readFileSync(arquivo, "utf8");
      for (const m of codigo.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) lidas.add(m[1]);
    }
    // `vite.config.js` também lê variável — é lá que mora a guarda de build.
    for (const m of ler("vite.config.js").matchAll(/(VITE_[A-Z0-9_]+)/g)) lidas.add(m[1]);

    const ausentes = [...lidas].filter((nome) => !modelo.includes(nome)).sort();
    assert.deepEqual(
      ausentes, [],
      `o código lê estas variáveis e o modelo não as menciona: ${ausentes.join(", ")}`
    );
  });

  test("`VITE_API_URL` de produção é um CAMINHO relativo — é isso que o rewrite exige", () => {
    // Uma URL absoluta de outro domínio aqui faria o cookie `lex-token` virar
    // cross-site, e ele passaria a exigir `SameSite=None; Secure` — que parte
    // dos navegadores e dos bloqueadores recusa. Ver DEC-061.
    const linha = ler(CAMINHO).split("\n").find((l) => l.startsWith("VITE_API_URL="));
    assert.ok(linha, "o modelo precisa trazer a chave, com valor");

    const valor = linha.split("=").slice(1).join("=").trim();
    assert.equal(
      valor, "/api",
      `VITE_API_URL do modelo de produção é "${valor}" — precisa ser o caminho relativo /api`
    );
  });

  test("o `.env.example` de desenvolvimento continua apontando para o localhost", () => {
    // Os dois modelos existem para ambientes diferentes, e trocar um pelo
    // outro quebra o outro lado: `/api` em desenvolvimento chamaria o próprio
    // Vite, que não tem API nenhuma.
    assert.match(ler(".env.example"), /VITE_API_URL=http:\/\/localhost:3001\/api/);
  });
});

describe("D-1 — a guarda do build continua valendo (passo 148)", () => {
  const config = ler("vite.config.js").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  test("o build de produção aborta com a variável VAZIA", () => {
    // A mudança para caminho relativo não pode ter afrouxado a checagem: o que
    // ela recusa é a AUSÊNCIA, e `/api` é um valor tão presente quanto uma URL.
    assert.match(config, /url\s*===\s*['"]{2}/, "a guarda precisa testar a string vazia");
    assert.match(config, /throw new Error/, "faltando a variável, o build ABORTA");
  });

  test("a guarda não exige que o valor seja uma URL absoluta", () => {
    // Se alguém acrescentar `startsWith("http")` aqui, o deploy desta fase
    // para de buildar — e o erro vai parecer um problema de configuração.
    assert.ok(
      !/startsWith\(\s*['"]http/.test(config),
      "a guarda passou a exigir URL absoluta — o valor de produção é `/api`, um caminho"
    );
  });
});

describe("D-1 — o endereço de desenvolvimento não sobrevive ao build", () => {
  const assets = resolve(RAIZ, "dist");

  test("nenhum `localhost` COM PORTA em dist/", (t) => {
    if (!existsSync(assets)) {
      // `skip` explícito, e não passar em silêncio: sem `dist/` esta é a
      // verificação que não foi feita.
      t.skip("dist/ não existe — rode `VITE_API_URL=/api npm run build`");
      return;
    }

    // ── Por que "com porta", e não `localhost` cru ────────────────────────
    //
    // O alvo é o endereço de desenvolvimento DESTE projeto: `localhost:3001`
    // (API), `localhost:5173` (Vite) e `localhost:4173` (preview). Ele é o que
    // faria o deploy subir e falhar em toda requisição.
    //
    // `localhost` CRU sobrevive ao build, e não é nosso: `react-router` usa
    // `"http://localhost"` como base ao construir URLs quando não há
    // `window.location`, e o `axios` faz o mesmo para decidir se está num
    // navegador. Nos dois casos o valor real vem de `window.location` quando
    // ele existe — em produção, existe. Exigir zero ocorrências obrigaria a
    // remendar dependência de terceiro para satisfazer um `grep`.
    const arquivos = [];
    const varrer = (dir) => {
      for (const nome of readdirSync(dir)) {
        const caminho = join(dir, nome);
        if (statSync(caminho).isDirectory()) varrer(caminho);
        else arquivos.push(caminho);
      }
    };
    varrer(assets);

    const ofensores = [];
    for (const caminho of arquivos) {
      const conteudo = readFileSync(caminho, "utf8");
      for (const m of conteudo.matchAll(/localhost:(\d+)/g)) {
        ofensores.push(`${caminho.replace(`${RAIZ}/`, "")} → localhost:${m[1]}`);
      }
    }

    assert.deepEqual(
      ofensores, [],
      "o endereço de desenvolvimento entrou no bundle publicado:\n" + ofensores.join("\n")
    );
  });
});

describe("D-1 — a versão do Node é DECLARADA, e com teto", () => {
  const pkg = JSON.parse(ler("package.json"));

  test("`engines.node` existe e tem limite superior", () => {
    // O Render usa a versão DELE quando o repositório não declara nenhuma —
    // hoje a série 24 —, e a documentação dele pede explicitamente um teto:
    // faixa aberta resolve para o `latest`, que muda de major sozinho. O build
    // do frontend roda no Node do hospedeiro tanto quanto o backend.
    assert.ok(pkg.engines?.node, "sem `engines.node`, o hospedeiro escolhe por nós");
    assert.match(pkg.engines.node, /</, `"${pkg.engines.node}" não tem teto`);
  });

  test("a faixa aceita a versão em que a suíte roda", () => {
    const [major] = process.versions.node.split(".").map(Number);
    const min = Number(pkg.engines.node.match(/>=\s*(\d+)/)?.[1]);
    const max = Number(pkg.engines.node.match(/<\s*(\d+)/)?.[1]);
    assert.ok(major >= min && major < max, `Node ${process.versions.node} fora de "${pkg.engines.node}"`);
  });
});
