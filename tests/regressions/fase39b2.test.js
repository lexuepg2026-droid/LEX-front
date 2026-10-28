// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.9b2 — o texto final na pele nova (DEC-148 a 150)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. A fase é de PELE: boa parte
// destas travas confere que o comportamento ficou onde estava.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  processoDoDocumento,
  clienteDoDocumento,
  contextoDoDocumento,
} from "../../src/pages/documents/textoFinal.js";

const RAIZ = new URL("../..", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const tela = semComentarios(ler("src/pages/documents/DocumentFinalTextPage.jsx"));
const corpo = tela.slice(tela.indexOf("function DocumentFinalTextPage"), tela.indexOf("if (loading) return"));
const jsx = tela.slice(tela.indexOf('<div className="module-container final">'));
const css = ler("src/pages/documents/DocumentFinalTextPage.css").replace(/\/\*[\s\S]*?\*\//g, "");

// ── Decisão 1 — o cabeçalho em balão (DEC-148) ───────────────────────────
describe("Fase 3.9b2 · o cabeçalho em balão (DEC-148)", () => {
  test("'processo · cliente' sai do documento que a tela já lê", () => {
    const doc = {
      processoId: { numeroProcesso: "0006174-73.2025.8.16.0019", titulo: "Inventário de Ernesto Wosch" },
      variaveisResolvidas: { nomeCliente: "Helena Wosch Carneiro" },
    };
    assert.equal(processoDoDocumento(doc), "0006174-73.2025.8.16.0019 — Inventário de Ernesto Wosch");
    assert.equal(clienteDoDocumento(doc), "Helena Wosch Carneiro");
    assert.equal(contextoDoDocumento(doc), "0006174-73.2025.8.16.0019 — Inventário de Ernesto Wosch · Helena Wosch Carneiro");
    // PJ: a razão social.
    assert.equal(clienteDoDocumento({ variaveisResolvidas: { nomeCliente: null, razaoSocialCliente: "Agro Campos Ltda" } }), "Agro Campos Ltda");
    // Sem processo populado, sem variáveis: só o que existir, sem "undefined".
    assert.equal(contextoDoDocumento({ processoId: "6a70f9a1b2c3d4e5f6a7b8c9" }), "");
    assert.equal(contextoDoDocumento(null), "");
    assert.equal(contextoDoDocumento({ processoId: { titulo: "Só o título" } }), "Só o título");
  });

  test("os selos são os da lista, com a mesma regra, e o 'não salvo' à direita com o estado de hoje", () => {
    assert.match(jsx, /\{editadoManualmente && \(\s*<span className="final__selo final__selo--editado">/);
    assert.match(jsx, /\{visivelPortal && <span className="final__selo final__selo--portal">no portal<\/span>\}/);
    assert.match(jsx, /\{!editadoManualmente && !visivelPortal && \(\s*<span className="final__selo final__selo--neutro">gerado<\/span>/);
    assert.match(jsx, /<p className="final__estado" aria-live="polite">\s*\{sujo && <span className="final__sujo">alterações não salvas<\/span>\}/);
    // As cores dos selos são as de `.doc-selo--*`.
    const lista = ler("src/pages/documents/DocumentListPage.css");
    for (const [sufixo, decl] of [["editado", "color: var(--color-accent);"], ["portal", "color: var(--color-success-text);"], ["neutro", "color: var(--color-text-discreto);"]]) {
      assert.ok(lista.includes(decl), `lista: ${sufixo}`);
      assert.match(css, new RegExp(`\\.final__selo--${sufixo} \\{[^}]*${decl.replace(/[()]/g, "\\$&")}`));
    }
  });

  test("nenhuma chamada nova ao serviço: as mesmas, na mesma quantidade", () => {
    const chamadas = (tela.match(/documentService\.\w+/g) ?? []).sort();
    assert.deepEqual(chamadas, [
      "documentService.alternarVisibilidadePortal",
      "documentService.atualizarTexto",
      "documentService.baixarEsalvar",
      "documentService.gerarDocumento",
      "documentService.getDocumentById",
      "documentService.listDocumentSecoes",
      "documentService.previewDocumento",
    ]);
  });
});

// ── Decisão 2 — a barra de ações (DEC-149) ───────────────────────────────
describe("Fase 3.9b2 · a barra de ações e o interruptor (DEC-149)", () => {
  const barra = jsx.slice(jsx.indexOf('className="final__barra"'), jsx.indexOf("{!online && <OfflineWriteReason />}"));

  test("a ordem: Salvar, Baixar PDF, Baixar DOCX, Portal, Regerar", () => {
    const pos = ["onClick={salvar}", "baixar('pdf')", "baixar('docx')", 'role="switch"', "onClick={tentarRegerar}"].map((t) => barra.indexOf(t));
    assert.ok(pos.every((p) => p >= 0), JSON.stringify(pos));
    assert.deepEqual([...pos].sort((a, b) => a - b), pos);
  });

  test("o interruptor tem o visual do LiberacaoPortal e o comportamento de hoje (sem confirmar)", () => {
    assert.match(barra, /role="switch"\s*aria-checked=\{visivelPortal\}/);
    // Reescrita na Fase 3.10 (DEC-155, autorizada): durante o pedido o
    // interruptor passou de `disabled` a `aria-disabled`, para não perder o
    // foco depois do Espaço; a recusa do clique em voo foi para o tratador. A
    // trava continua exigindo o mesmo tratador e o bloqueio durante o pedido.
    assert.match(barra, /onClick=\{alternarPortal\}\s*aria-disabled=\{alternandoPortal \? 'true' : undefined\}/);
    assert.doesNotMatch(barra, /aria-pressed/);
    // Liga e desliga direto: o tratador não ganhou confirmação.
    const alternar = corpo.slice(corpo.indexOf("const alternarPortal"), corpo.indexOf("const regerar"));
    assert.match(alternar, /const alvo = !visivelPortal;/);
    assert.doesNotMatch(alternar, /confirm|setConfirm/i);
    assert.match(css, /\.final__interruptor--sim \.final__trilho \{[^}]*border-color: var\(--color-success-text\);/);
  });

  test("os botões guardam as mesmas condições de antes (sem sinal, baixando, salvando, regerando)", () => {
    assert.match(barra, /onClick=\{salvar\}\s*disabled=\{!sujo \|\| salvando\}\s*aria-disabled=\{online \? undefined : 'true'\}/);
    assert.equal((barra.match(/if \(!online\) return;/g) ?? []).length, 2);
    assert.equal((barra.match(/disabled=\{Boolean\(baixando\)\}/g) ?? []).length, 2);
    assert.match(barra, /onClick=\{tentarRegerar\}\s*disabled=\{regerando\}/);
    // Regerar só aparece sem impedimento, como antes; e a lista do 422 também.
    assert.match(jsx, /\{!impedimentoDeRegerar && \(\s*<button[\s\S]*?onClick=\{tentarRegerar\}/);
    assert.match(jsx, /\{!impedimentoDeRegerar && <PendenciaList pendencias=\{pendencias\} \/>\}/);
  });

  test("no celular a barra QUEBRA em linhas — nenhuma ação vai para um ⋮", () => {
    assert.match(css, /\.final__barra \{[^}]*flex-wrap: wrap;/);
    assert.doesNotMatch(jsx, /<ActionMenu/);
  });
});

// ── Decisões 3 e 4 — o texto e as lacunas em balões (DEC-150) ────────────
describe("Fase 3.9b2 · o texto e as lacunas em balões (DEC-150)", () => {
  test("o texto num balão, com a fonte e a largura de leitura de antes", () => {
    assert.match(jsx, /<section className="final__balao final__editor"/);
    assert.match(css, /\.final__textarea \{[^}]*width: 100%;[^}]*font-family: var\(--font-family\);[^}]*font-size: var\(--font-size-base\);[^}]*line-height: var\(--line-height-normal\);/);
  });

  test("as lacunas ao lado a partir de 1024, abaixo antes; o conteúdo e a ordem iguais", () => {
    assert.match(css, /\.final__area \{[^}]*grid-template-columns: minmax\(0, 1fr\) 320px;/);
    assert.match(css, /@media \(max-width: 1023px\) \{\s*\.final__area \{\s*grid-template-columns: minmax\(0, 1fr\);/);
    assert.match(jsx, /<section className="final__balao final__lacunas">/);
    assert.match(jsx, /\{lacunas\.map\(\(lacuna\) => \(/);
    assert.match(jsx, /onClick=\{\(\) => irParaLacuna\(lacuna\)\}\s*disabled=\{sujo\}/);
    // O texto vem antes da coluna das lacunas no DOM (abaixo dele no celular).
    assert.ok(jsx.indexOf("final__editor") < jsx.indexOf("final__lacunas"));
  });

  test("nenhum transform/filter na folha da tela", () => {
    assert.doesNotMatch(css, /(?:^|[;{\s])(transform|filter|perspective|contain)\s*:/);
  });
});

// ── Decisão 5 — os Modals, iguais (conferência) ──────────────────────────
describe("Fase 3.9b2 · os dois Modals do Modal da fase 1, com o texto e a ordem iguais", () => {
  test("o do texto não salvo", () => {
    assert.match(tela, /import Modal from '\.\.\/\.\.\/components\/ui\/Modal';/);
    assert.match(
      jsx,
      /open=\{avisoDeNaoSalvo\}\s*title="Há alterações não salvas"\s*message="O texto na caixa ainda não foi salvo\. Regerar agora descarta essas alterações, e elas não são recuperáveis porque nunca chegaram ao servidor\."\s*variant="danger"\s*confirmLabel="Descartar e regerar"\s*cancelLabel="Voltar e salvar"/
    );
  });

  test("o do 409, com o texto das chaves e o reenvio confirmado", () => {
    assert.match(
      jsx,
      /open=\{conflito !== null\}\s*title="Substituir o texto editado à mão\?"\s*message=\{textoDaSobrescrita\(conflito, \{ formatarData: formatDate \}\)\}\s*variant="danger"\s*confirmLabel="Substituir e regerar"\s*cancelLabel="Manter o texto atual"\s*onConfirm=\{\(\) => regerar\(\{ confirmarSobrescrita: true \}\)\}/
    );
  });
});
