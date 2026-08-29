// ═══════════════════════════════════════════════════════════════════════════
// F-5a — VARREDURA ESTÁTICA: o que só existe na FIAÇÃO
//
// As regras 2 e 3 da fase — "o logout apaga tudo" e "trocar de usuário apaga o
// do anterior" — não cabem em função pura: elas são sobre QUEM CHAMA o quê, e
// em que ordem. `node --test` não tem IndexedDB nem navegador, e a fase proíbe
// dependência nova, então o que resta é analisar o arquivo.
//
// É análise de texto, e ela não prova que o banco ficou vazio — isso é o passo
// manual do DevTools no roteiro. O que ela prova é a REGRESSÃO: a chamada de
// limpeza sumindo num refactor, a ordem invertendo, uma tela montando chave por
// conta própria. Sem ela, as três coisas passariam calado, e a primeira notícia
// seria a estagiária vendo os clientes da advogada.
//
// ⚠️ É esta varredura que a mutação obrigatória (a) — remover a limpeza no
// logout — precisa derrubar.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

import { RAIZ } from "../helpers/cssScan.js";

const ler = (relativo) => readFileSync(resolve(RAIZ, relativo), "utf8");

// Varredura de CÓDIGO, não de prosa: sem isto, o comentário que EXPLICA a
// limpeza do logout satisfaria a asserção que o explica, e a saída óbvia seria
// apagar o comentário.
const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const arquivosFonte = (dir = resolve(RAIZ, "src"), acc = []) => {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) arquivosFonte(caminho, acc);
    else if (/\.jsx?$/.test(nome)) acc.push(caminho);
  }
  return acc;
};

const relativo = (caminho) => caminho.replace(`${RAIZ}/`, "");

// ═════════════════════════════════════════════════════════════════════════
// Regra 2 — O LOGOUT APAGA TUDO
// ═════════════════════════════════════════════════════════════════════════

describe("o logout apaga o espelho local", () => {
  const contexto = semComentarios(ler("src/contexts/AuthContext.jsx"));

  test("`AuthContext` importa a limpeza", () => {
    assert.match(
      contexto,
      /import\s*\{[^}]*clearAll[^}]*\}\s*from\s*['"][^'"]*offlineCache['"]/,
      "o contexto de sessão deixou de importar a limpeza do espelho local"
    );
  });

  test("`logout` CHAMA a limpeza", () => {
    const corpo = contexto.slice(contexto.indexOf("const logout"));
    const fim = corpo.indexOf("const updateUser");
    const logout = corpo.slice(0, fim > 0 ? fim : undefined);

    assert.match(
      logout,
      /await clearAll\(\)/,
      "sair da conta num computador emprestado precisa deixar o navegador limpo — " +
      "sem esta chamada, os dados da advogada anterior ficam no IndexedDB"
    );
  });

  test("a limpeza está no `finally`, junto do resto da saída de sessão", () => {
    // Falha na chamada de logout não pode deixar o espelho local para trás: é
    // a mesma razão pela qual `registrarUsuario(null)` já morava ali.
    const finallyDoLogout = contexto.slice(contexto.indexOf("const logout"));
    const bloco = finallyDoLogout.slice(finallyDoLogout.indexOf("} finally {"));
    const posClear = bloco.indexOf("clearAll()");
    const posRegistrar = bloco.indexOf("registrarUsuario(null)");

    assert.ok(posClear > -1 && posRegistrar > -1, "o `finally` do logout mudou de forma");
    assert.ok(
      posClear < posRegistrar,
      "a limpeza precisa acontecer antes de a navegação começar"
    );
  });

  test("a limpeza é APAGAR, e não marcar como inválido", () => {
    const cache = semComentarios(ler("src/offline/offlineCache.js"));
    const store = semComentarios(ler("src/offline/offlineStore.js"));

    assert.match(cache, /store\.clear\(\)/, "`clearAll` precisa apagar de verdade");
    assert.match(store, /objectStore\(STORE_ENTRADAS\)\.clear\(\)/);
    assert.match(store, /objectStore\(STORE_INDICE\)\.clear\(\)/);
    assert.ok(
      !/invalid|expirad|marcarComo/i.test(cache),
      "dado 'invalidado' que continua no disco continua sendo o dado"
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Regra 3 — TROCAR DE USUÁRIO APAGA O DO ANTERIOR, ANTES DE ESCREVER
// ═════════════════════════════════════════════════════════════════════════

describe("entrar com outro usuário limpa antes de escrever", () => {
  const contexto = semComentarios(ler("src/contexts/AuthContext.jsx"));

  // Os TRÊS caminhos de entrada de sessão. O `checkAuth` é o que menos vem à
  // cabeça e o mais importante: recarregar a página não passa pelo login, e é
  // exatamente o caminho de quem senta no computador do escritório.
  for (const entrada of ["checkAuth", "login", "register"]) {
    test(`\`${entrada}\` chama startSession ANTES de registrar o usuário`, () => {
      const inicio = contexto.indexOf(`const ${entrada} =`);
      assert.ok(inicio > -1, `${entrada} sumiu do contexto`);
      const trecho = contexto.slice(inicio, inicio + 700);

      const posSessao = trecho.indexOf("startSession(");
      const posRegistro = trecho.indexOf("registrarUsuario(");

      assert.ok(posSessao > -1, `${entrada} não limpa o escopo do usuário anterior`);
      assert.ok(
        posSessao < posRegistro,
        `${entrada}: limpar DEPOIS de registrar o usuário limpa por cima do que a ` +
        "sessão nova já escreveu — quem registra dispara a navegação, e a navegação grava"
      );
    });
  }

  test("o que se limpa é o que NÃO é do usuário que entrou", () => {
    const cache = semComentarios(ler("src/offline/offlineCache.js"));
    assert.match(cache, /keysOfOtherUsers\(chaves, userId\)/);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// Regra 1 — NENHUMA LEITURA MONTA CHAVE POR CONTA PRÓPRIA
// ═════════════════════════════════════════════════════════════════════════

describe("a chave escopada é montada num lugar só", () => {
  test("só `offline/offlineCache.js` chama `buildKey`", () => {
    // Uma tela que montasse a própria chave poderia esquecer o `userId` — e
    // esse esquecimento é o vazamento inteiro. O caminho para o banco é
    // `readCached`/`writeCached`, que exigem o usuário na assinatura.
    const AUTORIZADOS = ["src/offline/offlineCache.js", "src/offline/cacheKey.js"];
    const ofensores = [];

    for (const caminho of arquivosFonte()) {
      const rel = relativo(caminho);
      if (AUTORIZADOS.includes(rel)) continue;
      if (/\bbuildKey\s*\(/.test(semComentarios(readFileSync(caminho, "utf8")))) {
        ofensores.push(rel);
      }
    }
    assert.deepEqual(ofensores, [], `estes arquivos montam a chave por conta própria:\n${ofensores.join("\n")}`);
  });

  test("nenhuma tela escreve no banco direto", () => {
    const ofensores = [];
    for (const caminho of arquivosFonte()) {
      const rel = relativo(caminho);
      if (rel.startsWith("src/offline/")) continue;
      if (rel === "src/hooks/useCachedResource.js") continue; // o único consumidor
      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      if (/\b(writeCached|readCached)\s*\(/.test(codigo)) ofensores.push(rel);
    }
    assert.deepEqual(ofensores, [], "a leitura e a escrita do espelho passam pelo hook, não pelas telas");
  });

  test("toda tela que guarda passa um recurso da lista", () => {
    // `buildKey` já recusaria em tempo de execução; aqui a recusa acontece
    // antes, na suíte, e nomeia o arquivo.
    const permitidos = ler("src/offline/cacheKey.js")
      .match(/CACHEABLE_RESOURCES = Object\.freeze\(\[([\s\S]*?)\]\)/)[1]
      .match(/'([^']+)'/g)
      .map((s) => s.slice(1, -1));

    const usados = [];
    for (const caminho of arquivosFonte()) {
      const codigo = semComentarios(readFileSync(caminho, "utf8"));
      for (const m of codigo.matchAll(/resource:\s*'([^']+)'/g)) {
        usados.push([relativo(caminho), m[1]]);
      }
    }

    assert.ok(usados.length >= 8, `só ${usados.length} telas usam o espelho — a varredura quebrou`);
    for (const [arquivo, recurso] of usados) {
      assert.ok(permitidos.includes(recurso), `${arquivo}: recurso "${recurso}" fora da lista`);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════
// A CAMADA FINA NÃO DECIDE
// ═════════════════════════════════════════════════════════════════════════

describe("a camada de armazenamento é fina", () => {
  const store = semComentarios(ler("src/offline/offlineStore.js"));

  test("não importa a política nem a chave", () => {
    assert.ok(
      !/from\s*['"]\.\/(cachePolicy|cacheKey|offlineMessages)\.js['"]/.test(store),
      "decisão entrou na camada que só devia abrir, ler, escrever e apagar"
    );
  });

  test("não carrega limite, nem descarte, nem escopo", () => {
    for (const proibido of ["MAX_", "chooseEvictions", "isStorable", "belongsToUser", "userId"]) {
      assert.ok(
        !store.includes(proibido),
        `"${proibido}" no arquivo do banco: se você precisou de um \`if\` sobre o ` +
        "CONTEÚDO aqui, ele está no arquivo errado"
      );
    }
  });

  test("a política, essa sim, não sabe o que é IndexedDB", () => {
    const politica = semComentarios(ler("src/offline/cachePolicy.js"));
    assert.ok(!/indexedDB|objectStore|transaction/i.test(politica));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// PARTE 0 — O PORTAL DO CLIENTE NÃO FOI TOCADO
// ═════════════════════════════════════════════════════════════════════════

describe("o portal do cliente fica de fora", () => {
  // O portal roda no aparelho do cliente, que pode ser emprestado (passo 93).
  // Cache de dado jurídico ali é decisão de PRIVACIDADE, não de desempenho, e
  // ninguém a tomou.
  const ehDoPortal = (rel) =>
    rel.includes("/portal/") || rel.includes("PortalAuthContext") || rel.includes("portalAxios");

  test("nenhum arquivo do portal importa o espelho local", () => {
    const ofensores = [];
    for (const caminho of arquivosFonte()) {
      const rel = relativo(caminho);
      if (!ehDoPortal(rel)) continue;
      const codigo = readFileSync(caminho, "utf8");
      if (/from\s*['"][^'"]*\/offline\//.test(codigo) || /useCachedResource/.test(codigo)) {
        ofensores.push(rel);
      }
    }
    assert.deepEqual(ofensores, [], "a F-5a não toca no portal — Parte 0 da fase");
  });

  test("a instância de HTTP do portal não recebeu a guarda de escrita", () => {
    const portal = ler("src/api/portalAxios.js");
    assert.ok(!/shouldBlockWrite|offlineWriteError/.test(portal));
  });
});

// ═════════════════════════════════════════════════════════════════════════
// PARTE 3 e 4 — O AVISO E OS BOTÕES
// ═════════════════════════════════════════════════════════════════════════

describe("quem serve do espelho DIZ que está servindo do espelho", () => {
  const telasComEspelho = arquivosFonte()
    .filter((c) => /useCachedResource\(/.test(semComentarios(readFileSync(c, "utf8"))))
    .map(relativo)
    .filter((rel) => rel !== "src/hooks/useCachedResource.js");

  test("há telas convertidas para analisar", () => {
    assert.ok(telasComEspelho.length >= 8, `só ${telasComEspelho.length} telas — a varredura quebrou`);
  });

  for (const rel of ["src/pages/clients/ClientListPage.jsx"]) {
    test(`${rel.split("/").pop()} é uma das convertidas`, () => {
      assert.ok(telasComEspelho.includes(rel));
    });
  }

  test("toda tela convertida renderiza o aviso de idade", () => {
    const semAviso = telasComEspelho.filter((rel) => {
      const codigo = semComentarios(ler(rel));
      return !/fromCache && <OfflineNotice atualizadoEm=\{updatedAt\}/.test(codigo);
    });
    assert.deepEqual(
      semAviso, [],
      "dado offline nunca se apresenta como dado ao vivo — estas telas servem do " +
      `espelho sem dizer de quando é o dado:\n${semAviso.join("\n")}`
    );
  });

  test("o aviso mostra a hora do DADO, e não a de agora", () => {
    const aviso = semComentarios(ler("src/components/ui/OfflineNotice.jsx"));
    assert.match(aviso, /offlineNoticeText\(atualizadoEm\)/);
    assert.ok(!/Date\.now\(\)/.test(aviso), "a tela não pode carimbar a hora atual no dado guardado");
  });
});

describe("nenhum formulário aceita envio que vai falhar", () => {
  // ── A F-5b tirou UM formulário desta lista, e não afrouxou a regra ──────
  //
  // `EventFormPage` passou a GRAVAR sem sinal (DEC-059): o compromisso vai
  // para a fila em vez de ser recusado. A regra desta varredura continua
  // valendo nele — "nenhum formulário aceita envio que vai falhar" —, só que
  // agora ela é satisfeita pelo outro lado: **o envio não falha**, ele fica
  // guardado. O bloco seguinte é quem cobra isso dele.
  //
  // Todo o resto continua aqui, inclusive os quatro do financeiro, que a
  // Parte 0 da F-5b manteve de fora da fila de propósito.
  const FORMULARIOS = [
    "src/pages/clients/ClientFormPage.jsx",
    "src/pages/processes/ProcessFormPage.jsx",
    "src/pages/fees/FeeFormPage.jsx",
    "src/pages/installments/InstallmentFormPage.jsx",
    "src/pages/payments/PaymentFormPage.jsx",
    "src/pages/secoes/SecaoFormPage.jsx",
    "src/pages/profile/ProfilePage.jsx"
  ];

  for (const arquivo of FORMULARIOS) {
    test(`${arquivo.split("/").pop()}: botão anunciado, clique barrado e motivo na tela`, () => {
      const codigo = semComentarios(ler(arquivo));

      assert.match(
        codigo, /aria-disabled=\{online \? undefined : 'true'\}/,
        "`aria-disabled`, e não `disabled`: um botão desabilitado de verdade não recebe " +
        "foco, e o motivo ficaria invisível para quem depende de leitor de tela (DEC-053)"
      );
      assert.match(
        codigo, /if \(!online\) return;/,
        "`aria-disabled` só ANUNCIA — a recusa tem de acontecer no handler"
      );
      assert.match(
        codigo, /\{!online && <OfflineWriteReason \/>\}/,
        "o motivo precisa aparecer NA TELA: deixar salvar para dar erro depois perde o que foi digitado"
      );
    });
  }
});

describe("a segunda barreira: a escrita sem sinal nem sai do aparelho", () => {
  const config = semComentarios(ler("src/api/axiosConfig.js"));

  test("o interceptor de requisição consulta a guarda", () => {
    assert.match(config, /api\.interceptors\.request\.use/);
    assert.match(config, /shouldBlockWrite\(\{ method: config\.method, online: lerOnline\(\) \}\)/);
    assert.match(config, /Promise\.reject\(offlineWriteError\(config\)\)/);
  });

  test("sem sinal, o erro genérico de rede vira a explicação", () => {
    assert.match(config, /offlineErrorMessage\(error, \{ online: lerOnline\(\) \}\)/);
  });

  test("a REGRA mora fora do arquivo de fiação, para poder ser testada", () => {
    // Mesma razão registrada em `api/sessionLoss.js` (DEC-050): `axiosConfig.js`
    // importa `utils/toast` sem extensão e a suíte não consegue carregá-lo.
    const guard = semComentarios(ler("src/offline/writeGuard.js"));
    assert.match(guard, /export const shouldBlockWrite/);
    assert.ok(!/axios/.test(guard), "a regra não pode depender da instância de HTTP");
  });
});
