// ═══════════════════════════════════════════════════════════════════════════
// F-3, PARTE 3 — AS REGRAS DA TELA
//
// Análise estática do JSX, no mesmo estilo das suítes de regressão do projeto:
// não há navegador nem jsdom aqui, e o que se prova é que a tela FOI ESCRITA
// obedecendo às regras — não que ela pinte certo.
//
// A conta que a fase de fato exige em função pura (a grade, a vista padrão, o
// "+N") está em `grade.test.js`, testada de verdade. Este arquivo trava o que
// só existe no JSX: o estado vazio com frase própria, o carregando separado do
// vazio, a vista que sobrevive à navegação, e a ausência de biblioteca de
// calendário.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), 'utf8');

const CALENDARIO = ler('src/pages/calendar/CalendarPage.jsx');
const CSS = ler('src/pages/calendar/CalendarPage.css');
const PACKAGE = JSON.parse(ler('package.json'));

describe('Parte 3 — ZERO dependência nova, inclusive de calendário', () => {
  test('nenhuma dependência de data ou de calendário entrou no package.json', () => {
    const todas = Object.keys({
      ...PACKAGE.dependencies,
      ...PACKAGE.devDependencies,
    });

    const proibidas = [
      'date-fns', 'dayjs', 'moment', 'luxon', 'js-joda',
      'react-calendar', 'react-big-calendar', 'react-day-picker',
      '@fullcalendar/core', '@fullcalendar/react', 'rc-calendar', 'react-datepicker',
    ];

    for (const proibida of proibidas) {
      assert.equal(
        todas.includes(proibida),
        false,
        `\`${proibida}\` entrou — a fase proíbe dependência nova, e a grade cabe em vinte linhas`
      );
    }
  });

  test('a tela não importa nada de fora do projeto além do que já existia', () => {
    const importados = [...CALENDARIO.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    const externos = importados.filter((i) => !i.startsWith('.'));

    // `react`, `react-router-dom` e `lucide-react` já eram dependências do
    // projeto antes desta fase. Qualquer outro nome aqui é dependência nova.
    for (const externo of externos) {
      assert.ok(
        ['react', 'react-router-dom', 'lucide-react'].includes(externo),
        `import externo novo: ${externo}`
      );
    }
  });

  test('a grade é construída à mão, pela função pura', () => {
    assert.ok(CALENDARIO.includes('construirGradeDoMes'));
    assert.ok(CSS.includes('grid-template-columns: repeat(7, 1fr)'), 'sete colunas de grid');
  });
});

describe('Parte 3 — CARREGANDO ≠ VAZIO (regra do passo 116)', () => {
  test('a tela tem ramo próprio de carregando, ANTES de escolher a vista', () => {
    // Grade vazia e grade carregando são indistinguíveis, e a segunda faz
    // esperar por algo que não vem.
    assert.ok(CALENDARIO.includes('<Loading />'));
    assert.match(
      CALENDARIO,
      /loading \?\s*\(\s*<Loading \/>/,
      'o carregando precisa vir antes das duas vistas, e não dentro de uma delas'
    );
  });

  test('o estado vazio tem FRASE PRÓPRIA e nomeia o MÊS', () => {
    // "Nenhum compromisso em setembro/2026" — sem o nome do mês, a advogada não
    // sabe se está vendo o mês que pediu.
    assert.ok(CALENDARIO.includes('Nenhum compromisso em'));
    assert.ok(CALENDARIO.includes('rotuloDoMes'));
    assert.ok(CALENDARIO.includes('formatMonthKey'), 'o mês por extenso sai do formatador único');
  });

  test('as DUAS vistas têm estado vazio — não só a grade', () => {
    // Uma agenda vazia sem frase é uma lista em branco, que é ainda mais mudo
    // que uma grade vazia.
    const ocorrencias = CALENDARIO.match(/<EstadoVazio/g) ?? [];
    assert.ok(ocorrencias.length >= 2, `só ${ocorrencias.length} uso(s) de EstadoVazio`);
  });
});

describe('Parte 3 — HOJE é visualmente distinto, sempre', () => {
  test('a célula de hoje tem classe própria, e o CSS a pinta', () => {
    assert.ok(CALENDARIO.includes('cal-celula--hoje'));
    assert.ok(CSS.includes('.cal-celula--hoje'));
  });

  test('o "hoje" vem do BACKEND, e não do relógio do navegador', () => {
    // Um relógio de máquina atrasado destacaria o dia errado — no componente
    // cuja única função é dizer que dia é hoje.
    assert.ok(CALENDARIO.includes('dados?.hoje'));
    const codigo = CALENDARIO.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.equal(
      /hoje\s*=\s*new Date\(\)/.test(codigo),
      false,
      'o "hoje" da grade não pode sair do navegador'
    );
  });

  test('a agenda também marca o dia de hoje', () => {
    assert.ok(CALENDARIO.includes('cal-agenda__dia--hoje'));
    assert.ok(CSS.includes('.cal-agenda__dia--hoje'));
  });
});

describe('Parte 3 — navegar entre meses NÃO perde a vista', () => {
  test('a vista vive na query string, e é reescrita na navegação de mês', () => {
    assert.ok(CALENDARIO.includes("searchParams.get('vista')"));
    // A reescrita é o ponto: sem ela, quem chegasse por um link sem `?vista=` e
    // clicasse em ">" perderia a vista implícita da largura e voltaria à grade
    // em 360 px.
    assert.match(
      CALENDARIO,
      /params\.set\('vista', vista\)/,
      'a vista atual precisa ser reescrita a cada navegação'
    );
  });

  test('o mês também vive na URL — o "voltar" do navegador desfaz a navegação', () => {
    assert.ok(CALENDARIO.includes("params.set('mes'"));
    assert.ok(CALENDARIO.includes('lerChaveDoMes'));
  });

  test('a vista da URL só vale se for uma das duas conhecidas', () => {
    // `?vista=grade` (nome errado) não pode virar uma vista terceira que não
    // renderiza nada.
    assert.ok(CALENDARIO.includes('VISTAS.includes(vistaDaUrl)'));
  });
});

describe('Parte 3 — criar a partir do clique num DIA', () => {
  test('o clique no dia leva ao formulário com a data preenchida', () => {
    assert.ok(CALENDARIO.includes('/dashboard/agenda/novo?data='));
    assert.ok(CALENDARIO.includes('onCriarNoDia'));
  });

  test('o formulário LÊ a data da query string, e a valida', () => {
    const form = ler('src/pages/calendar/EventFormPage.jsx');
    assert.ok(form.includes("searchParams.get('data')"));
    // Query string é digitável: `?data=amanhã` não pode virar `value` de um
    // `<input type="date">`.
    assert.ok(form.includes('dataDaChave(daUrl)'), 'a data da URL precisa ser validada');
  });

  test('as duas vistas oferecem o "novo" no dia', () => {
    assert.ok(CALENDARIO.includes('cal-celula__numero'), 'na grade, pelo número do dia');
    assert.ok(CALENDARIO.includes('cal-agenda__novo'), 'na agenda, pelo botão do cabeçalho do dia');
  });
});

describe('Parte 3 — o "+N" e a célula que não estica', () => {
  test('a célula tem altura MÁXIMA no CSS', () => {
    // Um dia com sete itens empurraria as outras semanas para fora da tela, e a
    // advogada perderia a visão do mês por causa do dia mais ocupado dele.
    assert.match(CSS, /\.cal-celula\s*\{[^}]*max-height:/s);
    assert.match(CSS, /\.cal-celula\s*\{[^}]*overflow:\s*hidden/s);
  });

  test('o "+N" abre o dia inteiro', () => {
    assert.ok(CALENDARIO.includes('cal-celula__mais'));
    assert.ok(CALENDARIO.includes('onAbrirDia'));
    assert.ok(CALENDARIO.includes('cal-dia-aberto'));
  });
});

describe('Parte 3 — 360 px: a agenda é o padrão, a grade continua alcançável', () => {
  test('a vista padrão sai da função pura, testada em `grade.test.js`', () => {
    assert.ok(CALENDARIO.includes('vistaPadrao(') && CALENDARIO.includes('window.innerWidth'));
  });

  test('os dois botões de vista existem sempre — a grade não some no celular', () => {
    // "A grade continua alcançável, mas não é o que abre." Escondê-la em 360 px
    // tiraria da advogada uma vista que ela pode querer, mesmo apertada.
    assert.ok(CALENDARIO.includes("vista: 'mes'"));
    assert.ok(CALENDARIO.includes("vista: 'agenda'"));
    assert.equal(
      /cal-vistas[\s\S]{0,400}display:\s*none/.test(CSS),
      false,
      'o seletor de vistas não pode sumir em tela estreita'
    );
  });

  test('o CSS tem o recorte de tela estreita, no breakpoint do projeto', () => {
    assert.ok(CSS.includes('@media (max-width: 767px)'));
  });

  test('a tela larga não é obrigada a abrir na agenda', () => {
    const grade = ler('src/pages/calendar/monthGrid.js');
    assert.ok(grade.includes("largura < LARGURA_DE_TELA_ESTREITA ? 'agenda' : 'mes'"));
  });
});
