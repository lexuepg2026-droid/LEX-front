// ═══════════════════════════════════════════════════════════════════════════
// F-2d — O VERBO QUE SOBROU (achado do passo 184)
//
// A F-2b renomeou a ação de **"Excluir"** para **"Desativar"** em Clientes e
// Processos: sempre foi soft delete, e com a reativação existindo o nome antigo
// mente. Uma mensagem ficou com a palavra velha.
//
// ── A regra do que se corrige, e do que NÃO ─────────────────────────────
// Só onde a ação VIROU desativação. **Documentos e Seções continuam com o
// verbo que têm** nos menus delas — um verbo único para as seis faria a
// mensagem discordar do botão em quatro telas para concordar em duas.
//
//   `processos`  → bloqueia a desativação de um CLIENTE   → "desativar"
//   `parcelas`   → bloqueia a exclusão de um HONORÁRIO    → "excluir"
//   `pagamentos` → bloqueia a exclusão de uma PARCELA     → "excluir"
//   `documentos` → bloqueia a exclusão de uma SEÇÃO       → "excluir"
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { getFinancialErrorMessage } from "../../src/utils/financialErrors.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

// Um 409 de integridade, na forma exata em que o axios o entrega.
const erroDeIntegridade = (dependencia, quantidade, message) => ({
  response: { data: { message, dependencia, quantidade } }
});

describe("F-2d — o verbo acompanha a ação que a tela oferece", () => {
  test("cliente bloqueado por processos: a frase diz DESATIVAR", () => {
    const frase = getFinancialErrorMessage(
      erroDeIntegridade("processos", 2, "Não é possível desativar este cliente.")
    );

    assert.match(frase, /desativar/);
    assert.doesNotMatch(
      frase,
      /exclu/i,
      `a ação em Clientes é "Desativar" desde a F-2b — ${frase}`
    );
  });

  test("honorário bloqueado por parcelas: continua EXCLUIR", () => {
    // A ação em Honorários NÃO virou desativação — o menu dela ainda diz
    // "Excluir". Trocar o verbo aqui faria a mensagem discordar do botão.
    const frase = getFinancialErrorMessage(
      erroDeIntegridade("parcelas", 3, "Não é possível excluir este honorário.")
    );
    assert.match(frase, /remova antes de excluir/);
  });

  test("parcela bloqueada por pagamentos: continua EXCLUIR", () => {
    const frase = getFinancialErrorMessage(
      erroDeIntegridade("pagamentos", 1, "Não é possível excluir esta parcela.")
    );
    assert.match(frase, /remova antes de excluir/);
  });

  test("seção bloqueada por documentos: continua EXCLUIR", () => {
    const frase = getFinancialErrorMessage(
      erroDeIntegridade("documentos", 2, "Seção vinculada a 2 documento(s) ativo(s).")
    );
    assert.match(frase, /remova antes de excluir/);
  });

  test("a contagem e o rótulo continuam corretos nos quatro", () => {
    // O verbo mudou num deles; o resto da frase não podia mudar em nenhum.
    assert.match(
      getFinancialErrorMessage(erroDeIntegridade("processos", 1, "x")),
      /1 processo ativo/
    );
    assert.match(
      getFinancialErrorMessage(erroDeIntegridade("processos", 3, "x")),
      /3 processos ativos/
    );
  });

  test("o fallback do cliente também é `A desativação foi recusada.`", () => {
    // Quando o servidor não manda mensagem, a frase base é a da AÇÃO, não a
    // genérica de exclusão.
    const semMensagem = { response: { data: { dependencia: "processos", quantidade: 1 } } };
    assert.match(getFinancialErrorMessage(semMensagem), /A desativação foi recusada/);
  });
});

describe("F-2d — os menus não mudaram", () => {
  // A varredura do passo 184 tinha de conferir também o outro lado: o verbo do
  // MENU. Se um deles mudar, a tabela do roteiro e a lista acima precisam mudar
  // junto — e é este teste que obriga a conversa a acontecer.
  const menu = (caminho) => ler(caminho);

  test("Clientes e Processos oferecem `Desativar`, não `Excluir`", () => {
    for (const caminho of [
      "src/pages/clients/ClientListPage.jsx",
      "src/pages/processes/ProcessListPage.jsx"
    ]) {
      assert.match(menu(caminho), /rotulo: 'Desativar'/, `${caminho}: falta "Desativar"`);
      assert.doesNotMatch(
        menu(caminho),
        /rotulo: 'Excluir'/,
        `${caminho}: o menu voltou a dizer "Excluir"`
      );
    }
  });

  test("Documentos, Honorários e Parcelas continuam com `Excluir`", () => {
    for (const caminho of [
      "src/pages/documents/DocumentListPage.jsx",
      "src/pages/fees/FeeListPage.jsx",
      "src/pages/installments/InstallmentListPage.jsx"
    ]) {
      assert.match(menu(caminho), /rotulo: 'Excluir'/, `${caminho}: o verbo mudou`);
    }
  });

  test("Seções continua com `Desativar`, como já era antes da F-2b", () => {
    assert.match(menu("src/pages/secoes/SecaoListPage.jsx"), /rotulo: 'Desativar'/);
  });
});
