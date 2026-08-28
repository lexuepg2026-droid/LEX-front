// ═══════════════════════════════════════════════════════════════════════════
// DEC-053 (frontend) — O MOTIVO APARECE, E NOMEIA O PAI
//
// ── O que a tela precisa garantir ────────────────────────────────────────
// 1. O motivo da recusa aparece NA TELA e NOMEIA o cliente. Recusar em
//    silêncio é pior que permitir; e uma recusa genérica manda a advogada
//    procurar, num cadastro inteiro, qual cliente está fora.
// 2. Nenhuma tela dispara a ação que o backend recusaria sem avisar. São DUAS
//    barreiras, e as duas são necessárias:
//      • o item do menu já nasce desabilitado, a partir da listagem;
//      • o preview é relido no clique, para o caso da aba velha.
// 3. O item DESABILITADO continua alcançável por teclado. Um motivo que só o
//    mouse alcança não foi escrito para quem mais depende de texto.
//
// ── A autoridade continua sendo do backend ──────────────────────────────
// Nada aqui substitui a guarda do serviço — `tests/integrity/dec053.test.js`,
// no backend, prova a recusa chamando `reactivateProcess` direto. Esta suíte
// prova que a tela não OFERECE o que seria recusado.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { motivoDeNaoReativar } from "../../src/utils/activationMessages.js";
import { blockReason, MENSAGEM_ESCRITA_OFFLINE } from "../../src/offline/offlineMessages.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("DEC-053 — a frase da recusa", () => {
  test("nomeia o cliente, e diz o que fazer", () => {
    const frase = motivoDeNaoReativar([
      { tipo: "Client", id: "1", nome: "Beatriz Ramos Pereira" }
    ]);
    assert.ok(frase.includes("Beatriz Ramos Pereira"), `precisa nomear: ${frase}`);
    assert.match(frase, /desativado/);
    assert.match(frase, /Reative o cliente primeiro/);
  });

  test("dois clientes: concorda no plural e nomeia os dois", () => {
    // Concordância errada numa frase que a advogada lê todo dia faz o sistema
    // parecer improvisado — é a mesma razão do `plural()` da DEC-052.
    const frase = motivoDeNaoReativar([
      { tipo: "Client", id: "1", nome: "Ana Lima" },
      { tipo: "Client", id: "2", nome: "Bruno Sá" }
    ]);
    assert.ok(frase.includes("Ana Lima"));
    assert.ok(frase.includes("Bruno Sá"));
    assert.match(frase, /Os clientes/);
    assert.match(frase, /estão desativados/);
  });

  test("sem impedimento devolve `null` — e é `null` que devolve o item ao normal", () => {
    assert.equal(motivoDeNaoReativar([]), null);
    assert.equal(motivoDeNaoReativar(undefined), null);
    assert.equal(motivoDeNaoReativar(null), null);
  });

  test("a frase NUNCA é genérica — a mensagem sem nome é o defeito", () => {
    // Esta é a asserção que a mutação (b) da fase derruba. Se alguém trocar a
    // frase por um texto fixo, o nome some e o teste cai aqui.
    const frase = motivoDeNaoReativar([
      { tipo: "Client", id: "1", nome: "Carlos Andrade" }
    ]);
    assert.ok(
      frase.includes("Carlos Andrade"),
      "a recusa genérica é o defeito, não uma variação aceitável"
    );
  });
});

describe("DEC-053 — a tela não oferece o que o backend recusaria", () => {
  const listagem = semComentarios(ler("src/pages/processes/ProcessListPage.jsx"));

  test("o item 'Reativar' recebe o motivo vindo da listagem", () => {
    // ── A F-5a embrulhou este motivo, e NÃO o substituiu ──────────────────
    //
    // Sem sinal, o mesmo item passa a ter dois motivos possíveis — o cliente
    // desativado (DEC-053) e a falta de conexão (F-5a) — e `blockReason`
    // escolhe qual aparece. O que este teste continua exigindo é que o motivo
    // da própria linha seja o que chega ali: um `blockReason(null, …)` aqui
    // teria perdido a DEC-053 em silêncio, que é a regressão a pegar.
    assert.match(
      listagem,
      /motivo:\s*blockReason\(\s*motivoDeNaoReativar\(p\.impedimentosDeReativacao\)\s*,\s*\{\s*online\s*\}\s*\)/,
      "o item do menu precisa nascer com o motivo da própria linha"
    );
  });

  test("com sinal, quem manda continua sendo o motivo da DEC-053", () => {
    // A prova de que o embrulho não engoliu a regra: online, `blockReason`
    // devolve exatamente o que a listagem calculou.
    const daLinha = motivoDeNaoReativar([{ tipo: "Client", id: "1", nome: "Ana Lima" }]);

    assert.equal(blockReason(daLinha, { online: true }), daLinha);
    assert.equal(blockReason(null, { online: true }), undefined);
    assert.equal(blockReason(daLinha, { online: false }), MENSAGEM_ESCRITA_OFFLINE);
  });

  test("o preview é conferido ANTES de abrir o modal de reativação", () => {
    // A segunda barreira. Sem ela, a aba aberta desde ontem abriria um modal
    // cujo botão levaria a um 409.
    assert.match(listagem, /data\.impedimentosDeReativacao/);
    assert.ok(
      /if \(impedimento\)/.test(listagem),
      "o clique precisa parar quando o preview acusa impedimento"
    );
  });

  test("o impedimento do preview vira aviso na tela, não silêncio", () => {
    assert.match(listagem, /toast\.error\(`Não é possível reativar\. \$\{impedimento\}`\)/);
  });
});

describe("DEC-053 — o item desabilitado ENSINA, e o teclado alcança", () => {
  const menu = ler("src/components/ui/ActionMenu.jsx");
  const semCom = semComentarios(menu);

  test("o motivo é renderizado como TEXTO no item, não como `title`", () => {
    // `title` não abre no toque e não é lido de forma confiável por leitor de
    // tela — e esta explicação é o item inteiro.
    assert.match(semCom, /className="action-menu__motivo"/);
    assert.ok(
      !/title=\{item\.motivo\}/.test(semCom),
      "o motivo não pode viver só num tooltip"
    );
  });

  test("usa `aria-disabled`, e NÃO `disabled`, no item com motivo", () => {
    // `<button disabled>` não recebe foco: o leitor de tela nunca chegaria ao
    // motivo. Com `aria-disabled` o item continua tabulável e é anunciado.
    assert.match(semCom, /aria-disabled=\{bloqueado \|\| undefined\}/);
    assert.match(semCom, /disabled=\{item\.desabilitado && !bloqueado\}/);
  });

  test("o clique é barrado no handler — `aria-disabled` só anuncia", () => {
    assert.match(semCom, /if \(item\.motivo \|\| item\.desabilitado\) return;/);
  });

  test("o ciclo de Tab continua excluindo só o `disabled` de verdade", () => {
    // Item `aria-disabled` PRECISA continuar no ciclo: é ele que carrega o
    // motivo. O seletor filtra `:not([disabled])`, não `[aria-disabled]`.
    assert.match(semCom, /\[role="menuitem"\]:not\(\[disabled\]\)/);
    assert.ok(
      !/:not\(\[aria-disabled/.test(semCom),
      "o item com motivo não pode sair do ciclo de foco"
    );
  });
});
