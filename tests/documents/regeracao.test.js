// ═══════════════════════════════════════════════════════════════════════════
// REGERAR A PARTIR DAS SEÇÕES — a interface do contrato da 2C (Fase 4.4)
//
// A auditoria da fase encontrou o contrato inteiro no BACKEND, com teste:
// `PATCH /:id/texto` liga `editadoManualmente`; regerar sem
// `confirmarSobrescrita` responde 409; com ela responde 201, o anterior sai por
// soft delete com `substituidoPorId`, e o novo nasce `editadoManualmente:
// false` (`tests/documents/generation.test.js`). Nada disso foi reescrito aqui.
//
// O que faltava era a interface na tela do próprio documento. O que este
// arquivo trava é a parte que é decisão de TELA:
//
//   1. de onde saem os parâmetros da regeração (tudo já gravado no documento);
//   2. quando a tela se recusa a oferecer o botão, e por quê;
//   3. o texto do diálogo de sobrescrita, montado a partir das CHAVES do 409 —
//      nunca por regex sobre a mensagem, que foi como a Fase 1.3 quebrou.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  motivoParaNaoRegerar,
  podeRegerar,
  parametrosDeRegeracao,
  textoDaSobrescrita,
} from '../../src/pages/documents/regeneration.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Documento gerado como `GET /documents/:id` o devolve: `processoId` populado
// (o service faz `.populate("processoId", "titulo numeroProcesso status")`),
// `clienteId` e `honorarioId` crus.
const gerado = (extra = {}) => ({
  _id: 'd1',
  ehModelo: false,
  origem: 'gerado',
  geradoDeModeloId: 'm1',
  processoId: { _id: 'p1', titulo: 'Inventário e Partilha', numeroProcesso: '0001' },
  clienteId: 'c1',
  honorarioId: 'h1',
  editadoManualmente: false,
  ...extra,
});

describe('de onde saem os parâmetros da regeração', () => {
  test('tudo já está gravado no documento — a advogada não redigita nada', () => {
    // É o ponto da funcionalidade: pela tela de montagem ela teria de achar o
    // modelo e reescolher processo e cliente, sabendo de cor quais eram.
    assert.deepEqual(parametrosDeRegeracao(gerado()), {
      modeloId: 'm1',
      processoId: 'p1',
      clienteId: 'c1',
      honorarioId: 'h1',
    });
  });

  test('`processoId` populado vira id, e não `[object Object]`', () => {
    // Mandar o objeto inteiro faria o backend receber um id inválido e
    // responder 400 — com uma mensagem que não explicaria nada.
    const p = parametrosDeRegeracao(gerado());
    assert.equal(typeof p.processoId, 'string');
    assert.equal(p.processoId, 'p1');
  });

  test('cliente e honorário ausentes saem como `undefined`, não como `null`', () => {
    // Aqui não é "apagar campo" — a convenção do `null` do projeto vale para
    // isso. É "não informar", e o backend trata os dois de formas diferentes:
    // `honorarioId` omitido deixa ele escolher quando há um único ativo.
    const p = parametrosDeRegeracao(gerado({ clienteId: null, honorarioId: null }));
    assert.equal(p.clienteId, undefined);
    assert.equal(p.honorarioId, undefined);
    assert.ok(!Object.values(p).includes(null));
  });
});

describe('quando a tela NÃO oferece regerar', () => {
  test('documento sem modelo de origem — e a frase diz o que fazer', () => {
    // Gerado antes de `geradoDeModeloId` existir, ou criado direto por
    // `POST /documents`. Adivinhar o modelo pelo nome geraria a peça errada em
    // silêncio.
    const doc = gerado({ geradoDeModeloId: null });
    assert.equal(podeRegerar(doc), false);
    assert.match(motivoParaNaoRegerar(doc), /não registra de qual modelo/);
    assert.equal(parametrosDeRegeracao(doc), null);
  });

  test('modelo não se regera — se edita na montagem', () => {
    const doc = gerado({ ehModelo: true });
    assert.equal(podeRegerar(doc), false);
    assert.match(motivoParaNaoRegerar(doc), /modelo/i);
  });

  test('documento de upload não tem seções de origem', () => {
    const doc = gerado({ origem: 'upload' });
    assert.equal(podeRegerar(doc), false);
    assert.match(motivoParaNaoRegerar(doc), /upload/i);
  });

  test('sem processo não há o que regerar', () => {
    assert.equal(podeRegerar(gerado({ processoId: null })), false);
  });

  test('cada impedimento tem frase PRÓPRIA', () => {
    // Um "não é possível regerar" genérico deixaria a advogada sem saber se o
    // problema é o documento ou o sistema.
    const frases = new Set([
      motivoParaNaoRegerar(gerado({ ehModelo: true })),
      motivoParaNaoRegerar(gerado({ origem: 'upload' })),
      motivoParaNaoRegerar(gerado({ geradoDeModeloId: null })),
      motivoParaNaoRegerar(gerado({ processoId: null })),
      motivoParaNaoRegerar(null),
    ]);
    assert.equal(frases.size, 5, 'dois impedimentos diferentes com a mesma frase');
  });

  test('documento completo pode regerar', () => {
    assert.equal(motivoParaNaoRegerar(gerado()), null);
    assert.equal(podeRegerar(gerado()), true);
  });
});

describe('o diálogo de sobrescrita sai das chaves do 409', () => {
  // O corpo real do 409, de `documentGenerationService.js`.
  const conflito = (extra = {}) => ({
    documentoId: 'd1',
    dataGeracao: '2026-07-15T00:00:00.000Z',
    editadoManualmente: true,
    sairaDoPortal: false,
    ...extra,
  });

  const formatarData = () => '15/07/2026';

  test('diz que o texto editado será substituído, e que fica recuperável', () => {
    const texto = textoDaSobrescrita(conflito(), { formatarData });
    assert.match(texto, /texto editado à mão será substituído/i);
    assert.match(texto, /recuperável/i);
    assert.match(texto, /15\/07\/2026/, 'a data do 409 precisa aparecer');
  });

  test('a frase do portal só entra quando `sairaDoPortal` é verdadeiro', () => {
    // Dizer "e sai do portal" sobre um documento que nunca esteve lá é
    // informação errada na direção que assusta.
    const fora = textoDaSobrescrita(conflito({ sairaDoPortal: false }), { formatarData });
    assert.doesNotMatch(fora, /portal/i);

    const dentro = textoDaSobrescrita(conflito({ sairaDoPortal: true }), { formatarData });
    assert.match(dentro, /portal do cliente/i);
    assert.match(dentro, /nasce oculto|liberado outra vez/i);
  });

  test('sem data no 409 o texto continua completo, só que sem a data', () => {
    const texto = textoDaSobrescrita({ editadoManualmente: true }, { formatarData });
    assert.match(texto, /substituído/i);
    assert.match(texto, /recuperável/i);
    assert.doesNotMatch(texto, /undefined|null|NaN/);
  });

  test('409 sem corpo estruturado não produz texto quebrado', () => {
    for (const vazio of [null, undefined, {}]) {
      const texto = textoDaSobrescrita(vazio, { formatarData });
      assert.ok(texto.length > 0);
      assert.doesNotMatch(texto, /undefined|null|NaN/);
    }
  });
});

describe('a tela liga tudo isso', () => {
  const fonte = readFileSync(
    resolve(RAIZ, 'src/pages/documents/DocumentFinalTextPage.jsx'),
    'utf8'
  );
  const semComentario = fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  test('delega a regra ao módulo, em vez de reimplementá-la no JSX', () => {
    assert.match(semComentario, /from '\.\/regeneration\.js'/);
    for (const fn of ['motivoParaNaoRegerar', 'parametrosDeRegeracao', 'textoDaSobrescrita']) {
      assert.match(semComentario, new RegExp(fn), `a tela não usa ${fn}`);
    }
  });

  test('o reenvio confirmado leva `confirmarSobrescrita: true`', () => {
    // É o contrato da 2C. Sem essa chave o backend responde 409 de novo, e o
    // diálogo viraria um laço.
    assert.match(semComentario, /confirmarSobrescrita:\s*true/);
  });

  test('o 409 vira diálogo, e não toast', () => {
    // Um toast de erro para um 409 que é PERGUNTA transformaria "quer
    // substituir?" em "deu errado", e a advogada nunca completaria a ação.
    assert.match(semComentario, /status === 409/);
    assert.match(semComentario, /setConflito\(getApiErrorDetails/);
    assert.match(semComentario, /<Modal/);
  });

  test('o corpo do erro continua saindo só pelos helpers', () => {
    // A regra do projeto: `err.response.data` nunca é aberto na tela. Ler o
    // STATUS é outra coisa, legítima, e está travada na allowlist de
    // `tests/financial/estatica.test.js`.
    assert.doesNotMatch(semComentario, /\berr(or)?\??\.response\??\.data\b/);
  });

  test('texto não salvo tem aviso PRÓPRIO, antes do 409', () => {
    // O backend não sabe da edição que ainda está na caixa: não haveria 409
    // nenhum, e a alteração se perderia sem aviso.
    assert.match(semComentario, /avisoDeNaoSalvo/);
    assert.match(semComentario, /sujo/);
  });
});
