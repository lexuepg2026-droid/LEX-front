// ═══════════════════════════════════════════════════════════════════════════
// FASE 3.10 — fechamento do porte (DEC-151 em diante)
//
// O que é regra mora em função pura e é EXECUTADO aqui; o que é fiação de
// tela é varrido como texto, sem comentários. Cliques, foco e larguras ficam
// na varredura do navegador e no roteiro visual do relatório.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { descricaoDoRecorteFinanceiro } from "../../src/components/financeiro/filterSummary.js";

const RAIZ = new URL("../..", import.meta.url).pathname;
const ler = (rel) => readFileSync(join(RAIZ, rel), "utf8");
const semComentarios = (s) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// ── Decisão 1 — o filtro por honorário por busca (DEC-151) ───────────────
describe("Fase 3.10 · decisão 1 — o honorário dos filtros por busca, sem o teto de 100 (DEC-151)", () => {
  const barra = semComentarios(ler("src/components/financeiro/FinancialFilters.jsx"));
  const api = semComentarios(ler("src/api/feeService.js"));
  const paginas = ["src/pages/installments/InstallmentListPage.jsx", "src/pages/payments/PaymentListPage.jsx"];

  test("as duas listas não pedem mais os 100 honorários, e ligam o seletor da barra", () => {
    for (const p of paginas) {
      const fonte = semComentarios(ler(p));
      assert.doesNotMatch(fonte, /limit: 100/, p);
      assert.doesNotMatch(fonte, /listFees\(/, p);
      assert.match(fonte, /filtroDeHonorario=\{\{ onEscolhido: setHonorarioEscolhido \}\}/, p);
      assert.match(fonte, /honorarios: honorarioEscolhido && filtros\.honorarioId \? \[honorarioEscolhido\] : \[\]/, p);
    }
  });

  test("o seletor da DEC-101: busca com semToastGlobal, o rótulo completo, o id da URL buscado pelo id, não obrigatório", () => {
    assert.match(barra, /<SeletorComBusca\s+id="filtro-honorario"/);
    assert.match(barra, /valor=\{filtros\.honorarioId\}/);
    assert.match(barra, /onMudar=\{\(hid\) => definirFiltro\('honorarioId', hid \|\| ''\)\}/);
    assert.match(barra, /buscarPorId=\{buscarHonorarioPorId\}/);
    assert.match(barra, /rotulo=\{rotuloDoHonorarioNoSeletor\}/);
    assert.match(barra, /obrigatorio=\{false\}/);
    assert.match(barra, /aria-label="Filtrar por honorário"/);
    assert.match(api, /api\.get\('\/fees', \{ params: \{ page: 1, limit: LIMITE_DE_SUGESTOES, busca \}, semToastGlobal: true \}\)/);
    assert.doesNotMatch(barra, /<select[^>]*Filtrar por honorário/);
  });

  test("a frase do recorte nomeia o escolhido, e sem ele diz 'para este honorário'", () => {
    const filtros = { honorarioId: "h1", preset: "todos" };
    const escolhido = { _id: "h1", descricao: "Honorários advocatícios — execução fiscal" };
    assert.match(descricaoDoRecorteFinanceiro({ filtros, honorarios: [escolhido] }), /do honorário "execução fiscal"/);
    assert.match(descricaoDoRecorteFinanceiro({ filtros, honorarios: [] }), /para este honorário/);
  });

  test("o valor esvaziado de fora (o 'voltar', o 'Limpar filtros') desfaz a escolha do seletor", () => {
    const seletor = semComentarios(ler("src/components/ui/SeletorComBusca.jsx"));
    assert.match(seletor, /if \(!valor\) \{\s*if \(escolhido\) \{\s*setEscolhido\(null\);\s*setTexto\(''\);/);
    // A digitação desfaz a escolha ANTES de avisar o pai — por isso não cai aqui.
    assert.match(seletor, /setEscolhido\(null\);\s*onMudar\('', null\);/);
  });

  test("nenhuma lista passa mais a prop morta `honorarios`", () => {
    for (const p of ["clients/ClientListPage", "secoes/SecaoListPage", "processes/ProcessListPage", "documents/DocumentListPage", "fees/FeeListPage", ...paginas.map((x) => x.replace(/^src\/pages\/|\.jsx$/g, ""))]) {
      assert.doesNotMatch(semComentarios(ler(`src/pages/${p}.jsx`)), /\shonorarios=\{/, p);
    }
  });
});

// ── Decisão 3 — a PendenciasPage na pele nova (DEC-153) ──────────────────
describe("Fase 3.10 · decisão 3 — Pendências na pele das listas (DEC-153)", () => {
  const tela = semComentarios(ler("src/pages/pendencias/PendenciasPage.jsx"));
  const css = ler("src/pages/pendencias/PendenciasPage.css").replace(/\/\*[\s\S]*?\*\//g, "");

  test("o balão, o título com o total e as linhas", () => {
    assert.match(tela, /<section className="lista-balao" aria-labelledby="titulo-pendencias">/);
    assert.match(tela, /Alterações não enviadas\s*<span className="lista-balao__total"> \(\{quantidade\}\)<\/span>/);
    assert.match(tela, /import '\.\.\/\.\.\/components\/financeiro\/CabecalhoDeLista\.css';/);
    assert.match(css, /\.fila__item \{[^}]*border-bottom: 1px solid var\(--color-border\);/);
    assert.match(css, /\.fila__item:hover \{[^}]*background-color: var\(--color-surface-raised\);/);
  });

  test("a regra da DEC-060 é a mesma: as duas versões, o reenvio, o descarte só pelo Modal", () => {
    assert.match(tela, /\{conflito && \(\s*<ComparacaoDeVersoes minha=\{entrada\.body\} doServidor=\{entrada\.falha\?\.atual\} \/>/);
    assert.match(tela, /onClick=\{\(\) => manterMinha\(entrada\)\}/);
    assert.match(tela, /onClick=\{\(\) => tentarDeNovo\(entrada\.id\)\}/);
    assert.match(tela, /onConfirm=\{confirmarDescarte\}/);
    assert.match(tela, /await manterMinhaVersao\(user\?\.id, entrada\.id\);\s*await recarregar\(\);\s*await enviar\(\);/);
    for (const frase of ["Sem conexão. A fila sobe sozinha quando o sinal voltar.", "Tudo que você gravou já está no servidor.", "Manter a minha versão", "Ficar com a do servidor", "Tentar enviar agora"]) {
      assert.ok(tela.includes(frase), frase);
    }
  });

  test("as classes não colidem mais com a PendenciaList dos documentos", () => {
    assert.doesNotMatch(tela, /className=\{?[`"]pendencia/);
    assert.doesNotMatch(css, /\.pendencia/);
    assert.match(ler("src/components/documents/PendenciaList.css"), /^\.pendencia \{/m);
  });
});

// ── Decisão 4 — o título do bloco da folha a 360 px (DEC-154) ────────────
describe("Fase 3.10 · decisão 4 — 'Remover' só com ícone abaixo de 768 px (DEC-154)", () => {
  const canvas = semComentarios(ler("src/components/documents/DocumentCanvas.jsx"));
  const css = ler("src/components/documents/DocumentCanvas.css").replace(/\/\*[\s\S]*?\*\//g, "");

  test("o botão guarda o nome no aria-label, e a palavra numa classe que some no celular", () => {
    assert.match(canvas, /aria-label=\{`Remover “\$\{secao\.titulo\}” do documento`\}\s*>\s*<Icone nome="lixeira" tamanho=\{14\} \/>\s*<span className="canvas-bloco__acao-rotulo">Remover<\/span>/);
    assert.match(css, /@media \(max-width: 767px\) \{\s*\.canvas-bloco__acao-rotulo \{\s*display: none;/);
    // Só o ícone deixava o título com 8 a 34 px (medido): a barra quebra, e o
    // título guarda 120 px.
    assert.match(css, /\.canvas-bloco__barra \{\s*flex-wrap: wrap;/);
    assert.match(css, /\.canvas-bloco__titulo \{\s*flex: 1 1 120px;\s*min-width: 120px;/);
    // O remover continua chamando o mesmo tratador.
    assert.match(canvas, /onClick=\{\(\) => onRemover\(vinculo\)\}/);
  });

  test("a folha continua branca, e os protegidos não mudaram de lugar", () => {
    assert.match(css, /\.canvas-folha \{[^}]*background: #ffffff;/);
    const pagina = semComentarios(ler("src/pages/documents/DocumentAssemblyPage.jsx"));
    assert.match(pagina, /const montado = useIsMounted\(\);/);
    assert.match(pagina, /const enfileirar = useSerialQueue\(\);/);
    assert.match(pagina, /from '\.\/assemblyState\.js'/);
  });
});

// ── Decisão 5 — o foco do interruptor do portal (DEC-155) ────────────────
describe("Fase 3.10 · decisão 5 — o interruptor não perde o foco durante o pedido (DEC-155)", () => {
  const tela = semComentarios(ler("src/pages/documents/DocumentFinalTextPage.jsx"));
  const alternar = tela.slice(tela.indexOf("const alternarPortal"), tela.indexOf("const regerar"));

  test("aria-disabled durante o pedido, e a recusa no tratador (DEC-053)", () => {
    assert.match(tela, /role="switch"[\s\S]{0,400}onClick=\{alternarPortal\}\s*aria-disabled=\{alternandoPortal \? 'true' : undefined\}/);
    assert.doesNotMatch(tela.slice(tela.indexOf('role="switch"'), tela.indexOf('role="switch"') + 600), /\sdisabled=\{alternandoPortal\}/);
    assert.match(alternar, /^const alternarPortal = useCallback\(async \(\) => \{\s*if \(alternandoPortal\) return;\s*const alvo = !visivelPortal;/);
    assert.match(alternar, /\[id, visivelPortal, alternandoPortal\]/);
  });

  test("nada mais no tratador mudou: o mesmo pedido, sem confirmação", () => {
    assert.match(alternar, /await documentService\.alternarVisibilidadePortal\(id, alvo\);/);
    assert.match(alternar, /setVisivelPortal\(res\.data\?\.visivelPortal === true\);/);
    assert.match(alternar, /finally \{\s*setAlternandoPortal\(false\);/);
    assert.doesNotMatch(alternar, /confirm/i);
  });

  test("o LiberacaoPortal já usa aria-disabled e recusa no tratador — não tinha o defeito", () => {
    const lib = semComentarios(ler("src/components/processes/LiberacaoPortal.jsx"));
    assert.match(lib, /if \(!online \|\| enviando\) return;/);
    assert.match(lib, /aria-disabled=\{online && !enviando \? undefined : 'true'\}/);
    assert.doesNotMatch(lib.slice(lib.indexOf('role="switch"'), lib.indexOf('role="switch"') + 500), /\sdisabled=/);
  });
});

// ── Achado da varredura — o campo de processo da geração (pele) ──────────
describe("Fase 3.10 · achado da varredura — o seletor de processo da geração ocupa o campo", () => {
  test("o invólucro .sugestoes e o input com a largura do campo", () => {
    const css = ler("src/components/documents/GenerationPanel.css").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.match(css, /\.geracao__campo \.sugestoes,\s*\.geracao__campo \.sugestoes input \{\s*width: 100%;/);
  });
});
