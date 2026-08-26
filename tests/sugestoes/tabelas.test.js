// ═══════════════════════════════════════════════════════════════════════════
// AS TABELAS DE DOMÍNIO — o envelope, a procedência e o BUNDLE (F-4)
//
// ── O que este arquivo existe para pegar ───────────────────────────────────
// Duas regressões, e as duas são silenciosas:
//
// 1. **O Davi manda uma versão nova com outro formato.** As tabelas vêm de
//    fora do repositório, de quatro fontes diferentes, e a próxima entrega
//    pode trocar `itens` por `dados`, ou perder o `versao`. Sem esta suíte, o
//    sintoma seria um campo que simplesmente para de sugerir — sem erro, sem
//    log, sem ninguém notar até a advogada reclamar.
//
// 2. **Alguém importa a tabela do CNJ estaticamente.** Um
//    `import cnj from '../../public/tabelas/classes-assuntos-cnj.json'` num
//    formulário é uma linha, passa no lint, passa no build, e costura 658 KB
//    dentro do chunk principal — que toda tela do sistema baixa. O custo não
//    aparece em lugar nenhum a não ser no tempo de carregamento do login.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import {
  TABELAS,
  CHAVES_ENVELOPE,
  conferirEnvelope,
  caminhoDaTabela,
  gentilicos,
  rotuloComarca,
  rotuloProfissao,
  rotuloCnj,
} from "../../src/utils/tabelasDominio.js";
import { RAIZ, SRC } from "../helpers/cssScan.js";

const PASTA = resolve(RAIZ, "public", "tabelas");
const ler = (nome) => JSON.parse(readFileSync(resolve(PASTA, `${nome}.json`), "utf8"));

// As contagens conferidas na entrega de 23/08/2026. Estão aqui em número
// cheio, e não como "> 0", de propósito: uma extração que perdesse metade das
// ocupações continuaria "tendo itens", e nada acusaria.
const ESPERADO = {
  comarcas:       { arquivo: "comarcas-pr",          itens: 161 },
  nacionalidades: { arquivo: "nacionalidades",       itens: 196 },
  profissoes:     { arquivo: "profissoes-cbo",       itens: 2725 },
  cnj:            { arquivo: "classes-assuntos-cnj", classes: 847, assuntos: 5598 },
};

describe("as quatro tabelas carregam e têm o envelope esperado", () => {
  test("os quatro arquivos existem em `public/tabelas/`", () => {
    for (const [nome, def] of Object.entries(TABELAS)) {
      const caminho = resolve(PASTA, `${def.arquivo}.json`);
      assert.ok(existsSync(caminho), `falta ${def.arquivo}.json (tabela ${nome})`);
    }
  });

  test("todas trazem `tabela`, `versao`, `fonte` e `url` preenchidos", () => {
    for (const [nome, def] of Object.entries(TABELAS)) {
      const dado = ler(def.arquivo);
      for (const chave of CHAVES_ENVELOPE) {
        assert.equal(
          typeof dado[chave], "string",
          `${def.arquivo}.json: \`${chave}\` precisa ser texto`
        );
        assert.notEqual(dado[chave].trim(), "", `${def.arquivo}.json: \`${chave}\` vazio`);
      }
      assert.equal(dado.tabela, def.arquivo, `${def.arquivo}.json: \`tabela\` não bate com o nome`);
      assert.doesNotThrow(() => conferirEnvelope(dado, nome));
    }
  });

  test("as contagens são as que o Davi entregou — 161, 196, 2.725, 847+5.598", () => {
    for (const [nome, esperado] of Object.entries(ESPERADO)) {
      const dado = ler(esperado.arquivo);
      for (const [lista, quantos] of Object.entries(esperado)) {
        if (lista === "arquivo") continue;
        assert.equal(
          dado[lista].length, quantos,
          `${esperado.arquivo}.json: esperava ${quantos} em \`${lista}\`, achei ${dado[lista].length} (tabela ${nome})`
        );
      }
    }
  });

  test("cada item tem a forma que os rótulos esperam", () => {
    const comarcas = ler("comarcas-pr");
    assert.ok(comarcas.itens.every((i) => typeof i.nome === "string" && i.nome !== ""));
    assert.ok(comarcas.itens.every((i) => typeof i.entrancia === "string"));
    assert.equal(rotuloComarca(comarcas.itens[0]), comarcas.itens[0].nome);

    const cbo = ler("profissoes-cbo");
    assert.ok(cbo.itens.every((i) => typeof i.nome === "string" && typeof i.codigo === "string"));
    assert.equal(rotuloProfissao(cbo.itens[0]), cbo.itens[0].nome);

    const cnj = ler("classes-assuntos-cnj");
    assert.ok(cnj.classes.every((i) => typeof i.nome === "string" && typeof i.codigo === "string"));
    assert.ok(cnj.assuntos.every((i) => typeof i.nome === "string" && "pai" in i));
    assert.equal(rotuloCnj(cnj.classes[0]), cnj.classes[0].nome);

    const nac = ler("nacionalidades");
    assert.ok(nac.itens.every((i) => i.pais && i.masculino && i.feminino),
      "toda nacionalidade precisa das DUAS flexões — é o que a procuração lê");
  });

  test("o envelope é CONFERIDO, e um formato novo é acusado em vez de ignorado", () => {
    const bom = ler("comarcas-pr");
    assert.doesNotThrow(() => conferirEnvelope(bom, "comarcas"));

    for (const chave of CHAVES_ENVELOPE) {
      const quebrado = { ...bom };
      delete quebrado[chave];
      assert.throws(
        () => conferirEnvelope(quebrado, "comarcas"),
        new RegExp(chave),
        `sem \`${chave}\` o carregamento tem que falhar dizendo o nome do campo`
      );
    }

    assert.throws(() => conferirEnvelope({ ...bom, itens: "não é lista" }, "comarcas"), /itens/);
    assert.throws(() => conferirEnvelope(null, "comarcas"), /comarcas/);
    // O CNJ tem DUAS listas: perder uma delas também é formato novo.
    const cnj = ler("classes-assuntos-cnj");
    assert.doesNotThrow(() => conferirEnvelope(cnj, "cnj"));
    const semAssuntos = { ...cnj };
    delete semAssuntos.assuntos;
    assert.throws(() => conferirEnvelope(semAssuntos, "cnj"), /assuntos/);
  });

  test("a nacionalidade sai FLEXIONADA pelo sexo, e sem sexo oferece as duas", () => {
    const nac = ler("nacionalidades");
    const brasil = nac.itens.find((i) => i.pais === "Brasil");
    assert.deepEqual([brasil.masculino, brasil.feminino], ["brasileiro", "brasileira"]);

    assert.ok(gentilicos(nac, "feminino").includes("brasileira"));
    assert.ok(!gentilicos(nac, "feminino").includes("brasileiro"));
    assert.ok(gentilicos(nac, "masculino").includes("brasileiro"));
    assert.ok(!gentilicos(nac, "masculino").includes("brasileira"));

    const semSexo = gentilicos(nac, "");
    assert.ok(semSexo.includes("brasileiro") && semSexo.includes("brasileira"),
      "sem sexo escolhido o campo não decide por ela — oferece as duas formas");
    assert.deepEqual(gentilicos(null, "feminino"), []);
  });
});

describe("a procedência sobrevive ao arquivo", () => {
  test("o RELATORIO.md do Davi viaja JUNTO das tabelas, no repositório", () => {
    const caminho = resolve(PASTA, "RELATORIO.md");
    assert.ok(existsSync(caminho),
      "o RELATORIO.md precisa ficar ao lado dos arquivos — é o que diz de onde eles vieram");
  });

  test("a RESSALVA do CNJ está escrita, e nomeia o dump de terceiro", () => {
    // A tabela do CNJ não veio do SGT oficial: a consulta em massa estava
    // bloqueada. Quem abrir o arquivo daqui a um ano precisa saber disso antes
    // de tratá-lo como fonte oficial.
    const relatorio = readFileSync(resolve(PASTA, "RELATORIO.md"), "utf8");
    assert.match(relatorio, /CNJ/, "o RELATORIO.md precisa falar do CNJ");
    assert.match(
      relatorio, /bloquead/i,
      "a ressalva do CNJ — a consulta oficial estava bloqueada — não pode sumir do RELATORIO.md"
    );
    assert.match(
      relatorio, /dump/i,
      "a ressalva precisa dizer que os dados vieram de um dump, e não do SGT oficial"
    );
  });

  test("todas as quatro declaram fonte e URL no próprio arquivo", () => {
    for (const def of Object.values(TABELAS)) {
      const dado = ler(def.arquivo);
      assert.match(dado.url, /^https?:\/\//, `${def.arquivo}.json: \`url\` precisa ser um endereço`);
    }
  });
});

describe("a tabela do CNJ NÃO entra no bundle principal", () => {
  test("nada em `src/` importa um .json estaticamente", () => {
    // A mutação obrigatória (b) da fase. Um `import` de .json é o que faz o
    // Vite costurar o arquivo dentro do chunk.
    const arquivos = [];
    const varrer = (dir) => {
      for (const entrada of readdirSync(dir, { withFileTypes: true })) {
        const caminho = resolve(dir, entrada.name);
        if (entrada.isDirectory()) varrer(caminho);
        else if (/\.(js|jsx)$/.test(entrada.name)) arquivos.push(caminho);
      }
    };
    varrer(SRC);

    for (const caminho of arquivos) {
      const texto = readFileSync(caminho, "utf8");
      assert.ok(
        !/^\s*import\s+[^;]*from\s+['"][^'"]+\.json['"]/m.test(texto),
        `${caminho}: import estático de .json costura a tabela no bundle`
      );
      assert.ok(
        !/import\(\s*['"][^'"]*tabelas\/[^'"]*\.json['"]\s*\)/.test(texto),
        `${caminho}: import() dinâmico de tabela vira chunk do build — as tabelas vêm por fetch`
      );
    }
  });

  test("o caminho é uma URL estática, estável e sem hash — o que a F-5 vai precisar", () => {
    for (const [nome, def] of Object.entries(TABELAS)) {
      const caminho = caminhoDaTabela(nome);
      assert.equal(caminho, `/tabelas/${def.arquivo}.json`);
      assert.ok(!/-[A-Za-z0-9_]{8}\.json$/.test(caminho),
        "URL com hash impediria o service worker de cachear por nome fixo");
    }
    assert.throws(() => caminhoDaTabela("inexistente"), /desconhecida/);
  });

  test("o build não leva conteúdo de tabela nenhum para dentro dos chunks", (t) => {
    const assets = resolve(RAIZ, "dist", "assets");
    if (!existsSync(assets)) {
      // `skip` explícito, e não passar em silêncio: sem `dist/` esta é a
      // verificação que não foi feita, e é a mais importante do arquivo.
      t.skip("dist/ não existe — rode `npm run build` para exercer esta verificação");
      return;
    }

    // Uma amostra de cada tabela, escolhida por ser inconfundível.
    const marcas = [
      ["PROCESSO CÍVEL E DO TRABALHO", "classes do CNJ"],
      ["DIREITO PREVIDENCIÁRIO", "assuntos do CNJ"],
      ["Oficial general da aeronáutica", "ocupações da CBO"],
      ["Almirante Tamandaré", "comarcas do TJPR"],
      ["afegão", "nacionalidades"],
    ];

    const chunks = readdirSync(assets).filter((f) => f.endsWith(".js"));
    assert.ok(chunks.length > 0, "não achei chunk nenhum em dist/assets");

    for (const arquivo of chunks) {
      const conteudo = readFileSync(resolve(assets, arquivo), "utf8");
      for (const [marca, qual] of marcas) {
        assert.ok(
          !conteudo.includes(marca),
          `dist/assets/${arquivo} carrega ${qual} — a tabela entrou no bundle`
        );
      }
    }
  });

  test("as tabelas saem do build como arquivos estáticos, prontas para o cache", (t) => {
    const destino = resolve(RAIZ, "dist", "tabelas");
    if (!existsSync(resolve(RAIZ, "dist"))) {
      t.skip("dist/ não existe — rode `npm run build`");
      return;
    }
    assert.ok(existsSync(destino), "o build precisa copiar `public/tabelas/` para `dist/tabelas/`");
    for (const def of Object.values(TABELAS)) {
      assert.ok(
        existsSync(resolve(destino, `${def.arquivo}.json`)),
        `falta dist/tabelas/${def.arquivo}.json`
      );
    }
    assert.ok(existsSync(resolve(destino, "RELATORIO.md")),
      "a procedência também vai para o build, ao lado das tabelas");
  });
});
