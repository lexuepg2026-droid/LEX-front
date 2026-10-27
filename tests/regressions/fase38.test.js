// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.8 — a Agenda, as cores das naturezas e o celular das listas (DEC-134 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Larguras, cores pintadas e
// cliques ficam na verificação no navegador e no roteiro visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const RAIZ = new URL("../../", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ── Item 1 — o celular das listas (DEC-135) ───────────────────────────────
describe("Fase 3.8 · item 1 — no celular só o ⋮ fica fixo, e as notas mudaram de coluna (DEC-135)", () => {
  const css = semComentarios(ler("src/styles/modules.css"));
  const parcelas = semComentarios(ler("src/pages/installments/InstallmentListPage.jsx"));
  const pagamentos = semComentarios(ler("src/pages/payments/PaymentListPage.jsx"));

  // A célula `<td …>` que contém `trecho`, inteira.
  const celulaCom = (fonte, trecho) => {
    const pos = fonte.indexOf(trecho);
    assert.ok(pos > 0, `não achei ${trecho}`);
    const inicio = fonte.lastIndexOf("<td", pos);
    return { abertura: fonte.slice(inicio, fonte.indexOf(">", inicio) + 1), corpo: fonte.slice(inicio, fonte.indexOf("</td>", pos)) };
  };

  test("Parcelas: \"Reparcelada\" no Status (prio-1), com a mesma regra (parcela cancelada)", () => {
    const { abertura, corpo } = celulaCom(parcelas, ">Reparcelada<");
    assert.match(corpo, /<StatusBadge status=\{inst\.status\} \/>/, "a nota mora na célula do status");
    assert.match(corpo, /inst\.status === 'cancelado' &&/);
    assert.doesNotMatch(abertura, /prio-/, "a coluna da nota nunca sai");
    // A parcela cancelada continua sem menu: a regra das ações não mudou.
    assert.match(parcelas, /inst\.status === 'cancelado' \? \(\s*<span className="acao-indisponivel"[^>]*>—<\/span>\s*\) : \(\s*<ActionMenu/);
  });

  test("Pagamentos: \"sem recibo\" no Líquido (prio-1), com a mesma regra (líquido ≤ 0)", () => {
    const { abertura, corpo } = celulaCom(pagamentos, "sem recibo\n");
    assert.match(abertura, /cell-num/, "a nota mora na célula do líquido");
    assert.match(corpo, /\{formatCurrency\(liquido\)\}/);
    assert.match(corpo, /liquido <= 0 &&/);
    assert.match(corpo, /title="A emissão de recibo é recusada pelo servidor para pagamento sem valor líquido\."/);
    assert.doesNotMatch(abertura, /prio-/, "a coluna da nota nunca sai");
  });

  test("a 480 px ou menos: o ⋮ com 64 px nas cinco, a primeira coluna solta; acima, a DEC-133 intacta", () => {
    assert.match(css, /@media \(max-width: 480px\) \{\s*\.data-table--acoes-fixas col:last-child \{ width: 64px; \}\s*\}/);
    assert.match(css, /@media \(max-width: 480px\) \{\s*\.data-table--primeira-fixa th:first-child,\s*\.data-table--primeira-fixa td:first-child \{\s*position: static;\s*box-shadow: none;\s*\}\s*\}/);
    assert.doesNotMatch(css, /acoes-sem-nota/);
    // Fora do celular, nada mudou: o ⋮ com 120 px e a primeira coluna presa.
    assert.match(css, /\.col-acoes-menu \{ width: 120px; \}/);
    assert.match(css, /\.data-table--primeira-fixa th:first-child,\s*\.data-table--primeira-fixa td:first-child \{\s*position: sticky;/);
    // E o `static` só existe dentro do `@media` do celular.
    const fora = css.replace(/@media \(max-width: 480px\) \{[\s\S]*?\n\}/g, "");
    assert.doesNotMatch(fora, /position: static/);
  });

  test("a nota tem linha própria, sem quebrar, no tom das notas (F-1b)", () => {
    assert.match(css, /\.data-table \.nota-da-celula \{[^}]*display: block;[^}]*font-style: italic;[^}]*color: var\(--color-text-secondary\);[^}]*white-space: nowrap;/);
  });
});

// ── Item 2 — uma regra de cores para as naturezas (DEC-134) ──────────────
import { TOM_DA_DATA, classeDoTom, tipoDaDataDoItem } from "../../src/utils/tomDaData.js";
import { TIPOS_DE_DATA } from "../../src/pages/dashboard/inicio.js";
import { LEGENDA } from "../../src/utils/calendarLabels.js";

describe("Fase 3.8 · item 2 — natureza → tom, uma fonte só (DEC-134)", () => {
  test("a regra: vencimento âmbar, vencida vermelho, compromisso azul", () => {
    assert.deepEqual({ ...TOM_DA_DATA }, { vencimento: "warning", vencida: "danger", compromisso: "info" });
    assert.deepEqual(Object.keys(TOM_DA_DATA).sort(), Object.keys(TIPOS_DE_DATA).sort(), "as mesmas chaves dos rótulos");
    assert.equal(classeDoTom("vencimento"), "tom-data--warning");
    assert.equal(classeDoTom("vencida"), "tom-data--danger");
    assert.equal(classeDoTom("compromisso"), "tom-data--info");
  });

  test("o item da Agenda vira o tipo de data pelo que o servidor diz", () => {
    assert.equal(tipoDaDataDoItem({ natureza: "evento" }), "compromisso");
    assert.equal(tipoDaDataDoItem({ natureza: "evento", concluido: true }), "compromisso");
    assert.equal(tipoDaDataDoItem({ natureza: "derivada", status: "pendente" }), "vencimento");
    assert.equal(tipoDaDataDoItem({ natureza: "derivada", status: "pago" }), "vencimento");
    assert.equal(tipoDaDataDoItem({ natureza: "derivada", status: "vencido" }), "vencida");
  });

  test("a Agenda e a LinhaDeData usam a MESMA fonte, e a mesma folha de tons", () => {
    for (const arquivo of ["src/components/dashboard/LinhaDeData.jsx", "src/pages/calendar/CalendarPage.jsx"]) {
      const fonte = semComentarios(ler(arquivo));
      assert.match(fonte, /import \{[^}]*\bclasseDoTom\b[^}]*\} from '[./]+utils\/tomDaData\.js';/, arquivo);
      assert.match(fonte, /import '[./]+styles\/tomDaData\.css';/, arquivo);
      assert.match(fonte, /classeDoTom\(/, `${arquivo}: aplica o tom`);
    }
    assert.match(semComentarios(ler("src/pages/calendar/CalendarPage.jsx")), /classeDoTom\(tipoDaDataDoItem\(item\)\)/);
  });

  test("nenhuma das duas folhas nomeia o tom por conta própria", () => {
    const tons = semComentarios(ler("src/styles/tomDaData.css"));
    for (const [classe, sem] of [["warning", "warning"], ["danger", "danger"], ["info", "info"]]) {
      assert.match(tons, new RegExp(`\\.tom-data--${classe} \\{[^}]*--tom-fundo: var\\(--color-${sem}-bg\\);[^}]*--tom-texto: var\\(--color-${sem}-text\\);[^}]*--tom-forte: var\\(--color-${sem}\\);`));
    }
    const linha = semComentarios(ler("src/components/dashboard/LinhaDeData.css"));
    assert.doesNotMatch(linha, /--color-(warning|info|danger)/);
    assert.match(linha, /\.datas-item__pilula \{[^}]*background-color: var\(--tom-fundo\);[^}]*color: var\(--tom-texto\);/);
    // Na Agenda, nenhuma regra de item, marca, pílula ou legenda nomeia o tom.
    const agenda = semComentarios(ler("src/pages/calendar/CalendarPage.css"));
    for (const regra of agenda.match(/[^{}]+\{[^}]*\}/g)) {
      if (/\.cal-(item|legenda|celula__item)/.test(regra.split("{")[0])) {
        assert.doesNotMatch(regra, /--color-(warning|info|danger|primary-light)/, regra.split("{")[0].trim());
      }
    }
  });

  test("a legenda da Agenda tem os três tons, com nome escrito", () => {
    assert.deepEqual(LEGENDA.map((n) => [n.tipo, n.rotulo]), [["compromisso", "Compromisso"], ["vencimento", "Vencimento"], ["vencida", "Vencida"]]);
  });
});

// ── Item 3 — a Agenda na pele nova (DEC-136) ─────────────────────────────
import {
  NOMES_DOS_MESES, anosDoSeletor, situacaoDoItem, itemRiscado, rotuloDoItemNaGrade, linhaDaAgenda,
} from "../../src/pages/calendar/agenda.js";
import { VISTAS } from "../../src/pages/calendar/monthGrid.js";
import { MOTIVO_DA_DERIVADA_NAO_EDITAVEL } from "../../src/utils/calendarLabels.js";

describe("Fase 3.8 · item 3 — as regras da Agenda, executadas (DEC-136)", () => {
  const evento = (extra = {}) => ({
    natureza: "evento", _id: "e1", data: "2026-10-27", hora: "14:30", titulo: "Audiência de instrução",
    subtitulo: "Audiência", concluido: false, processo: { numeroProcesso: "0001", titulo: "Cobrança", clientePrincipalNome: "Ana" }, ...extra,
  });
  const parcela = (extra = {}) => ({
    natureza: "derivada", origem: "parcela", _id: "p1", data: "2026-10-27", hora: null, titulo: "Parcela 2 de 3",
    subtitulo: "Honorários contratuais", valor: 1000, status: "pendente", processo: { numeroProcesso: "0002", titulo: "Indenização" }, ...extra,
  });

  test("os seletores: doze meses e o ano à vista sempre na lista", () => {
    assert.equal(NOMES_DOS_MESES.length, 12);
    assert.equal(NOMES_DOS_MESES[9], "Outubro");
    const anos = anosDoSeletor(2026);
    assert.equal(anos.length, 11);
    assert.ok(anos.includes(2026));
    assert.deepEqual([anos[0], anos.at(-1)], [2021, 2031]);
  });

  test("só as duas vistas: Mês e Agenda (a semana dela não entra)", () => {
    assert.deepEqual([...VISTAS], ["mes", "agenda"]);
  });

  test("riscado: compromisso concluído e parcela paga; o resto, não", () => {
    assert.equal(situacaoDoItem(evento({ concluido: true })), "Concluído");
    assert.equal(situacaoDoItem(parcela({ status: "pago" })), "Pago");
    assert.equal(itemRiscado(evento()), false);
    assert.equal(itemRiscado(parcela({ status: "vencido" })), false);
  });

  test("o rótulo acessível da pílula diz a natureza, o texto inteiro e a situação", () => {
    assert.equal(rotuloDoItemNaGrade(evento()), "Compromisso: 14:30, Audiência de instrução, Audiência");
    assert.equal(rotuloDoItemNaGrade(evento({ concluido: true })), "Compromisso: 14:30, Audiência de instrução, Audiência, concluído");
    assert.equal(rotuloDoItemNaGrade(parcela()), "Vencimento: Parcela 2 de 3, Honorários contratuais");
    assert.equal(rotuloDoItemNaGrade(parcela({ status: "vencido" })), "Vencida: Parcela 2 de 3, Honorários contratuais");
    assert.equal(rotuloDoItemNaGrade(parcela({ status: "pago" })), "Vencimento: Parcela 2 de 3, Honorários contratuais, pago");
  });

  test("a linha da vista Agenda: o tom, o destino e a situação", () => {
    const l = linhaDaAgenda(evento({ concluido: true }));
    assert.equal(l.tipo, "compromisso");
    assert.equal(l.destino, "/dashboard/agenda/editar/e1");
    assert.equal(l.subtitulo, "Audiência · 14:30");
    assert.equal(l.contexto, "0001 — Cobrança · Ana");
    assert.equal(l.situacao, "Concluído");
    assert.equal(l.derivada, false);
    const v = linhaDaAgenda(parcela({ status: "vencido" }));
    assert.equal(v.tipo, "vencida");
    assert.equal(v.titulo, "Honorários contratuais — Parcela 2 de 3");
    assert.equal(v.destino, "/dashboard/parcelas/editar/p1");
    assert.equal(v.derivada, true);
    assert.match(v.subtitulo, /1\.000,00/);
  });
});

describe("Fase 3.8 · item 3 — a fiação da tela (DEC-136)", () => {
  const tela = semComentarios(ler("src/pages/calendar/CalendarPage.jsx"));
  const css = semComentarios(ler("src/pages/calendar/CalendarPage.css"));

  test("o balão com o título, Hoje, setas com rótulo, mês e ano, vistas e o +", () => {
    assert.match(tela, /<section className="cal-balao" aria-labelledby="cal-titulo">/);
    assert.match(tela, /<h1 id="cal-titulo" className="cal-titulo">Agenda<\/h1>/);
    assert.match(tela, /aria-label="Mês anterior"/);
    assert.match(tela, /aria-label="Próximo mês"/);
    assert.match(tela, /<label htmlFor="cal-mes"[^>]*>Mês<\/label>\s*<select\s+id="cal-mes"/);
    assert.match(tela, /<label htmlFor="cal-ano"[^>]*>Ano<\/label>\s*<select\s+id="cal-ano"/);
    assert.match(tela, /onChange=\{\(e\) => irPara\(\{ ano, mes: Number\(e\.target\.value\) \}\)\}/);
    assert.match(tela, /onChange=\{\(e\) => irPara\(\{ ano: Number\(e\.target\.value\), mes \}\)\}/);
    assert.match(tela, /to="\/dashboard\/agenda\/novo"\s+className="cal-novo"\s+aria-label="Novo compromisso"/);
    assert.doesNotMatch(tela, /PageHeader/);
  });

  test("sem busca e sem 'fins de semana'", () => {
    assert.doesNotMatch(tela, /type="search"|busca|Buscar|fins de semana|finsDeSemana/i);
  });

  test("a grade: hoje pela forma e pela palavra, 'Mais N' abrindo o dia, pílula com rótulo completo", () => {
    assert.match(tela, /\{ehHoje && <span className="cal-celula__hoje">hoje<\/span>\}/);
    assert.match(tela, /Mais \{ocultos\}/);
    assert.match(tela, /onClick=\{\(\) => onAbrirDia\(celula\.chave\)\}/);
    assert.match(tela, /aria-label=\{rotulo\} title=\{rotulo\}/);
    assert.match(tela, /itemRiscado\(item\) \? 'cal-item--concluido'/);
    assert.match(css, /\.cal-celula--hoje \.cal-celula__numero \{[^}]*background: var\(--color-primary\);[^}]*color: var\(--color-on-primary\);/);
    assert.match(css, /\.cal-item--concluido \.cal-item__titulo,\s*\.cal-item--concluido \.cal-item__hora \{ text-decoration: line-through; \}/);
    assert.match(css, /\.cal-item__titulo \{[^}]*text-overflow: ellipsis;/);
  });

  test("a vista Agenda é a LinhaDeData agrupada por dia, e a derivada diz a frase", () => {
    assert.match(tela, /<LinhaDeData key=\{linha\.chave\} item=\{linha\} onAbrir=\{onAbrirLinha\} \/>/);
    assert.match(tela, /if \(linha\.derivada\) toast\.info\(MOTIVO_DA_DERIVADA_NAO_EDITAVEL\);/);
    assert.match(MOTIVO_DA_DERIVADA_NAO_EDITAVEL, /não se edita na agenda/);
    const linha = semComentarios(ler("src/components/dashboard/LinhaDeData.jsx"));
    assert.match(linha, /onClick=\{onAbrir \? \(\) => onAbrir\(item\) : undefined\}/);
    assert.match(linha, /\{item\.situacao && <span className="datas-item__situacao">\{item\.situacao\}<\/span>\}/);
  });

  test("nenhuma opacidade em item, célula ou linha (o contraste é o medido), nenhum transform/filter", () => {
    assert.doesNotMatch(css, /opacity\s*:/);
    assert.doesNotMatch(css, /(^|[\s;{])(transform|filter)\s*:/m, "`text-transform` não conta; `transform` e `filter`, sim");
    assert.doesNotMatch(semComentarios(ler("src/components/dashboard/LinhaDeData.css")), /opacity\s*:/);
  });
});
