// ═══════════════════════════════════════════════════════════════════════════
// A FOLHA DA MONTAGEM — o bug da Fase 4.4 e a regressão que ele deixa
//
// ── O defeito ──────────────────────────────────────────────────────────────
// Adicionar uma seção gravava no banco (o POST devolvia 201), a releitura
// trazia a lista nova do servidor — e a folha A4 continuava mostrando o estado
// do carregamento inicial. Sem erro, sem toast, sem nada no console.
//
// A causa não estava na rede nem no backend. Uma reprodução por HTTP da
// sequência inteira (POST sem ordem, POST com ordem, PATCH reordenar, DELETE)
// mostrou o servidor correto em todos os passos, com `secaoId` populado e
// `ordem` certa. O defeito era a SENTINELA DE MONTAGEM da tela:
//
//     const montado = useRef(true);
//     useEffect(() => () => { montado.current = false; }, []);   ← corpo vazio
//
// O `<React.StrictMode>` monta, desmonta e monta de novo em desenvolvimento. A
// limpeza escrevia `false`, o corpo do efeito não escrevia nada, e a sentinela
// ficava presa em `false` com a tela viva. Todo `if (montado.current) setX(...)`
// virava no-op.
//
// ── O que este arquivo trava ───────────────────────────────────────────────
// 1. O ciclo de vida da sentinela, rodado na mesma ordem que o React usa.
// 2. Que a lista que ALIMENTA O PREVIEW contém o item novo, na ordem certa,
//    a partir do envelope real que a rota devolve.
// 3. As operações irmãs — remover e reordenar —, que compartilhavam a cadeia.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { simularSentinela } from '../../src/hooks/useIsMounted.js';
import {
  listaDeVinculos,
  idsDasSecoes,
  idsNaOrdem,
  reordenarLocal,
  removerLocal,
  secaoIdDe,
} from '../../src/pages/documents/assemblyState.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Envelope real de `GET /documents/:id/secoes`, copiado da reprodução por HTTP
// feita no diagnóstico da fase. `secaoId` vem populado e `data` já vem ordenado
// por `ordem` — é o backend que ordena, nunca a tela.
const vinculo = (ordem, id, titulo) => ({
  _id: `v${ordem}`,
  ordem,
  ativo: true,
  secaoId: { _id: id, titulo, tipo: 'outro', texto: `Texto de ${titulo}.` },
});

const envelope = (itens) => ({
  data: { data: itens, total: itens.length, page: 1, limit: itens.length, totalPages: 1 },
});

describe('sentinela de montagem — o ciclo de vida que quebrou', () => {
  test('a sentinela sobrevive ao monta-desmonta-monta do StrictMode', () => {
    // A sequência exata do React em desenvolvimento.
    const { ref, efeito } = simularSentinela();

    assert.equal(ref.current, true, 'render inicial');

    const limpar1 = efeito();
    assert.equal(ref.current, true, 'depois do primeiro efeito');

    limpar1(); // desmonte SIMULADO do StrictMode
    assert.equal(ref.current, false, 'a limpeza precisa negar a montagem');

    efeito(); // remontagem
    assert.equal(
      ref.current,
      true,
      'AQUI estava o bug: a sentinela ficava presa em `false` com a tela viva, ' +
      'e todo setState guardado virava no-op silencioso'
    );
  });

  test('o desmonte de verdade continua negando a montagem', () => {
    // A correção não pode ter desligado a proteção que a sentinela existe para
    // dar: setState depois do unmount real continua barrado.
    const { ref, efeito } = simularSentinela();
    const limpar = efeito();
    limpar();
    assert.equal(ref.current, false);
  });

  test('a tela usa o hook, e não duas linhas escritas à mão', () => {
    // Varredura estática: o defeito era reescrever o padrão de memória. Se
    // alguém voltar a fazê-lo nesta tela, cai aqui.
    const fonte = readFileSync(
      resolve(RAIZ, 'src/pages/documents/DocumentAssemblyPage.jsx'),
      'utf8'
    );
    assert.match(fonte, /useIsMounted/, 'a tela deixou de usar o hook');
    assert.doesNotMatch(
      fonte.replace(/\/\/.*$/gm, ''),
      /useRef\(true\)/,
      'voltou a existir uma sentinela escrita à mão na tela'
    );
  });
});

describe('a lista que alimenta a folha', () => {
  test('lê o envelope de listagem e devolve os vínculos ordenados', () => {
    const itens = [vinculo(1, 's1', 'Qualificação'), vinculo(2, 's2', 'Objeto')];
    const lista = listaDeVinculos(envelope(itens));

    assert.equal(lista.length, 2);
    assert.deepEqual(lista.map((v) => v.ordem), [1, 2]);
    assert.equal(lista[0].secaoId.titulo, 'Qualificação');
  });

  test('devolve SEMPRE array — resposta estranha não quebra o `.map` do canvas', () => {
    for (const bicho of [undefined, null, {}, { data: null }, { data: { data: 'nada' } }]) {
      assert.deepEqual(listaDeVinculos(bicho), [], JSON.stringify(bicho));
    }
  });

  test('lista vazia continua vazia — `[]` não cai no fallback do `??`', () => {
    // `[] ?? x` é `[]`, e é o que precisa acontecer: documento sem seção tem de
    // renderizar o estado "a folha está em branco", não o corpo do envelope.
    assert.deepEqual(listaDeVinculos(envelope([])), []);
  });

  // ── A REGRESSÃO DA FASE ──────────────────────────────────────────────────
  test('após adicionar uma seção, a lista da folha contém o item novo, na ordem certa', () => {
    // Estado da folha no carregamento: uma seção.
    const antes = listaDeVinculos(envelope([vinculo(1, 's1', 'Qualificação')]));
    assert.equal(antes.length, 1);

    // "Adicionar" → POST sem `ordem` → o backend anexa ao fim → a tela relê.
    // Este envelope é o que o servidor devolveu de verdade na reprodução.
    const depois = listaDeVinculos(
      envelope([vinculo(1, 's1', 'Qualificação'), vinculo(2, 's2', 'Objeto')])
    );

    assert.equal(depois.length, 2, 'a seção nova não chegou à lista da folha');
    assert.deepEqual(
      depois.map((v) => v.secaoId.titulo),
      ['Qualificação', 'Objeto'],
      'a seção nova precisa entrar no FIM'
    );
    assert.ok(
      idsDasSecoes(depois).has('s2'),
      'a miniatura da biblioteca não seria marcada como usada'
    );
  });

  test('"Inserir aqui" com ordem=1 põe a seção nova no COMEÇO', () => {
    // O empurrão de posição é regra do backend; a tela relê e só exibe. A
    // resposta abaixo é a da reprodução: inserir com ordem=1 empurrou a
    // existente para a ordem 2.
    const depois = listaDeVinculos(
      envelope([vinculo(1, 's2', 'Objeto'), vinculo(2, 's1', 'Qualificação')])
    );
    assert.deepEqual(depois.map((v) => v.secaoId.titulo), ['Objeto', 'Qualificação']);
  });
});

describe('as operações irmãs — remover e reordenar', () => {
  const tres = [
    vinculo(1, 's1', 'Qualificação'),
    vinculo(2, 's2', 'Objeto'),
    vinculo(3, 's3', 'Encerramento'),
  ];

  test('reordenar move o bloco e preserva o conjunto', () => {
    const movido = reordenarLocal(tres, 2, 0);
    assert.deepEqual(movido.map(secaoIdDe), ['s3', 's1', 's2']);
    assert.equal(movido.length, 3, 'reordenar é permutar — não some nem entra ninguém');
  });

  test('reordenar fora da faixa devolve a MESMA lista, sem cópia', () => {
    // Devolver cópia num movimento inválido marcaria o estado como sujo sem
    // nada ter mudado, e dispararia uma requisição de reordenação inútil.
    assert.equal(reordenarLocal(tres, 0, 0), tres);
    assert.equal(reordenarLocal(tres, -1, 1), tres);
    assert.equal(reordenarLocal(tres, 0, 9), tres);
  });

  test('o corpo do PATCH sai na ordem da folha e com todas as seções', () => {
    // `reordenarSecoes` exige exatamente as seções vinculadas: faltando ou
    // sobrando, o backend responde 400.
    const ids = idsNaOrdem(reordenarLocal(tres, 0, 2));
    assert.deepEqual(ids, ['s2', 's3', 's1']);
    assert.equal(new Set(ids).size, 3, 'id repetido no corpo do PATCH');
  });

  test('remover tira pelo id da SEÇÃO, que é o que a rota recebe', () => {
    const restante = removerLocal(tres, 's2');
    assert.deepEqual(restante.map(secaoIdDe), ['s1', 's3']);
  });

  test('o id da seção é lido com `secaoId` populado ou cru', () => {
    // A listagem popula; nada obriga toda resposta a popular. Comparar objeto
    // com string devolveria `false` para o mesmo vínculo, em silêncio.
    assert.equal(secaoIdDe({ secaoId: { _id: 'abc' } }), 'abc');
    assert.equal(secaoIdDe({ secaoId: 'abc' }), 'abc');
    assert.equal(secaoIdDe({}), '');
    assert.equal(removerLocal([{ secaoId: 'abc' }], 'abc').length, 0);
  });
});
