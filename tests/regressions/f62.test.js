// ═══════════════════════════════════════════════════════════════════════════
// F-6.2 — TROCA DE TIPO (PF ↔ PJ) PELA TELA DE EDIÇÃO DO CLIENTE
//
// O backend já aceitava a troca por `PATCH /clients/:id` (provado em
// `lex-backend/tests/clients/trocaTipo.test.js`); o que a impedia era o
// seletor, que só existia na criação. Estes testes travam os quatro pontos da
// tela que fazem a troca funcionar — e falhar em silêncio se alguém mexer:
//
//   1. o seletor aparece TAMBÉM na edição, e é UM só (sem cópia própria);
//   2. o tipo gravado é lido do cadastro, para saber quando há troca;
//   3. o aviso do que será REMOVIDO só existe enquanto há troca;
//   4. o payload leva SÓ os campos do tipo escolhido — mandar um campo do tipo
//      antigo faz o servidor responder 400 (`validateExclusividade`), então
//      este é o ponto que decide se a troca chega a gravar.
//
// São testes de análise do código-fonte, como o resto da suíte do frontend: não
// há ambiente de renderização (zero dependências novas). O comportamento de
// verdade — o que o servidor faz com esse payload — está nos testes do backend.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const tela = ler("src/pages/clients/ClientFormPage.jsx");
const css = ler("src/pages/clients/ClientPage.css");

// Os campos exclusivos de cada tipo — os mesmos de `clientValidation.js`
// (CAMPOS_PF / CAMPOS_PJ) no backend.
const CAMPOS_PF = [
  "nomeCompleto", "cpf", "rg", "dataNascimento", "sexo", "estadoCivil",
  "profissao", "nacionalidade"
];
const CAMPOS_PJ = ["razaoSocial", "nomeFantasia", "cnpj", "representanteLegal"];

// O trecho de `handleSubmit` que monta o payload de cada tipo.
const ramosDoPayload = () => {
  const inicio = tela.indexOf("if (tipoPessoa === 'fisica') {\n      payload.");
  assert.ok(inicio !== -1, "não achei o ramo de PF que monta o payload");
  const separador = tela.indexOf("} else {", inicio);
  const fim = tela.indexOf("try {", separador);
  assert.ok(separador !== -1 && fim !== -1, "não achei o ramo de PJ que monta o payload");
  return { pf: tela.slice(inicio, separador), pj: tela.slice(separador, fim) };
};

describe("F-6.2 — o seletor de tipo na edição", () => {
  test("o seletor NÃO está preso à criação", () => {
    assert.doesNotMatch(
      tela,
      /!isEditing\s*&&\s*\(\s*<div className="form-group tipo-pessoa-seletor"/,
      "o seletor voltou a aparecer só fora da edição — a troca de tipo deixou de ser possível"
    );
    assert.match(tela, /className="form-group tipo-pessoa-seletor"/);
  });

  test("os rádios são UM ponto só, e trocam pelo handler da troca", () => {
    assert.equal((tela.match(/TIPO_PESSOA_OPTIONS\.map\(/g) ?? []).length, 1);
    assert.match(tela, /onChange=\{\(\) => trocarTipoPessoa\(value\)\}/);
    assert.match(tela, /checked=\{tipoPessoa === value\}/);
  });

  test("o rótulo fixo 'Tipo: …' da edição saiu — ele escondia o seletor", () => {
    assert.doesNotMatch(tela, /tipo-pessoa-label/);
    assert.doesNotMatch(tela, /labelDe\(\s*TIPO_PESSOA_OPTIONS/);
    assert.doesNotMatch(css, /\.tipo-pessoa-label/, "CSS morto do rótulo que saiu");
  });
});

describe("F-6.2 — saber quando há troca, e avisar o que será removido", () => {
  test("o tipo GRAVADO é lido do cadastro ao abrir a edição", () => {
    assert.match(tela, /const \[tipoOriginal, setTipoOriginal\] = useState\(null\)/);
    assert.match(tela, /setTipoOriginal\(d\.tipoPessoa\)/);
  });

  test("'trocando' exige edição, tipo gravado conhecido E tipo diferente", () => {
    assert.match(
      tela,
      /const trocandoTipo = isEditing && tipoOriginal !== null && tipoPessoa !== tipoOriginal;/,
      "sem qualquer das três condições o aviso apareceria na criação, ou antes do GET voltar"
    );
  });

  test("o aviso só é montado quando há troca, é anunciado e diz o que sai", () => {
    assert.match(tela, /\{trocandoTipo && \(\s*<p className="tipo-pessoa-aviso" role="status">/);
    // O que a gravação remove, por direção da troca.
    assert.match(tela, /pessoa física \(nome completo, CPF, RG, data de nascimento/);
    assert.match(tela, /pessoa jurídica \(CNPJ, razão social, nome fantasia e representante legal\)/);
    // E o que NÃO some: o aviso não pode assustar a advogada com uma perda que não existe.
    assert.match(tela, /Processos e\s+honorários continuam ligados ao cliente/);
    assert.match(tela, /documentos já gerados\s+mantêm o texto de quando foram criados/);
  });

  test("a classe do aviso tem regra de CSS", () => {
    assert.match(css, /\.tipo-pessoa-aviso\s*\{/);
  });
});

describe("F-6.2 — o payload leva só os campos do tipo escolhido", () => {
  test("PF: manda os campos de PF e NENHUM de PJ", () => {
    const { pf } = ramosDoPayload();
    for (const campo of CAMPOS_PF) {
      assert.match(pf, new RegExp(`payload\\.${campo}\\b`), `PF não envia ${campo}`);
    }
    for (const campo of CAMPOS_PJ) {
      assert.doesNotMatch(
        pf, new RegExp(`payload\\.${campo}\\b`),
        `PF enviaria "${campo}" — o servidor recusa campo do tipo oposto com 400 e a troca não grava`
      );
    }
  });

  test("PJ: manda os campos de PJ e NENHUM de PF", () => {
    const { pj } = ramosDoPayload();
    for (const campo of CAMPOS_PJ) {
      assert.match(pj, new RegExp(`payload\\.${campo}\\b`), `PJ não envia ${campo}`);
    }
    for (const campo of CAMPOS_PF) {
      assert.doesNotMatch(
        pj, new RegExp(`payload\\.${campo}\\b`),
        `PJ enviaria "${campo}" — o servidor recusa campo do tipo oposto com 400 e a troca não grava`
      );
    }
  });

  test("o payload SEMPRE leva o tipo escolhido", () => {
    assert.match(tela, /const payload = \{\s*tipoPessoa,/);
  });

  test("trocar o rádio não apaga o que a advogada digitou no outro tipo", () => {
    // Desistir da troca antes de salvar tem de devolver tudo. O handler só
    // mexe em `nacionalidade`, e só quando ela está vazia.
    const inicio = tela.indexOf("const trocarTipoPessoa");
    const fim = tela.indexOf("};", inicio);
    const corpo = tela.slice(inicio, fim);
    assert.match(corpo, /setTipoPessoa\(novoTipo\)/);
    assert.doesNotMatch(corpo, /nomeCompleto|cpf|razaoSocial|cnpj|repNome/,
      "o handler da troca passou a mexer em campos do tipo — desistir deixaria de restaurar");
    assert.match(corpo, /prev\.nacionalidade \? prev :/, "só repõe a nacionalidade se estiver vazia");
    assert.match(corpo, /'brasileira'/, "o padrão de PF novo é 'brasileira', como na criação");
  });
});
