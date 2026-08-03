// ═══════════════════════════════════════════════════════════════════════════
// VETORES COMPARTILHADOS DA FÓRMULA PERCENTUAL (achado #8 — Fase 4.5)
//
// O par deste arquivo é `tests/financial/percentualVetores.test.js` do
// LEX-back, que exercita os MESMOS vetores contra o hook `pre("validate")` de
// `models/Fee.js`. Aqui eles exercitam `derivarValorHonorario` de
// `utils/feeCalc.js`, que espelha aquela regra na tela.
//
// Duas implementações da mesma conta divergem — é questão de quando, não de se.
// E divergir aqui é silencioso: a tela mostraria um número, o banco gravaria
// outro, cada um correto pelo seu próprio código, e o erro só apareceria quando
// alguém somasse o contrato na calculadora.
//
// A sincronia é garantida pelo SHA-256 do JSON canonicalizado, conferido contra
// a MESMA constante escrita à mão nos dois repos. Editar um lado sem o outro
// derruba as duas suítes.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { derivarValorHonorario, validarHonorario } from '../../src/utils/feeCalc.js';

// Precisa ser IDÊNTICA à do `tests/financial/percentualVetores.test.js` do
// LEX-back.
const HASH_ESPERADO = '4e40cbc9aad0478d7e09d4cff30de5adc0582d62af2ba148ced4284654aa22cb';

const vetores = JSON.parse(
  readFileSync(new URL('../fixtures/percentualVetores.json', import.meta.url), 'utf8')
);

const hashDe = (obj) => createHash('sha256').update(JSON.stringify(obj)).digest('hex');

describe('fórmula do honorário percentual — vetores compartilhados', () => {
  test('os vetores estão sincronizados com os do backend', () => {
    assert.equal(
      hashDe(vetores), HASH_ESPERADO,
      'os vetores mudaram. Atualize tests/fixtures/percentualVetores.json NOS DOIS repositórios ' +
      'e a constante HASH_ESPERADO nos dois arquivos de teste — é isso que impede a fórmula ' +
      'de divergir entre a tela e o banco.'
    );
  });

  test('o arquivo traz vetores suficientes para valer alguma coisa', () => {
    assert.ok(vetores.validos.length >= 10, 'poucos casos válidos');
    assert.ok(vetores.invalidos.length >= 5, 'poucos casos inválidos');
  });

  test('derivarValorHonorario devolve exatamente o `valor` de cada vetor válido', () => {
    for (const caso of vetores.validos) {
      const obtido = derivarValorHonorario(caso.percentual, caso.valorBase);
      assert.equal(
        obtido, caso.valor,
        `${caso.nome}: ${caso.percentual}% de ${caso.valorBase} deveria dar ${caso.valor}, veio ${obtido}`
      );
    }
  });

  test('cada vetor inválido devolve null — a tela exibe "—", nunca "R$ 0,00"', () => {
    for (const caso of vetores.invalidos) {
      const obtido = derivarValorHonorario(caso.percentual, caso.valorBase);
      assert.equal(
        obtido, null,
        `"${caso.nome}" deveria ser conta impossível (null), veio ${obtido}. ` +
        'Zero pareceria um valor combinado.'
      );
    }
  });

  test('os vetores inválidos também são recusados por validarHonorario', () => {
    // `derivarValorHonorario` devolver null é o que a EXIBIÇÃO usa;
    // `validarHonorario` é o que impede o envio. Os dois precisam concordar,
    // senão a tela mostra "—" e deixa salvar assim mesmo.
    for (const caso of vetores.invalidos) {
      const erro = validarHonorario({
        tipo: 'percentual',
        percentual: caso.percentual,
        valorBase: caso.valorBase
      });
      assert.ok(
        erro !== null,
        `"${caso.nome}" passou pela validação de envio — a exibição recusa e o envio deixa passar`
      );
      assert.ok(['percentual', 'valorBase'].includes(erro.campo));
    }
  });

  test('o arredondamento é em centavos, e não depois da divisão', () => {
    // A contraprova da ORDEM da conta.
    //
    // Escolher o caso importa: `1000 * 33.33` dá exatamente 33330 em ponto
    // flutuante, então ali as duas ordens coincidem e o teste não provaria
    // nada — foi o primeiro par que tentei, e a asserção de guarda abaixo o
    // reprovou. `987654.32 * 8.75` cai num valor inexato, e é nele que a ordem
    // aparece: 86419.75299999998 dividindo depois, 86419.75 arredondando antes.
    const PERC = 8.75;
    const BASE = 987654.32;
    const errado = (BASE * PERC) / 100;
    const certo = Math.round(BASE * PERC) / 100;

    assert.notEqual(errado, certo, 'se estes fossem iguais, o teste não provaria a ordem');
    assert.equal(derivarValorHonorario(PERC, BASE), certo);
    assert.notEqual(derivarValorHonorario(PERC, BASE), errado);
  });
});
