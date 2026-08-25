// ═══════════════════════════════════════════════════════════════════════════
// F-3 — A GRADE DO MÊS: FUNÇÃO PURA, TESTADA NAS VIRADAS
//
// A fase pede fevereiro, ano bissexto e mês que começa no domingo. Os três
// estão aqui, mais a virada de ANO — que é onde a conta escrita à mão
// (`mes === 12 ? ...`) costuma errar, e é por isso que `mesVizinho` não a
// escreve à mão.
//
// ── Por que a grade é função pura ─────────────────────────────────────
// Ela não conhece React, não busca nada e não recebe `Date` de fora. Isso é o
// que permite testá-la com fevereiro de 2024 e de 2026 sem montar componente,
// sem servidor e sem "hoje" — e é o que faz o teste continuar valendo quando a
// tela for redesenhada.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  DIAS_DA_SEMANA,
  LARGURA_DE_TELA_ESTREITA,
  MAXIMO_POR_CELULA,
  agruparPorDia,
  chaveDoDia,
  construirGradeDoMes,
  dataDaChave,
  diasComItens,
  lerChaveDoMes,
  mesDaChave,
  mesVizinho,
  recortarCelula,
  vistaPadrao,
} from '../../src/pages/calendar/monthGrid.js';

const casas = (grade) => grade.semanas.flat();
const doMes = (grade) => casas(grade).filter((c) => c.noMes);

describe('F-3 — a grade sempre tem semanas inteiras', () => {
  // Doze meses de três anos, um deles bissexto. É barato e cobre toda
  // combinação de "em que dia da semana o mês começa".
  for (const ano of [2024, 2026, 2027]) {
    for (let mes = 1; mes <= 12; mes += 1) {
      test(`${String(mes).padStart(2, '0')}/${ano}: linhas de 7, começando no domingo`, () => {
        const grade = construirGradeDoMes(ano, mes);

        for (const semana of grade.semanas) {
          assert.equal(semana.length, 7, 'toda linha tem sete casas');
        }

        // A primeira casa é domingo, a última é sábado. Um calendário que
        // começa na segunda em algumas linhas e no domingo em outras não é um
        // calendário — e é o defeito que aparece quando o mês vira.
        assert.equal(dataDaChave(casas(grade)[0].chave).getUTCDay(), 0);
        assert.equal(dataDaChave(casas(grade).at(-1).chave).getUTCDay(), 6);

        // Cinco ou seis linhas. Quatro só aconteceria num fevereiro não
        // bissexto que começasse no domingo (existe, e é testado abaixo).
        assert.ok(
          grade.semanas.length >= 4 && grade.semanas.length <= 6,
          `${grade.semanas.length} semanas em ${mes}/${ano}`
        );

        // As casas do mês são consecutivas e começam no dia 1.
        const dias = doMes(grade).map((c) => c.dia);
        assert.equal(dias[0], 1);
        assert.deepEqual(dias, dias.map((_, i) => i + 1));
      });
    }
  }
});

describe('F-3 — FEVEREIRO, e o ano bissexto', () => {
  test('fevereiro de 2024 (bissexto) tem 29 dias', () => {
    const grade = construirGradeDoMes(2024, 2);
    assert.equal(doMes(grade).length, 29);
    assert.equal(doMes(grade).at(-1).chave, '2024-02-29');
  });

  test('fevereiro de 2026 (comum) tem 28 dias — e não desliza para 01/03', () => {
    const grade = construirGradeDoMes(2026, 2);
    assert.equal(doMes(grade).length, 28);
    assert.equal(doMes(grade).at(-1).chave, '2026-02-28');
    // Nenhuma casa do mês pode ser 29/02 num ano que não o tem. `Date.UTC`
    // deslizaria em silêncio, e é por isso que a grade usa o "dia 0 do mês
    // seguinte" em vez de uma tabela de tamanhos.
    assert.equal(casas(grade).some((c) => c.noMes && c.chave === '2026-02-29'), false);
  });

  test('fevereiro de 2100 NÃO é bissexto — a regra do século', () => {
    // Ano divisível por 100 e não por 400. É a exceção que uma conta caseira
    // de bissexto (`ano % 4 === 0`) erraria — e a grade não tem conta nenhuma,
    // que é o ponto.
    assert.equal(doMes(construirGradeDoMes(2100, 2)).length, 28);
    assert.equal(doMes(construirGradeDoMes(2000, 2)).length, 29);
  });

  test('fevereiro que começa no DOMINGO e tem 28 dias cabe em 4 linhas', () => {
    // 01/02/2026 é um domingo, e 2026 não é bissexto: 28 dias em 4 semanas
    // exatas, sem nenhuma casa de fora. É o caso extremo da grade.
    const grade = construirGradeDoMes(2026, 2);
    assert.equal(dataDaChave('2026-02-01').getUTCDay(), 0, 'a premissa: 01/02/2026 é domingo');
    assert.equal(grade.semanas.length, 4);
    assert.equal(casas(grade).filter((c) => !c.noMes).length, 0, 'nenhuma casa de outro mês');
  });
});

describe('F-3 — mês que começa no DOMINGO', () => {
  test('não gera linha de casas todas fora do mês', () => {
    // Março de 2026 começa num domingo. Uma grade que sempre pusesse uma linha
    // do mês anterior mostraria sete casas esmaecidas antes do dia 1.
    assert.equal(dataDaChave('2026-03-01').getUTCDay(), 0, 'a premissa');
    const grade = construirGradeDoMes(2026, 3);
    assert.equal(grade.semanas[0][0].chave, '2026-03-01');
    assert.equal(grade.semanas[0][0].noMes, true);
  });

  test('mês que TERMINA no sábado não gera linha extra', () => {
    const grade = construirGradeDoMes(2026, 2);
    assert.equal(casas(grade).at(-1).chave, '2026-02-28');
  });
});

describe('F-3 — as casas de fora do mês ENTRAM, marcadas', () => {
  test('setembro de 2026 traz o fim de agosto e o começo de outubro', () => {
    const grade = construirGradeDoMes(2026, 9);

    // 01/09/2026 é terça: a primeira linha traz 30 e 31 de agosto.
    assert.equal(grade.primeiroDia, '2026-08-30');
    assert.equal(grade.semanas[0][0].noMes, false);
    assert.equal(grade.semanas[0][0].dia, 30);
    assert.equal(grade.semanas[0][2].chave, '2026-09-01');
    assert.equal(grade.semanas[0][2].noMes, true);

    // A casa de fora do mês existe. Deixá-la vazia faria buraco na primeira
    // linha, e buraco se lê como "não há nada nesse dia" — não como "esse dia
    // é de outro mês".
    assert.ok(casas(grade).some((c) => !c.noMes));
  });

  test('o intervalo pedido ao backend é o da GRADE, não o do mês', () => {
    const grade = construirGradeDoMes(2026, 9);
    // Se fosse o do mês (01 a 30), as casas de 30/08 e 31/08 apareceriam
    // vazias mesmo tendo compromisso.
    assert.equal(grade.primeiroDia, '2026-08-30');
    assert.equal(grade.ultimoDia, '2026-10-03');
    assert.notEqual(grade.primeiroDia, '2026-09-01');
  });
});

describe('F-3 — a virada de ANO', () => {
  test('dezembro → janeiro do ano seguinte', () => {
    assert.deepEqual(mesVizinho(2026, 12, 1), { ano: 2027, mes: 1 });
  });

  test('janeiro → dezembro do ano anterior', () => {
    assert.deepEqual(mesVizinho(2026, 1, -1), { ano: 2025, mes: 12 });
  });

  test('doze passos para a frente dão o mesmo mês do ano seguinte', () => {
    let atual = { ano: 2026, mes: 5 };
    for (let i = 0; i < 12; i += 1) atual = mesVizinho(atual.ano, atual.mes, 1);
    assert.deepEqual(atual, { ano: 2027, mes: 5 });
  });

  test('a grade de dezembro traz dias de janeiro do ano SEGUINTE', () => {
    const grade = construirGradeDoMes(2026, 12);
    const forasDoFim = casas(grade).filter((c) => !c.noMes && c.chave > '2026-12-31');
    assert.ok(forasDoFim.length > 0);
    assert.ok(forasDoFim.every((c) => c.chave.startsWith('2027-01')));
  });

  test('a grade de janeiro traz dias de dezembro do ano ANTERIOR', () => {
    const grade = construirGradeDoMes(2027, 1);
    const forasDoComeco = casas(grade).filter((c) => !c.noMes && c.chave < '2027-01-01');
    assert.ok(forasDoComeco.every((c) => c.chave.startsWith('2026-12')));
  });
});

describe('F-3 — nenhuma conta usa hora LOCAL', () => {
  test('a grade é a MESMA em qualquer fuso', () => {
    const original = process.env.TZ;
    const resultados = [];

    for (const fuso of ['America/Sao_Paulo', 'Pacific/Kiritimati', 'UTC']) {
      process.env.TZ = fuso;
      resultados.push(casas(construirGradeDoMes(2026, 9)).map((c) => `${c.chave}:${c.noMes}`).join('|'));
    }

    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;

    assert.equal(new Set(resultados).size, 1, 'a grade mudou de fuso para fuso');
  });

  test('o módulo não chama nenhum método de data LOCAL', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const fonte = readFileSync(
      fileURLToPath(new URL('../../src/pages/calendar/monthGrid.js', import.meta.url)),
      'utf8'
    );
    // Remove os comentários antes de varrer: as notas do arquivo CITAM os
    // métodos proibidos para explicar por que não são usados, e uma varredura
    // ingênua acusaria a própria explicação.
    const codigo = fonte.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    for (const proibido of ['.getDate(', '.getMonth(', '.getFullYear(', '.getDay(', '.setDate(']) {
      assert.equal(
        codigo.includes(proibido),
        false,
        `\`${proibido}\` é hora LOCAL — a grade monta o mês errado a oeste de Greenwich`
      );
    }
    assert.ok(codigo.includes('Date.UTC'), 'a grade constrói datas em UTC');
  });

  test('`dataDaChave` recusa o instante ISO — o formato que o backend nunca manda', () => {
    assert.equal(dataDaChave('2026-09-01T00:00:00.000Z'), null);
    assert.equal(dataDaChave('01/09/2026'), null);
    assert.equal(dataDaChave('2026-02-31'), null);
    assert.equal(chaveDoDia(dataDaChave('2026-09-01')), '2026-09-01');
  });
});

describe('F-3 — a VISTA PADRÃO em tela estreita é a AGENDA', () => {
  test('360 px abre na agenda', () => {
    assert.equal(vistaPadrao(360), 'agenda');
  });

  test('1024 px abre na grade do mês', () => {
    assert.equal(vistaPadrao(1024), 'mes');
  });

  test('o corte é 768 px, o mesmo em que o layout troca de navegação', () => {
    assert.equal(LARGURA_DE_TELA_ESTREITA, 768);
    assert.equal(vistaPadrao(767), 'agenda');
    assert.equal(vistaPadrao(768), 'mes');
  });

  test('sem largura conhecida, abre na grade', () => {
    // Servidor, ou navegador sem `innerWidth`. A grade é o padrão porque é a
    // vista completa: abrir na agenda por não saber a largura esconderia os
    // dias vazios de quem tem tela para eles.
    assert.equal(vistaPadrao(undefined), 'mes');
    assert.equal(vistaPadrao(null), 'mes');
  });
});

describe('F-3 — o "+N" do dia cheio', () => {
  const item = (n) => ({ _id: String(n), data: '2026-09-15', titulo: `item ${n}` });

  test('até o máximo, nada fica de fora', () => {
    const { visiveis, ocultos } = recortarCelula([item(1), item(2), item(3)]);
    assert.equal(visiveis.length, 3);
    assert.equal(ocultos, 0);
  });

  test('o N é quantos FICARAM DE FORA, não o total', () => {
    const oito = Array.from({ length: 8 }, (_, i) => item(i));
    const { visiveis, ocultos } = recortarCelula(oito);

    assert.equal(visiveis.length, MAXIMO_POR_CELULA);
    assert.equal(ocultos, 8 - MAXIMO_POR_CELULA, 'um "+8" mandaria procurar os três que já aparecem');
  });

  test('lista vazia não vira "+0"', () => {
    const { visiveis, ocultos } = recortarCelula([]);
    assert.equal(visiveis.length, 0);
    assert.equal(ocultos, 0);
  });
});

describe('F-3 — agrupamento por dia', () => {
  const itens = [
    { _id: 'a', data: '2026-09-15', titulo: 'Audiência', natureza: 'evento' },
    { _id: 'b', data: '2026-09-10', titulo: 'Parcela 1', natureza: 'derivada' },
    { _id: 'c', data: '2026-09-15', titulo: 'Reunião', natureza: 'evento' },
  ];

  test('agrupa pela `data` que o backend mandou, sem converter nada', () => {
    const mapa = agruparPorDia(itens);
    assert.equal(mapa.get('2026-09-15').length, 2);
    assert.equal(mapa.get('2026-09-10').length, 1);
  });

  test('a agenda lista só os dias que TÊM alguma coisa, em ordem', () => {
    const dias = diasComItens(itens);
    assert.deepEqual(dias.map((d) => d.chave), ['2026-09-10', '2026-09-15']);
    // Uma agenda que imprimisse os trinta dias do mês para mostrar dois
    // compromissos esconderia os dois.
    assert.equal(dias.length, 2);
  });

  test('item sem data é ignorado em vez de virar chave `undefined`', () => {
    const mapa = agruparPorDia([...itens, { _id: 'x', titulo: 'sem data' }]);
    assert.equal(mapa.has(undefined), false);
    assert.equal(mapa.size, 2);
  });
});

describe('F-3 — as chaves de mês da URL', () => {
  test('`2026-09` é lido; o que não serve devolve null', () => {
    assert.deepEqual(lerChaveDoMes('2026-09'), { ano: 2026, mes: 9 });
    assert.equal(lerChaveDoMes('2026-13'), null);
    assert.equal(lerChaveDoMes('2026-00'), null);
    assert.equal(lerChaveDoMes('setembro'), null);
    assert.equal(lerChaveDoMes(null), null);
  });

  test('`mesDaChave` leva o "hoje" do backend ao mês certo', () => {
    assert.deepEqual(mesDaChave('2026-09-01'), { ano: 2026, mes: 9 });
    assert.deepEqual(mesDaChave('2026-12-31'), { ano: 2026, mes: 12 });
  });

  test('os sete dias da semana começam no domingo', () => {
    assert.equal(DIAS_DA_SEMANA.length, 7);
    assert.equal(DIAS_DA_SEMANA[0].curto, 'dom');
    assert.equal(DIAS_DA_SEMANA[6].curto, 'sáb');
    // O nome longo existe para o leitor de tela: "seg" lido em voz alta não é
    // uma palavra.
    assert.equal(DIAS_DA_SEMANA[1].longo, 'segunda-feira');
  });
});
