// ═══════════════════════════════════════════════════════════════════════════
// DEC-056 NA TELA — a linha do tempo do processo
//
// O backend prova o conteúdo (`tests/calendar/dec056.test.js` do lex-backend).
// Aqui prova-se o que só a tela pode errar:
//
//   • **o financeiro não entra**, e nenhum import a esta altura o traz;
//   • os futuros ficam VISIVELMENTE à frente do hoje, e o corte vem do backend;
//   • nenhum rótulo de fase é montado por conta própria;
//   • a linha é só leitura.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), 'utf8');

const LINHA = ler('src/components/processes/ProcessTimeline.jsx');
const CSS = ler('src/components/processes/ProcessTimeline.css');
const PAGINA = ler('src/pages/processes/ProcessDetailPage.jsx');
const CODIGO = LINHA.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('DEC-056 — o FINANCEIRO não entra na linha do tempo', () => {
  test('o componente não importa nada de financeiro', () => {
    for (const proibido of [
      'feeService', 'installmentService', 'paymentService', 'financeiroService',
      'FeeStatement', 'ProcessFinancialSheet', 'formatCurrency',
    ]) {
      assert.equal(
        CODIGO.includes(proibido),
        false,
        `\`${proibido}\` na linha do tempo — o extrato do honorário responde outra pergunta`
      );
    }
  });

  test('o componente não renderiza valor em reais', () => {
    assert.equal(/R\$/.test(CODIGO), false);
    assert.equal(/valor/i.test(CODIGO.replace(/tipoEvento/g, '')), false, 'nenhuma menção a valor');
  });

  test('a ficha financeira continua na página, em SEÇÃO PRÓPRIA', () => {
    // A exclusão é da LINHA DO TEMPO, e não da página: o dinheiro do processo
    // continua onde estava. Misturar as duas é que faria uma tela que não
    // responde nenhuma pergunta.
    assert.ok(PAGINA.includes('<ProcessFinancialSheet'));
    assert.ok(PAGINA.includes('<ProcessTimeline'));
    // E a linha do tempo é IRMÃ da ficha, não filha dela: `ProcessFinancialSheet`
    // é auto-fechada, então nada pode estar dentro. É a asserção que trava a
    // separação — o dia em que alguém "juntar as duas seções", ela cai.
    assert.match(
      PAGINA,
      /<ProcessFinancialSheet processoId=\{id\} \/>/,
      'a ficha financeira precisa ser auto-fechada — nada vive dentro dela'
    );
    assert.match(
      PAGINA,
      /<ProcessTimeline processoId=\{id\} \/>/,
      'a linha do tempo é irmã da ficha, e não filha'
    );
  });
});

describe('DEC-056 — os quatro tipos, e nenhum a mais', () => {
  test('o mapa de ícones cobre exatamente fase, encerramento, liminar e evento', () => {
    const tipos = [...CODIGO.matchAll(/^\s*(fase|encerramento|liminar|evento):/gm)].map((m) => m[1]);
    assert.deepEqual([...new Set(tipos)].sort(), ['encerramento', 'evento', 'fase', 'liminar']);
  });

  test('cada tipo tem marca visual própria no CSS', () => {
    for (const tipo of ['fase', 'encerramento', 'liminar', 'evento']) {
      assert.ok(
        CSS.includes(`.linha__item--${tipo} .linha__marca`),
        `o tipo ${tipo} não se distingue visualmente`
      );
    }
  });

  test('a liminar usa o tom de ATENÇÃO, e não o de perigo', () => {
    // *"Liminar é um plus dentro das fases (…) não é uma fase nova."* Ela não
    // deu errado — é pedido de urgência. É o mesmo tom do selo da DEC-054.
    assert.match(CSS, /\.linha__item--liminar \.linha__marca \{[^}]*--color-warning/s);
    assert.equal(/\.linha__item--liminar \.linha__marca \{[^}]*--color-danger/s.test(CSS), false);
  });

  test('o NASCIMENTO é dito como nascimento', () => {
    // Sem isso, um processo criado direto em "execução" apareceria como se
    // sempre tivesse estado lá, e não haveria como distinguir "nasceu assim"
    // de "nunca mudou".
    assert.ok(CODIGO.includes('entrada.nascimento'));
    assert.ok(CODIGO.includes('Processo cadastrado em'));
  });
});

describe('DEC-056 — os futuros ficam VISIVELMENTE à frente do hoje', () => {
  test('o corte vem do BACKEND, e não é recalculado na tela', () => {
    assert.ok(CODIGO.includes('entrada.futuro'));
    // O navegador não sabe o "hoje" do servidor, e um relógio atrasado poria
    // uma audiência de amanhã do lado errado da linha.
    assert.equal(
      /new Date\(\)/.test(CODIGO),
      false,
      'a tela não pode decidir o que é futuro pelo relógio do navegador'
    );
  });

  test('o futuro tem DOIS sinais, não só opacidade', () => {
    assert.match(CSS, /\.linha__item--futuro \{[^}]*opacity/s);
    assert.match(CSS, /\.linha__item--futuro \.linha__marca \{[^}]*border-style:\s*dashed/s);
  });

  test('o "hoje" é uma LINHA na régua, e não um estilo por item', () => {
    // O que a advogada procura ao abrir isto é ONDE O PRESENTE ESTÁ. Um
    // contorno diferente em cada item obriga a percorrer a lista para descobrir.
    assert.ok(CODIGO.includes('linha__hoje'));
    assert.ok(CSS.includes('.linha__hoje'));
    assert.match(CSS, /\.linha__hoje \{[^}]*border-top/s);
  });

  test('sem futuro nenhum, a marca do hoje vai no FIM', () => {
    assert.ok(CODIGO.includes('primeiroFuturo === -1'));
  });
});

describe('DEC-056 — nenhum rótulo montado à mão', () => {
  test('os rótulos de fase e de tipo de evento vêm PRONTOS do backend', () => {
    assert.ok(CODIGO.includes('entrada.paraRotulo'));
    assert.ok(CODIGO.includes('entrada.deRotulo'));
    assert.ok(CODIGO.includes('entrada.tipoEventoRotulo'));
  });

  test('a tela não escreve os nomes das fases', () => {
    for (const rotulo of ['Fase de conhecimento', 'Sentença', 'Execução', 'Recursos']) {
      assert.equal(
        CODIGO.includes(rotulo),
        false,
        `"${rotulo}" escrito à mão — o rótulo da primeira fase está PENDENTE DE RATIFICAÇÃO e mudaria em dois lugares`
      );
    }
  });

  test('a tela não capitaliza string crua de enum', () => {
    assert.equal(/\.charAt\(0\)\.toUpperCase\(\)/.test(CODIGO), false);
    assert.equal(/replace\(['"]_['"]/.test(CODIGO), false);
  });

  test('o MOTIVO aparece quando existe, e não deixa vazio quando não', () => {
    // *"Não precisa anotar o porquê, só se ela quiser mesmo."* O motivo é
    // opcional em toda a cadeia, e a linha do tempo é o último elo dela.
    assert.ok(CODIGO.includes('{entrada.motivo &&'));
  });
});

describe('DEC-056 — apresentação, e não coleta', () => {
  test('o componente não faz nenhuma chamada de escrita', () => {
    for (const verbo of ['.post(', '.patch(', '.put(', '.delete(']) {
      assert.equal(CODIGO.includes(verbo), false, `\`${verbo}\` na linha do tempo`);
    }
  });

  test('o serviço expõe a linha do tempo só por GET', () => {
    const api = ler('src/api/processService.js');
    assert.match(api, /const getTimeline = \(id\) => api\.get\(/);
  });

  test('carregando ≠ vazio, e o vazio tem frase própria', () => {
    assert.ok(CODIGO.includes('<Loading />'));
    assert.ok(CODIGO.includes('Nada registrado ainda'));
  });
});
