// ═══════════════════════════════════════════════════════════════════════════
// MENSAGENS NA TELA (Fase 4.6)
//
// A suíte não tem DOM. O que se prova aqui é o que a varredura estática alcança
// e que importa: que a lista de pendências é UMA só (compartilhada entre as
// duas telas), que a tela do documento deixou de engolir o 422, e que o aviso
// preventivo consulta o backend antes de gerar.
//
// A renderização em si fica no roteiro manual — mas o defeito que esta fase
// corrige não era de renderização: era a tela **descartar** `errors.pendencias`
// e mostrar só o `message`, que não nomeia nada.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const raiz = new URL('../../src/', import.meta.url).pathname;
const ler = (p) => readFileSync(raiz + p, 'utf8');

// As varreduras do projeto limpam comentários antes de analisar: o comentário
// que EXPLICA um defeito costuma citar o padrão defeituoso, e sem a limpeza ele
// derrubaria a própria asserção que documenta.
const semComentarios = (js) =>
  js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('a lista de pendências é compartilhada', () => {
  test('o componente existe e trata os motivos do vocabulário fechado', () => {
    const comp = semComentarios(ler('components/documents/PendenciaList.jsx'));

    for (const motivo of ['tipoIncompativel', 'tipoHonorarioIncompativel', 'parcelasDesiguais']) {
      assert.ok(
        comp.includes(motivo),
        `o componente precisa conhecer o motivo "${motivo}" para separá-lo de "falta preencher"`
      );
    }

    assert.match(comp, /pendencia\.causa/, 'a causa vinda do backend precisa ser exibida');
    assert.match(comp, /pendencia\.orientacao/, 'a orientação precisa ser exibida');
    assert.match(
      comp, /pendencia\.rotulo/,
      'o RÓTULO é o que a advogada reconhece — nunca montar texto a partir da chave'
    );
  });

  test('as DUAS telas usam o mesmo componente, e nenhuma reimplementa a lista', () => {
    const geracao = semComentarios(ler('components/documents/GenerationPanel.jsx'));
    const documento = semComentarios(ler('pages/documents/DocumentFinalTextPage.jsx'));

    assert.match(geracao, /PendenciaList/, 'a tela de geração usa o componente');
    assert.match(documento, /PendenciaList/, 'a tela do documento usa o componente');

    // Nenhuma das duas pode voltar a montar a lista por conta própria: duas
    // cópias divergiriam justamente nas mensagens, que são o produto da fase.
    for (const [nome, fonte] of [['GenerationPanel', geracao], ['DocumentFinalTextPage', documento]]) {
      assert.ok(
        !/geracao__pendencias-lista/.test(fonte),
        `${nome} voltou a montar a lista de pendências por conta própria`
      );
    }
  });

  test('a folha de estilo acompanha o componente', () => {
    const comp = ler('components/documents/PendenciaList.jsx');
    assert.match(
      comp, /import '\.\/PendenciaList\.css'/,
      'a folha é importada pelo componente que aplica as classes, não pela tela que o monta'
    );
    const css = ler('components/documents/PendenciaList.css');
    for (const classe of ['.pendencia', '.pendencia__causa', '.pendencia--incompativel', '.geracao__pendencias-lista']) {
      assert.ok(css.includes(classe), `${classe} precisa ter regra na folha do componente`);
    }
  });
});

describe('a tela do documento não engole mais o 422', () => {
  const fonte = semComentarios(ler('pages/documents/DocumentFinalTextPage.jsx'));

  test('lê `errors.pendencias` pelo helper, e não `err.response` direto', () => {
    assert.match(
      fonte, /getApiErrorPendencias\(/,
      'o 422 precisa ser lido pelo helper — era descartado antes da Fase 4.6'
    );
    assert.ok(
      !/err\.response\.data/.test(fonte),
      'nenhuma tela abre `err.response.data`: a regra vale desde a Fase 2E.1'
    );
  });

  test('o 422 não cai mais direto no toast genérico', () => {
    // O defeito era exatamente este: `toast.error(getApiErrorMessage(err))` no
    // caminho do 422, com o `message` do backend não nomeando nada.
    const trecho = fonte.slice(fonte.indexOf('const regerar'), fonte.indexOf('const tentarRegerar'));
    assert.match(trecho, /=== 422/, 'o 422 precisa de tratamento próprio antes do toast');
    assert.match(trecho, /setPendencias\(/, 'as pendências precisam ir para o estado, para serem renderizadas');
  });

  test('o estado de pendências é limpo no sucesso', () => {
    // Sem isso, a lista do erro anterior ficaria na tela depois de regerar bem.
    const trecho = fonte.slice(fonte.indexOf('const regerar'), fonte.indexOf('const tentarRegerar'));
    assert.match(trecho, /setPendencias\(\[\]\)/);
  });
});

describe('aviso preventivo de compatibilidade', () => {
  const painel = semComentarios(ler('components/documents/GenerationPanel.jsx'));

  test('consulta a compatibilidade quando modelo e cliente estão escolhidos', () => {
    assert.match(painel, /compatibilidadeModelo\(/, 'a tela precisa consultar a rota');
    assert.match(
      painel, /\[modeloId, clienteId\]/,
      'o efeito depende do modelo E do cliente — antes dos dois não há combinação para checar'
    );
  });

  test('a falha da consulta não bloqueia a geração', () => {
    const trecho = painel.slice(painel.indexOf('compatibilidadeModelo('));
    assert.match(
      trecho.slice(0, 700), /catch/,
      'a consulta é auxiliar: falhar nela não pode impedir gerar — o 422 continua sendo a rede'
    );
  });

  test('o aviso é aviso, não bloqueio — o botão não depende dele', () => {
    const m = painel.match(/const podeGerar = ([^;]+);/);
    assert.ok(m, 'não achei a condição do botão');
    assert.ok(
      !/incompat/.test(m[1]),
      'o botão Gerar não pode depender da compatibilidade: a advogada pode querer gerar e apagar o trecho no texto final'
    );
  });

  test('o serviço de API expõe a rota', () => {
    const api = semComentarios(ler('api/documentService.js'));
    assert.match(api, /modelos\/\$\{modeloId\}\/compatibilidade/);
    assert.match(api, /compatibilidadeModelo,/, 'precisa estar no export default');
  });
});
