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

  // ── REESCRITOS na Fase 3.4 (DEC-117), e não afrouxados ─────────────────
  // A segunda barreira mudou da lista para o hook que a lista e o detalhe
  // usam. As asserções são as mesmas, sobre o hook; e a lista precisa chamá-lo
  // para a reativação (é a única tela que oferece "Reativar").
  const hook = semComentarios(ler("src/hooks/useDesativacaoProcesso.js"));

  test("o preview é conferido ANTES de abrir o modal de reativação", () => {
    // A segunda barreira. Sem ela, a aba aberta desde ontem abriria um modal
    // cujo botão levaria a um 409.
    assert.match(hook, /motivoDeNaoReativar\(data\.impedimentosDeReativacao\)/);
    assert.ok(
      /if \(impedimento\)/.test(hook),
      "o clique precisa parar quando o preview acusa impedimento"
    );
    assert.match(listagem, /desativacao\.abrir\(p\._id, 'reativar'\)/);
  });

  test("o impedimento do preview vira aviso na tela, não silêncio", () => {
    assert.match(hook, /toast\.error\(`Não é possível reativar\. \$\{impedimento\}`\)/);
    // E a tela que estava velha é refeita, para o menu passar a mostrar o motivo.
    assert.match(hook, /aoConcluir\?\.\(\{ acao, id, recusado: true \}\)/);
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

// ═══════════════════════════════════════════════════════════════════════════
// Fase 3.5 (DEC-122) — os casos de CLIENTE passam a cobrar o hook e os dois usos
//
// O cliente não tem pai inativo que segure a reativação; a recusa dele é na
// DESATIVAÇÃO (participa de processo ativo — 409 `dependencia: "processos"`).
// As mesmas duas barreiras, na forma dele: o 409 continua a autoridade, e o
// hook lê os processos ativos do cliente no instante do clique — a aba velha
// não abre um modal cujo botão levaria ao 409. Havendo impedimento, a
// frase NOMEIA os processos e diz o caminho (desvincular, não desativar), e a
// tela é refeita.
// ═══════════════════════════════════════════════════════════════════════════
import { motivoDeNaoDesativarCliente } from "../../src/utils/activationMessages.js";

describe("DEC-053 — a recusa de desativar cliente (Fase 3.5)", () => {
  test("sem processo ativo, não há motivo", () => {
    assert.equal(motivoDeNaoDesativarCliente(0, []), null);
  });

  test("nomeia o processo, o papel quando não é o principal, e o caminho", () => {
    const frase = motivoDeNaoDesativarCliente(2, [
      { titulo: "Cobrança", papelDoCliente: "Autor", principalDoCliente: true },
      { titulo: "Inventário", papelDoCliente: "Litisconsorte", principalDoCliente: false },
    ]);
    assert.match(frase, /participa de 2 processos ativos — Cobrança e Inventário \(Litisconsorte\)\./);
    assert.match(frase, /Desvincule-o dos processos antes; não é preciso desativar o processo\./);
  });

  test("um só concorda no singular; mais que a página vira 'e mais N'", () => {
    assert.match(motivoDeNaoDesativarCliente(1, [{ titulo: "A" }]), /de 1 processo ativo — A\. Desvincule-o do processo antes/);
    assert.match(
      motivoDeNaoDesativarCliente(7, [{ titulo: "A" }, { titulo: "B" }, { titulo: "C" }, { titulo: "D" }, { titulo: "E" }]),
      /— A, B, C e mais 4\./
    );
  });

  const hook = semComentarios(ler("src/hooks/useDesativacaoCliente.js"));

  test("a segunda barreira: o impedimento vira toast e a tela é refeita", () => {
    assert.match(hook, /if \(impedimento\) \{\s*setModal\(FECHADO\);\s*toast\.error\(`Não é possível desativar\. \$\{impedimento\}`\);\s*aoConcluir\?\.\(\{ acao, id, recusado: true \}\);\s*return;/);
    // A contagem é a do 409: vínculos ativos, com o processo em qualquer
    // situação (`situacao: 'todos'`).
    assert.match(hook, /clienteId: id, situacao: 'todos'/);
  });

  test("os DOIS usos: a lista e o ⋮ do detalhe, com o modal do hook e nenhuma cópia", () => {
    for (const [tela, aoConcluir] of [
      ["src/pages/clients/ClientListPage.jsx", /useDesativacaoCliente\(\{ aoConcluir: reload \}\)/],
      ["src/pages/clients/ClientDetailPage.jsx", /useDesativacaoCliente\(\{\s*aoConcluir: \(\{ acao, recusado \}\) => \{\s*if \(acao === 'desativar' && !recusado\) navigate\('\/dashboard\/clientes'\);/],
    ]) {
      const codigo = semComentarios(ler(tela));
      assert.match(codigo, aoConcluir, `${tela}: não usa o hook`);
      assert.match(codigo, /<Modal \{\.\.\.desativacao\.propsDoModal\} \/>/, `${tela}: o modal não é o do hook`);
      assert.match(codigo, /desativacao\.abrir\([^,]+, 'desativar'\)/, `${tela}: o Desativar não passa pelo hook`);
      for (const copia of [/deleteClient/, /reactivateClient/, /motivoDeNaoDesativarCliente/, /mensagemDesativarCliente/]) {
        assert.doesNotMatch(codigo, copia, `${tela}: segunda cópia do que é do hook`);
      }
    }
  });
});
