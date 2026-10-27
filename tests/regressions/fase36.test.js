// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.6 — o perfil da advogada (DEC-126 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Foco, clique no rótulo e pixel
// ficam na verificação no navegador e no roteiro visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { situacaoDoEmail } from "../../src/components/layout/confirmacaoEmail.js";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const perfil = semComentarios(ler("src/pages/profile/ProfilePage.jsx"));

// ── Item 2 — cabeçalho, seções, rótulos e e-mail (DEC-127) ────────────────
describe("Fase 3.6 · item 2 — o cabeçalho e as seções (DEC-127)", () => {
  test("a situação do e-mail: confirmado com a data do fuso do escritório, não confirmado, e silêncio sem o campo", () => {
    assert.equal(situacaoDoEmail({ emailConfirmadoEm: null }), "Não confirmado");
    // 02:00 UTC de 26/10 ainda é 25/10 em Brasília.
    assert.equal(situacaoDoEmail({ emailConfirmadoEm: "2026-10-26T02:00:00.000Z" }), "Confirmado em 25/10/2026");
    assert.equal(situacaoDoEmail({ emailConfirmadoEm: "2026-10-26T15:00:00.000Z" }), "Confirmado em 26/10/2026");
    assert.equal(situacaoDoEmail({}), null, "servidor sem o campo não afirma nada");
    assert.equal(situacaoDoEmail(null), null);
    assert.equal(situacaoDoEmail({ emailConfirmadoEm: "lixo" }), null);
  });

  test("as quatro seções, nesta ordem", () => {
    const titulos = [...perfil.matchAll(/<h3 id="[^"]+">([^<]+)<\/h3>/g)].map((m) => m[1].trim());
    assert.deepEqual(titulos, [
      "Dados da conta",
      "Dados do escritório — aparecem nos documentos",
      "Endereço do escritório",
      "Segurança",
    ]);
  });

  test("o cabeçalho: avatar grande na cor 1 fixa, nome, OAB e o e-mail com a situação", () => {
    assert.match(perfil, /<Avatar id=\{user\?\.id\} nome=\{user\?\.nomeCompleto\} tamanho="grande" cor=\{1\} \/>/);
    assert.match(perfil, /`OAB \$\{user\.oab\.estado\} \$\{user\.oab\.numero\}`/);
    assert.match(perfil, /processo-balao processo-cabecalho perfil-cabecalho/);
    const avatar = semComentarios(ler("src/components/ui/Avatar.jsx"));
    assert.match(avatar, /avatar--cor-\$\{cor \?\? indiceDaCor\(id\)\}/, "sem `cor`, o cliente continua pela cor do id");
  });

  test("todo rótulo aponta para um campo que existe (htmlFor ↔ id)", () => {
    const labels = [...perfil.matchAll(/<label\b([^>]*)>/g)].map((m) => m[1]);
    assert.ok(labels.length >= 20, `rótulos: ${labels.length}`);
    for (const attrs of labels) {
      const alvo = attrs.match(/htmlFor="([^"]+)"/)?.[1];
      assert.ok(alvo, `rótulo sem htmlFor: <label${attrs}>`);
      assert.match(perfil, new RegExp(`\\bid="${alvo}"`), `htmlFor="${alvo}" sem campo`);
    }
  });

  test("toda ajuda citada em aria-describedby existe", () => {
    const ids = [...perfil.matchAll(/aria-describedby="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/));
    assert.ok(ids.length >= 10);
    for (const id of ids) assert.match(perfil, new RegExp(`\\bid="${id}"`), `aria-describedby="${id}" sem alvo`);
  });

  test("os rótulos e as ajudas das decisões 1, 4 e 8", () => {
    assert.match(perfil, />Nome do escritório \(no timbrado\)\*</);
    assert.doesNotMatch(perfil, />Nome\*</, "o \"Nome*\" solto da advocacia saiu");
    assert.match(perfil, /Identifica a sua conta\./);
    assert.match(perfil, /Com ou sem @\./);
    // Cada campo do escritório diz onde aparece — ou que não aparece.
    for (const id of ["advNome", "telefone", "advChavePix", "advInstagram", "advSite", "logo"]) {
      assert.match(perfil, new RegExp(`id="perfil-${id}-ajuda"`), `ajuda de ${id}`);
    }
  });

  test("o e-mail é só leitura e focável, com a situação e o reenvio do hook da DEC-088", () => {
    assert.match(perfil, /<input id="perfil-email" type="email" value=\{user\?\.email \|\| ''\} readOnly/);
    assert.doesNotMatch(perfil, /id="perfil-email"[^>]*\bdisabled\b/);
    assert.match(perfil, /useConfirmacaoEmail\(\)/);
    assert.match(perfil, /situacaoDoEmail\(user\)/);
    assert.match(perfil, /Reenviar confirmação/);
  });

  test("o reenvio sai num toast só, e sem sinal diz o motivo", () => {
    const corpo = perfil.slice(perfil.indexOf("const handleReenviar"), perfil.indexOf("const oab = user"));
    assert.match(corpo, /if \(!online\) return;/);
    assert.match(corpo, /if \(resultado\.tipo === 'ok'\) toast\.success\(resultado\.texto\);/);
    assert.match(corpo, /else if \(!resultado\.jaAvisado\) toast\.error\(resultado\.texto\);/);
    assert.match(perfil, /onClick=\{handleReenviar\}[\s\S]{0,80}aria-disabled=\{online \? undefined : 'true'\}/);
    assert.match(perfil, /\{pendente && !online && <OfflineWriteReason \/>\}/);
    // O reenvio continua `semToastGlobal` (DEC-084): o global não repete.
    assert.match(ler("src/api/authService.js"), /resendConfirmation = \(\) => api\.post\('\/auth\/resend-confirmation', undefined, SO_A_TELA_AVISA\)/);
  });

  test("a troca de senha continua separada, com as mesmas validações", () => {
    assert.match(perfil, /<form onSubmit=\{handleSenhaSubmit\}/);
    assert.match(perfil, /if \(!senhaForte\(novaSenha\)\) return setSenhaError\(SENHA_FRACA\);/);
    assert.match(perfil, /if \(novaSenha !== confirmarNovaSenha\) return setSenhaError/);
    assert.match(perfil, /if \(novaSenha === senhaAtual\) return setSenhaError/);
    assert.match(perfil, /authService\.changePassword\(senhaAtual, novaSenha\)/);
  });
});

// ── Item 3 — salvar só o que mudou (DEC-128) ─────────────────────────────
import { formularioDoPerfil, montarPayloadPerfil, semAlteracoes } from "../../src/utils/perfilPayload.js";

const USUARIO = {
  id: "u1",
  nomeCompleto: "Laís Exemplo",
  cpf: "52998224725",
  telefone: "42999991234",
  oab: { numero: "12345", estado: "PR" },
  advocacia: {
    nome: "Escritório Exemplo", chavePix: "pix@exemplo.dev",
    instagram: "@exemplo", site: "https://exemplo.dev",
    logoBase64: "data:image/png;base64,AAAA",
  },
  endereco: {
    cep: "84010200", logradouro: "Rua XV", numero: "10", complemento: "Sala 2",
    bairro: "Centro", cidade: "Ponta Grossa", estado: "PR", pais: "Brasil",
  },
};

describe("Fase 3.6 · item 3 — o payload do perfil (DEC-128)", () => {
  const inicial = formularioDoPerfil(USUARIO);

  test("nada mudou → payload vazio", () => {
    const p = montarPayloadPerfil(inicial, formularioDoPerfil(USUARIO));
    assert.deepEqual(p, {});
    assert.equal(semAlteracoes(p), true);
  });

  test("um campo mudou → só ele (também dentro do subdocumento)", () => {
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, nomeCompleto: "Laís Nova" }), { nomeCompleto: "Laís Nova" });
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, advSite: "https://novo.dev" }), { advocacia: { site: "https://novo.dev" } });
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, cidade: "Castro" }), { endereco: { cidade: "Castro" } });
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, oabEstado: "SC" }), { oab: { estado: "SC" } });
    assert.equal(semAlteracoes(montarPayloadPerfil(inicial, { ...inicial, oabEstado: "SC" })), false);
  });

  test("campo apagado → null (e não string vazia nem ausente)", () => {
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, advInstagram: "" }), { advocacia: { instagram: null } });
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, telefone: "" }), { telefone: null });
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, complemento: "   " }), { endereco: { complemento: null } });
  });

  test("máscara não conta como mudança: o mesmo CPF, telefone e CEP com e sem pontuação", () => {
    assert.equal(inicial.cpf, "529.982.247-25");
    const mesmo = { ...inicial, cpf: "52998224725", telefone: "42999991234", cep: "84010200" };
    assert.deepEqual(montarPayloadPerfil(inicial, mesmo), {});
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, nomeCompleto: "  Laís Exemplo  " }), {}, "espaço nas pontas também não");
  });

  test("CPF, telefone e CEP mudados vão SEM máscara", () => {
    const p = montarPayloadPerfil(inicial, { ...inicial, cpf: "111.444.777-35", telefone: "(42) 3222-1111", cep: "84010-000" });
    assert.deepEqual(p, { cpf: "11144477735", telefone: "4232221111", endereco: { cep: "84010000" } });
  });

  test("o logo removido → null", () => {
    assert.deepEqual(montarPayloadPerfil(inicial, { ...inicial, advLogo: "" }), { advocacia: { logoBase64: null } });
    const semLogo = formularioDoPerfil({ ...USUARIO, advocacia: { ...USUARIO.advocacia, logoBase64: null } });
    assert.deepEqual(montarPayloadPerfil(semLogo, { ...semLogo, advLogo: "data:image/png;base64,BBBB" }),
      { advocacia: { logoBase64: "data:image/png;base64,BBBB" } });
  });

  test("o país ausente vira \"Brasil\" dos dois lados e não gera envio", () => {
    const semPais = formularioDoPerfil({ ...USUARIO, endereco: { ...USUARIO.endereco, pais: null } });
    assert.deepEqual(montarPayloadPerfil(semPais, { ...semPais }), {});
  });

  test("a tela usa o módulo, desabilita o Salvar sem alteração e diz o motivo", () => {
    assert.match(perfil, /const payload = montarPayloadPerfil\(inicial, form\);/);
    assert.match(perfil, /const semAlteracao = semAlteracoes\(payload\);/);
    assert.match(perfil, /disabled=\{saving \|\| semAlteracao\}/);
    assert.match(perfil, />Nenhuma alteração</);
    assert.match(perfil, /if \(semAlteracao\) return;/, "o Enter num campo também não envia");
    assert.match(perfil, /authService\.updateMe\(payload\)/);
    assert.doesNotMatch(perfil, /const buildPayload|const buildForm/, "a regra mora num lugar só");
  });

  test("depois de salvar o \"inicial\" passa a ser o salvo; um checkAuth não apaga a edição", () => {
    assert.match(perfil, /updateUser\(res\.data\.usuario\);\s*resync\(res\.data\.usuario\);/);
    assert.match(perfil, /if \(!user \|\| user\.id === contaSincronizada\.current\) return;/);
  });
});

// ── Item 4 — o exemplo do timbrado na tela (DEC-129) ─────────────────────
describe("Fase 3.6 · item 4 — o exemplo do timbrado (DEC-129)", () => {
  const auth = semComentarios(ler("src/api/authService.js"));

  test("baixa a rota nova como blob, com o nome pelo utilitário dos downloads e o revoke garantido", () => {
    assert.match(auth, /baixarExemploTimbrado = \(\) =>\s*api\.get\('\/auth\/me\/timbrado-exemplo', \{ responseType: 'blob' \}\)/);
    assert.match(auth, /import \{ nomeDoAnexo \} from '\.\.\/utils\/download';/);
    assert.match(auth, /nomeDoAnexo\(response, 'exemplo-timbrado\.pdf'\)/);
    assert.match(auth, /finally \{\s*URL\.revokeObjectURL\(url\);\s*\}/);
  });

  test("o botão fica na seção do escritório, e não desenha timbrado em HTML", () => {
    const escritorio = perfil.slice(perfil.indexOf('id="perfil-secao-escritorio"'), perfil.indexOf('id="perfil-secao-endereco"'));
    assert.match(escritorio, /Ver exemplo do timbrado/);
    assert.match(escritorio, /onClick=\{handleExemploTimbrado\}/);
    assert.doesNotMatch(perfil, /montarTimbrado|timbradoTitulo|<iframe/, "a prévia é o PDF do servidor, nunca um desenho");
  });

  test("com alteração não salva o botão continua ativo e a tela avisa", () => {
    assert.match(perfil, /disabled=\{baixandoExemplo\}/, "o botão não depende de `semAlteracao`");
    assert.match(perfil, /\{semAlteracao \? '' : 'Salve para ver as mudanças no exemplo\.'\}/);
    assert.match(perfil, /<p className="perfil-exemplo__aviso" role="status">/);
  });

  test("sem sinal: anunciado como desabilitado, clique barrado e o motivo do download", () => {
    const corpo = perfil.slice(perfil.indexOf("const handleExemploTimbrado"), perfil.indexOf("const oab = user"));
    assert.match(corpo, /if \(!online \|\| baixandoExemplo\) return;/);
    assert.match(perfil, /onClick=\{handleExemploTimbrado\}\s*disabled=\{baixandoExemplo\} aria-disabled=\{online \? undefined : 'true'\}/);
    assert.match(perfil, /\{!online && <p id="perfil-exemplo-offline" className="offline-write-reason">\{MENSAGEM_DOWNLOAD_OFFLINE\}<\/p>\}/);
  });

  test("o erro segue a política do toast global (DEC-084): um toast só", () => {
    const corpo = perfil.slice(perfil.indexOf("const handleExemploTimbrado"), perfil.indexOf("const oab = user"));
    assert.match(corpo, /if \(!jaAvisadoPeloToastGlobal\(err\)\)/);
  });
});
