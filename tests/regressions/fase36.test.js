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
