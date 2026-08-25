// ═══════════════════════════════════════════════════════════════════════════
// DEC-055 NA TELA — a metade visível da decisão
//
// O backend já prova que a derivada não é gravada (`tests/calendar/dec055.js`
// do lex-backend). Aqui prova-se o outro lado, que é o que a advogada vive:
//
//   1. a derivada NÃO abre formulário — ela LEVA à parcela;
//   2. as duas naturezas se distinguem no relance, e a LEGENDA diz qual é qual;
//   3. nenhuma tela monta rótulo de tipo por conta própria.
//
// Sem a tela, a regra existiria só no servidor — e a advogada não teria como
// saber por que uma linha abre um formulário e a outra a leva embora.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  LEGENDA,
  NATUREZAS,
  TIPO_EVENTO_OPTIONS,
  classeDaNatureza,
  destinoDoItem,
  rotuloDaNatureza,
  rotuloDoTipoDeEvento,
  MOTIVO_DA_DERIVADA_NAO_EDITAVEL,
} from '../../src/utils/calendarLabels.js';

const ler = (caminho) =>
  readFileSync(fileURLToPath(new URL(`../../${caminho}`, import.meta.url)), 'utf8');

const CALENDARIO = 'src/pages/calendar/CalendarPage.jsx';
const FORMULARIO = 'src/pages/calendar/EventFormPage.jsx';
const ROTULOS = 'src/utils/calendarLabels.js';

const evento = (extra = {}) => ({
  _id: 'e1', natureza: 'evento', titulo: 'Audiência', data: '2026-09-15',
  editavelNoCalendario: true, ...extra,
});
const derivada = (extra = {}) => ({
  _id: 'p1', natureza: 'derivada', origem: 'parcela', titulo: 'Parcela 1 de 3',
  data: '2026-09-10', feeId: 'f1', editavelNoCalendario: false, ...extra,
});

describe('DEC-055 — clicar na derivada LEVA à parcela; ela não se edita aqui', () => {
  test('a derivada de PARCELA leva ao formulário da parcela', () => {
    assert.equal(destinoDoItem(derivada()), '/dashboard/parcelas/editar/p1');
  });

  test('a derivada de HONORÁRIO leva ao formulário do honorário', () => {
    assert.equal(
      destinoDoItem(derivada({ origem: 'honorario', _id: 'f9' })),
      '/dashboard/honorarios/editar/f9'
    );
  });

  test('o evento próprio leva ao formulário do EVENTO — e não à parcela', () => {
    const destino = destinoDoItem(evento());
    assert.equal(destino, '/dashboard/agenda/editar/e1');
    assert.equal(destino.includes('/parcelas/'), false);
  });

  test('NENHUM destino de derivada aponta para a agenda', () => {
    // É a asserção que trava a regra pelo lado que importa: no dia em que
    // alguém "unificar" os destinos, a derivada passaria a abrir um formulário
    // de evento — e editar a data ali criaria a segunda fonte que a DEC-055
    // proíbe.
    for (const origem of ['parcela', 'honorario']) {
      const destino = destinoDoItem(derivada({ origem }));
      assert.equal(
        destino.startsWith('/dashboard/agenda'),
        false,
        `a derivada de ${origem} não pode abrir a agenda`
      );
    }
  });

  test('a tela AVISA por que a derivada não se edita ali', () => {
    // Uma linha que se comporta diferente sem explicação é lida como tela
    // quebrada. A frase diz a regra E o caminho.
    assert.match(MOTIVO_DA_DERIVADA_NAO_EDITAVEL, /não se edita na agenda/);
    assert.match(MOTIVO_DA_DERIVADA_NAO_EDITAVEL, /Abra a parcela/);

    const tela = ler(CALENDARIO);
    assert.ok(
      tela.includes('MOTIVO_DA_DERIVADA_NAO_EDITAVEL'),
      'a tela precisa exibir o motivo, e não só desviar em silêncio'
    );
  });

  test('a tela não tem input de data para item de calendário', () => {
    const tela = ler(CALENDARIO);
    // Um campo de data editável na grade seria a segunda fonte voltando pela
    // porta da interface. Mudar vencimento se faz onde o vencimento mora.
    assert.equal(
      /type=["']date["']/.test(tela),
      false,
      'o calendário não edita data — quem edita é o formulário de origem'
    );
  });

  test('o destino de um item sem natureza conhecida é `null`', () => {
    // A tela então não faz a linha parecer clicável. Um clique que não leva a
    // lugar nenhum ensina que aquela linha não responde, e a advogada para de
    // tentar nas que respondem.
    assert.equal(destinoDoItem({ natureza: 'outra', _id: 'x' }), null);
    assert.equal(destinoDoItem(null), null);
    assert.equal(destinoDoItem(derivada({ origem: 'inventada' })), null);
  });
});

describe('DEC-055 — as duas naturezas se distinguem no relance, com LEGENDA', () => {
  test('as duas naturezas têm classe DIFERENTE', () => {
    assert.notEqual(classeDaNatureza('evento'), classeDaNatureza('derivada'));
  });

  test('a legenda tem as duas, e cada uma diz o que é', () => {
    assert.equal(LEGENDA.length, 2);
    const valores = LEGENDA.map((n) => n.valor).sort();
    assert.deepEqual(valores, ['derivada', 'evento']);

    for (const n of LEGENDA) {
      assert.ok(n.rotulo && n.rotulo.length > 0, 'toda natureza tem nome');
      assert.ok(n.legenda && n.legenda.length > 0, 'toda natureza é explicada');
    }
  });

  test('a legenda da derivada diz DE ONDE ela vem e PARA ONDE ir', () => {
    assert.match(NATUREZAS.derivada.legenda, /financeiro/i);
    assert.match(NATUREZAS.derivada.legenda, /parcela/i);
  });

  test('a tela RENDERIZA a legenda — a cor sozinha não basta', () => {
    const tela = ler(CALENDARIO);
    assert.ok(tela.includes('LEGENDA'), 'a legenda tem de estar na tela');
    assert.ok(tela.includes('cal-legenda'), 'e ter marcação própria');
  });

  test('a distinção NÃO é só por cor: há segundo sinal na marca', () => {
    const css = ler('src/pages/calendar/CalendarPage.css');
    // Quem não distingue verde de âmbar não recebe distinção nenhuma — e é a
    // mesma pessoa que não recebe a informação de que uma das linhas não se
    // edita. O listrado da derivada é o segundo sinal.
    assert.ok(
      css.includes('repeating-linear-gradient'),
      'a derivada precisa de um sinal que não dependa de enxergar cor'
    );
    assert.ok(css.includes('border-style: dashed'), 'e a borda tracejada é o terceiro');
  });

  test('o nome da natureza vai no texto acessível, e não só na cor', () => {
    const tela = ler(CALENDARIO);
    assert.ok(tela.includes('rotuloDaNatureza'), 'quem lê por áudio não recebe a cor');
    assert.equal(rotuloDaNatureza('evento'), 'Compromisso');
    assert.equal(rotuloDaNatureza('derivada'), 'Vencimento');
  });
});

describe('F-3 — nenhuma tela monta rótulo de tipo por conta própria', () => {
  test('os rótulos saem do ponto único, e o backend manda `tipoRotulo` pronto', () => {
    assert.equal(rotuloDoTipoDeEvento('audiencia'), 'Audiência');
    assert.equal(rotuloDoTipoDeEvento('prazo'), 'Prazo');
    assert.equal(rotuloDoTipoDeEvento('reuniao'), 'Reunião');
    assert.equal(rotuloDoTipoDeEvento('outro'), 'Outro');
    // Valor desconhecido degrada legível, e não vira `undefined` numa frase.
    assert.equal(rotuloDoTipoDeEvento('pericia'), '—');
  });

  test('as telas NÃO capitalizam string crua de enum', () => {
    // Foi o que a tela de processos fazia com o `status`, e é como
    // "parcialmente_pago" chegou a aparecer com sublinhado na interface.
    for (const caminho of [CALENDARIO, FORMULARIO]) {
      const tela = ler(caminho);
      assert.equal(
        /\.charAt\(0\)\.toUpperCase\(\)/.test(tela),
        false,
        `${caminho} capitaliza string crua`
      );
      assert.equal(
        /replace\(['"]_['"]/.test(tela),
        false,
        `${caminho} troca sublinhado por espaço — rótulo montado à mão`
      );
    }
  });

  test('o formulário usa a lista do ponto único, e não uma sua', () => {
    const tela = ler(FORMULARIO);
    assert.ok(tela.includes('TIPO_EVENTO_OPTIONS'));
    // E não escreve os rótulos à mão em nenhum `<option>`.
    assert.equal(
      /<option[^>]*>\s*Audiência\s*<\/option>/.test(tela),
      false,
      'os rótulos não são escritos no JSX'
    );
  });

  test('a lista de tipos NÃO divergiu do backend', () => {
    // O espelho é sem endpoint, de propósito (é constante, não dado). O preço é
    // a duplicação, e este teste é o que a torna aceitável.
    const backend = readFileSync(
      fileURLToPath(new URL('../../../lex-backend/src/config/tiposEvento.js', import.meta.url)),
      'utf8'
    );

    const doBackend = [...backend.matchAll(/valor:\s*"([a-z]+)"/g)].map((m) => m[1]);
    const doFrontend = TIPO_EVENTO_OPTIONS.map((o) => o.value);

    assert.deepEqual(
      doFrontend,
      doBackend,
      'os valores do enum divergiram entre os repos — o POST voltaria 400'
    );
  });

  test('o vocabulário está marcado como PENDENTE DE RATIFICAÇÃO', () => {
    // Os quatro valores saíram do enunciado da fase, não da Laís. A marca não é
    // formalidade: a F-2d aprendeu que um enum inventado por nós sobrevive fases
    // inteiras parecendo decidido.
    const fonte = ler(ROTULOS);
    assert.match(fonte, /PENDENTE DE RATIFICAÇÃO/);
  });
});

describe('F-3 — a tela não constrói `Date` a partir da data do item', () => {
  test('nem o calendário nem o formulário fazem `new Date(` sobre a data', () => {
    for (const caminho of [CALENDARIO, FORMULARIO, 'src/api/calendarService.js', 'src/api/eventService.js']) {
      const fonte = ler(caminho).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
      assert.equal(
        /new Date\(\s*(item|e|evento|dados)?\.?data/.test(fonte),
        false,
        `${caminho} constrói Date a partir da data — é onde o dia se desloca`
      );
    }
  });

  test('a data vai e volta como string no formulário', () => {
    const tela = ler(FORMULARIO);
    // `<input type="date">` fala `AAAA-MM-DD` nativamente. É o encaixe que
    // fecha a decisão de fuso de ponta a ponta.
    assert.ok(/type="date"/.test(tela));
    assert.ok(tela.includes('name="data"'));
  });
});
