// ═══════════════════════════════════════════════════════════════════════════
// DEC-054 (frontend) — AS QUATRO FASES, O SELO E O FILTRO (F-2d)
//
// ── O que a tela precisa garantir ────────────────────────────────────────
// 1. o seletor de fase oferece AS QUATRO, sem ordem imposta e sem nenhuma
//    desabilitada. *"Sim, pode voltar."*
// 2. o selo de liminar aparece, e o filtro recorta — mas a lista NÃO se
//    reordena. Ela pediu destaque, não prioridade.
// 3. **nenhuma tela monta o rótulo da fase por conta própria.** Foi assim que
//    a listagem de processos já exibiu string crua de enum, capitalizada à
//    mão, e como `parcialmente_pago` apareceu com sublinhado na interface.
//
// ── A autoridade continua sendo do backend ──────────────────────────────
// Nada aqui substitui a guarda do serviço — `tests/process/dec054.test.js`, no
// backend, prova que qualquer transição é aceita e que o motivo é opcional.
// Esta suíte prova que a tela não INVENTA uma regra que o backend não tem.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  FASE_PROCESSO_OPTIONS,
  FILTRO_LIMINAR_OPTIONS,
  rotuloDaFase,
} from "../../src/utils/enums.js";

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), "utf8");

const semComentarios = (codigo) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const LISTAGEM = "src/pages/processes/ProcessListPage.jsx";
const DETALHE = "src/pages/processes/ProcessDetailPage.jsx";
const FORMULARIO = "src/pages/processes/ProcessFormPage.jsx";

describe("DEC-054 — o vocabulário na tela", () => {
  test("são as quatro fases da Laís, nos mesmos valores do backend", () => {
    // O espelho é sem endpoint, de propósito: é constante, não dado. O preço é
    // a duplicação, e é este teste (com o gêmeo no backend) que a paga.
    assert.deepEqual(
      FASE_PROCESSO_OPTIONS.map((o) => o.value),
      ["conhecimento", "sentenca", "execucao", "recursos"]
    );
  });

  test("os rótulos são os que ela usa, e o primeiro é a escolha registrada", () => {
    // Ela deu DUAS palavras para a primeira: "fase inicial" e "fase de
    // conhecimento". Adotada a segunda porque "inicial" é posicional e deixa de
    // valer quando o processo VOLTA — e ela disse que pode voltar.
    //
    // PENDENTE DE RATIFICAÇÃO. Se ela preferir "Fase inicial", muda-se o rótulo
    // aqui e nenhuma migração acontece: o valor gravado é `conhecimento`.
    assert.deepEqual(
      FASE_PROCESSO_OPTIONS.map((o) => o.label),
      ["Fase de conhecimento", "Sentença", "Execução", "Recursos"]
    );
  });

  test("`rotuloDaFase` degrada de forma legível", () => {
    assert.equal(rotuloDaFase("execucao"), "Execução");
    // Fase desconhecida não some nem quebra a tela — mesma escolha de
    // `visualDoStatus`: um enum novo do backend precisa APARECER para alguém
    // notar que falta rotulá-lo aqui.
    assert.equal(rotuloDaFase(undefined), "—");
  });
});

describe("o seletor oferece as quatro, sem ordem imposta", () => {
  test("o formulário monta o <select> a partir da lista inteira", () => {
    const codigo = semComentarios(ler(FORMULARIO));
    assert.match(
      codigo,
      /FASE_PROCESSO_OPTIONS\.map/,
      "o seletor precisa vir da lista, não de opções escritas à mão"
    );
  });

  test("o detalhe monta o <select> a partir da lista inteira", () => {
    const codigo = semComentarios(ler(DETALHE));
    assert.match(codigo, /FASE_PROCESSO_OPTIONS\.map/);
  });

  test("NENHUMA opção de fase é desabilitada, em tela nenhuma", () => {
    // Esta é a asserção que a mutação (a) da fase derruba na interface: quem
    // for travar a transição de volta vai desabilitar as opções "anteriores" no
    // seletor, e é aqui que isso cai.
    for (const caminho of [FORMULARIO, DETALHE]) {
      const codigo = semComentarios(ler(caminho));
      // O único `disabled` aceitável nestas telas é o do BOTÃO enquanto salva.
      const trechoDoSelect = codigo.match(
        /FASE_PROCESSO_OPTIONS\.map[\s\S]{0,400}?<\/select>/
      );
      assert.ok(trechoDoSelect, `${caminho}: não achei o seletor de fase`);
      assert.doesNotMatch(
        trechoDoSelect[0],
        /disabled/,
        `${caminho}: alguma fase aparece desabilitada — a Laís disse "sim, pode voltar"`
      );
    }
  });

  test("nenhuma tela compara POSIÇÕES na lista de fases", () => {
    // `indexOf`/`findIndex` contra `FASE_PROCESSO_OPTIONS` é como uma máquina
    // de estados entra sem ninguém decidir por ela: primeiro para "ordenar",
    // depois para "avisar", e aí já está travando.
    for (const caminho of [FORMULARIO, DETALHE, LISTAGEM]) {
      const codigo = semComentarios(ler(caminho));
      assert.doesNotMatch(
        codigo,
        /FASE_PROCESSO_OPTIONS[\s\S]{0,60}?(indexOf|findIndex)/,
        `${caminho}: comparação de posição entre fases`
      );
    }
  });

  test("o motivo NÃO é obrigatório na tela", () => {
    // *"Não precisa anotar o porquê, só se ela quiser mesmo."* Esta é a
    // asserção que a mutação (b) derruba na interface.
    const codigo = semComentarios(ler(DETALHE));
    const campo = codigo.match(/id="motivoFase"[\s\S]{0,400}?\/>/);
    assert.ok(campo, "não achei o campo de motivo");
    assert.doesNotMatch(campo[0], /required/, "o motivo virou obrigatório");

    // E a etiqueta DIZ que é opcional: um campo sem `required` mas sem aviso
    // ainda parece obrigatório para quem está preenchendo.
    assert.match(codigo, /Motivo \(opcional\)/);
  });

  test("o botão de mudar fase não depende do motivo estar preenchido", () => {
    const codigo = semComentarios(ler(DETALHE));
    const botao = codigo.match(/onClick=\{salvarFase\}[\s\S]{0,200}?>/);
    assert.ok(botao, "não achei o botão");
    assert.doesNotMatch(
      botao[0],
      /motivoFase/,
      "o botão está condicionado ao motivo — ele é opcional"
    );
  });
});

describe("nenhuma tela monta o rótulo da fase por conta própria", () => {
  test("listagem, detalhe e formulário passam por `rotuloDaFase`", () => {
    for (const caminho of [LISTAGEM, DETALHE, FORMULARIO]) {
      const codigo = semComentarios(ler(caminho));
      assert.match(
        codigo,
        /rotuloDaFase|FASE_PROCESSO_OPTIONS/,
        `${caminho}: precisa usar a fonte única de rótulo`
      );
    }
  });

  test("nenhuma tela capitaliza a fase à mão", () => {
    // Era o que a coluna de status fazia — `s.charAt(0).toUpperCase() +
    // s.slice(1)` — e é como "parcialmente_pago" chegou a aparecer com
    // sublinhado na interface.
    for (const caminho of [LISTAGEM, DETALHE, FORMULARIO]) {
      const codigo = semComentarios(ler(caminho));
      assert.doesNotMatch(
        codigo,
        /\bfase[\s\S]{0,40}?charAt\(0\)\.toUpperCase\(\)/,
        `${caminho}: rótulo de fase montado à mão`
      );
    }
  });

  test("nenhum rótulo de fase aparece escrito como texto solto no JSX", () => {
    // Um `<option value="execucao">Execução</option>` escrito à mão seria a
    // segunda lista de rótulos do projeto — exatamente o que a 4.3 existiu para
    // eliminar no `status`.
    for (const caminho of [LISTAGEM, DETALHE, FORMULARIO]) {
      const codigo = semComentarios(ler(caminho));
      assert.doesNotMatch(
        codigo,
        /<option value="(conhecimento|sentenca|execucao|recursos)"/,
        `${caminho}: opção de fase escrita à mão`
      );
    }
  });
});

describe("o selo de liminar e o filtro", () => {
  test("o selo aparece na listagem e no detalhe, com a MESMA classe", () => {
    // Dois desenhos para o mesmo fato fariam a advogada duvidar se são o mesmo
    // fato.
    for (const caminho of [LISTAGEM, DETALHE]) {
      const codigo = semComentarios(ler(caminho));
      assert.match(codigo, /tag-liminar/, `${caminho}: falta o selo`);
      assert.match(codigo, /liminar === true/, `${caminho}: o selo precisa ser condicional`);
    }
  });

  test("a classe do selo tem regra CSS de verdade, e em cor de ATENÇÃO", () => {
    // Vermelho é o tom de `cancelado` e `vencido` — coisas que deram errado. A
    // liminar não deu errado: é pedido de urgência.
    const css = ler("src/styles/modules.css");
    const regra = css.match(/\.tag-liminar\s*\{[\s\S]*?\}/);
    assert.ok(regra, "a classe `tag-liminar` não tem regra CSS");
    assert.match(regra[0], /--color-warning/, "o selo precisa ser cor de atenção");
    assert.doesNotMatch(regra[0], /--color-danger/, "liminar não é perigo");
  });

  test("o selo diz a PALAVRA, e não só a cor", () => {
    // Cor sozinha não serve: é a única pista para quem não distingue matizes, e
    // some numa impressão em preto e branco. Mesma regra da `tag-desativado`.
    const codigo = ler(LISTAGEM);
    assert.match(codigo, /className="tag-liminar"[\s\S]{0,200}?Liminar/);
  });

  test("o filtro tem os três estados, e o padrão NÃO recorta", () => {
    assert.deepEqual(
      FILTRO_LIMINAR_OPTIONS.map((o) => o.value),
      ["", "com", "sem"]
    );
    assert.equal(FILTRO_LIMINAR_OPTIONS[0].value, "", "o padrão precisa ser não filtrar");
  });

  test("a listagem monta o filtro a partir da lista, e o manda ao serviço", () => {
    const codigo = semComentarios(ler(LISTAGEM));
    assert.match(codigo, /FILTRO_LIMINAR_OPTIONS\.map/);
    assert.match(codigo, /liminar: liminar \|\| undefined/);
  });

  test("o serviço repassa `fase` e `liminar` como query", () => {
    const codigo = semComentarios(ler("src/api/processService.js"));
    assert.match(codigo, /params\.fase = fase/);
    assert.match(codigo, /params\.liminar = liminar/);
  });

  test("a listagem NÃO reordena por liminar", () => {
    // Ela pediu destaque, não prioridade: reordenar muda o que a advogada
    // espera encontrar onde deixou. Se ela quiser ver só as liminares, o filtro
    // faz isso — e ela decide QUANDO.
    const codigo = semComentarios(ler(LISTAGEM));
    assert.doesNotMatch(
      codigo,
      /processos[\s\S]{0,80}?\.sort\(/,
      "a listagem está reordenando os processos na tela"
    );
    assert.doesNotMatch(
      codigo,
      /liminar[\s\S]{0,60}?\.sort\(/,
      "ordenação por liminar"
    );
  });
});

describe("os dois eixos ficam separados na tela", () => {
  test("a fase não substituiu o `status`: a listagem tem as duas colunas", () => {
    // "Suspenso" não é uma fase, e "execução" não é um status. A coluna que
    // sumisse levaria junto o filtro que a advogada usa desde a Fase 2.
    const codigo = ler(LISTAGEM);
    assert.match(codigo, /<th>Fase<\/th>/);
    assert.match(codigo, /<th>Status<\/th>/);
  });

  test("o trânsito em julgado NÃO é uma opção do seletor de fase", () => {
    // Ele é o OUTRO eixo. Pô-lo na lista faria "trânsito em julgado" competir
    // com "execução" numa lista onde as duas não se comparam.
    const valores = FASE_PROCESSO_OPTIONS.map((o) => o.value);
    assert.ok(!valores.includes("transito_em_julgado"));
    assert.ok(!valores.includes("encerrado"));
    assert.ok(!valores.includes("liminar"));
  });

  test("o encerramento não exige fase nenhuma no formulário", () => {
    // Se algum dia esta tela exigir "recursos" para liberar o campo, alguém
    // inventou um caminho único onde ela descreveu vários.
    const codigo = semComentarios(ler(FORMULARIO));
    const campo = codigo.match(/id="transitoEmJulgadoEm"[\s\S]{0,400}?\/>/);
    assert.ok(campo, "não achei o campo de trânsito em julgado");
    assert.doesNotMatch(campo[0], /disabled/, "o encerramento está condicionado à fase");
  });

  test("a fase NÃO vai no payload do PATCH comum — ela tem rota própria", () => {
    // Mandá-la lá volta 400: o backend a recusa de propósito, porque o
    // `findOneAndUpdate` não gravaria histórico.
    const codigo = semComentarios(ler(FORMULARIO));
    assert.match(
      codigo,
      /if \(!isEditing\) payload\.fase/,
      "a fase só pode ir no payload da CRIAÇÃO"
    );
  });
});
