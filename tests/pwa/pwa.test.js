// ═══════════════════════════════════════════════════════════════════════════
// PWA — manifest, registro e o service worker EXECUTADO (Fase 4.5, achado #5)
//
// A suíte não tem navegador. O que ela pode fazer — e faz aqui — é carregar o
// `sw.js` num `self` falso e DISPARAR eventos de fetch nele, conferindo a
// decisão de roteamento de cada tipo de requisição.
//
// Isso não substitui o DevTools (instalabilidade e ciclo de vida real ficam no
// roteiro manual), mas cobre a regra que mais importa e que um teste de tela
// jamais pegaria: **`/api/*` nunca entra em cache**. Toda resposta da API é
// autenticada e pertence a UMA advogada; um cache dela é vazamento esperando o
// segundo usuário no mesmo navegador.
//
// Verificar isso por leitura ("o arquivo contém `startsWith('/api/')`") provaria
// que a linha existe, não que ela decide. Por isso o SW roda de verdade.
// ═══════════════════════════════════════════════════════════════════════════

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const raiz = new URL('../../', import.meta.url).pathname;
const ler = (p) => readFileSync(raiz + p, 'utf8');

// ── Um `self` mínimo de service worker ────────────────────────────────────
//
// Guarda os listeners e registra tudo que foi para o cache, para as asserções
// perguntarem "o que ele cacheou?" em vez de "o que ele respondeu?".
const montarAmbienteSW = () => {
  const ouvintes = {};
  const cacheado = new Map();       // nome do cache -> Set de URLs
  const requisicoesDeRede = [];

  const fakeCache = (nome) => ({
    addAll: async (reqs) => {
      for (const r of reqs) cacheado.get(nome).add(typeof r === 'string' ? r : r.url);
    },
    add: async (r) => { cacheado.get(nome).add(typeof r === 'string' ? r : r.url); },
    put: async (r, _resp) => { cacheado.get(nome).add(typeof r === 'string' ? r : r.url); },
    match: async () => undefined
  });

  const caches = {
    open: async (nome) => {
      if (!cacheado.has(nome)) cacheado.set(nome, new Set());
      return fakeCache(nome);
    },
    keys: async () => [...cacheado.keys()],
    delete: async (nome) => cacheado.delete(nome),
    match: async () => undefined
  };

  const contexto = {
    self: {
      addEventListener: (nome, fn) => { ouvintes[nome] = fn; },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
      location: { origin: 'https://lex.exemplo' }
    },
    caches,
    fetch: async (req) => {
      const url = typeof req === 'string' ? req : req.url;
      requisicoesDeRede.push(url);
      return {
        ok: true,
        status: 200,
        clone: () => ({ ok: true, status: 200 }),
        text: async () => '<html></html>'
      };
    },
    Request: class { constructor(url, opcoes) { this.url = String(url); this.opcoes = opcoes; } },
    Response: class { constructor(corpo, init) { this.corpo = corpo; Object.assign(this, init); } },
    URL,
    Promise,
    Error,
    Set,
    console
  };
  contexto.globalThis = contexto;

  runInNewContext(ler('public/sw.js'), contexto);

  return { ouvintes, cacheado, requisicoesDeRede, contexto };
};

// Dispara um `fetch` no SW e devolve se ele assumiu a resposta.
const dispararFetch = async (ouvintes, req) => {
  let assumiu = false;
  let promessa = null;

  ouvintes.fetch({
    request: req,
    respondWith: (p) => { assumiu = true; promessa = p; }
  });

  if (promessa) { try { await promessa; } catch { /* offline simulado */ } }
  return assumiu;
};

const requisicao = (url, extra = {}) => ({
  url,
  method: 'GET',
  mode: 'no-cors',
  headers: { get: () => '' },
  ...extra
});

describe('PWA — manifest', () => {
  const manifest = JSON.parse(ler('public/manifest.webmanifest'));

  test('traz os campos que tornam o app instalável', () => {
    assert.ok(manifest.name, 'name');
    assert.ok(manifest.short_name, 'short_name');
    assert.equal(manifest.display, 'standalone');
    assert.ok(manifest.start_url, 'start_url');
    assert.match(manifest.theme_color, /^#[0-9A-Fa-f]{6}$/);
    assert.match(manifest.background_color, /^#[0-9A-Fa-f]{6}$/);
  });

  test('tem ícones 192 e 512 em PNG', () => {
    const tamanhos = manifest.icons.map((i) => i.sizes);
    assert.ok(tamanhos.includes('192x192'), 'o Android exige 192');
    assert.ok(tamanhos.includes('512x512'), 'a tela de abertura exige 512');
    for (const icone of manifest.icons) {
      assert.equal(icone.type, 'image/png');
      assert.ok(icone.src.startsWith('/'), 'caminho absoluto — o app tem rotas aninhadas');
    }
  });

  test('as cores do manifest são as do tema', () => {
    const variaveis = ler('src/styles/variables.css');
    assert.ok(
      variaveis.includes(manifest.theme_color) ||
      variaveis.toLowerCase().includes(manifest.theme_color.toLowerCase()),
      'theme_color precisa ser uma cor do tema, senão a barra do sistema destoa do app'
    );
  });

  test('start_url aponta para uma rota que existe', () => {
    const rotas = ler('src/routes/AppRoutes.jsx');
    assert.equal(manifest.start_url, '/dashboard');
    assert.ok(rotas.includes('"/dashboard"'), 'a rota do start_url precisa existir');
  });

  test('o index.html referencia o manifest, o tema e o ícone', () => {
    // Limpa os comentários antes de analisar, como as demais varreduras
    // estáticas do projeto: o comentário que EXPLICA a remoção do favicon
    // fantasma cita `/vite.svg`, e sem esta limpeza ele derrubaria a própria
    // asserção que documenta — com a saída óbvia sendo apagar a explicação.
    const html = ler('index.html').replace(/<!--[\s\S]*?-->/g, '');

    assert.match(html, /rel="manifest"\s+href="\/manifest\.webmanifest"/);
    assert.match(html, /name="theme-color"/);
    assert.match(html, /rel="icon"[^>]*icone-192\.png/);
    assert.ok(!html.includes('vite.svg'), 'o favicon fantasma /vite.svg saiu na Fase 4.5');
  });
});

describe('PWA — registro do service worker', () => {
  const registro = ler('src/registrarSW.js');

  test('o registro é guardado por import.meta.env.PROD', () => {
    assert.match(
      registro, /import\.meta\.env\.PROD/,
      'sem a guarda, o SW cacheia os módulos do Vite em dev e a tela para de refletir o código'
    );
  });

  test('main.jsx chama o registro', () => {
    const main = ler('src/main.jsx');
    assert.match(main, /registrarSW\(\)/);
  });
});

describe('PWA — o service worker, executado', () => {
  let ambiente;

  before(() => { ambiente = montarAmbienteSW(); });

  test('registra os três ouvintes do ciclo de vida', () => {
    for (const nome of ['install', 'activate', 'fetch']) {
      assert.equal(typeof ambiente.ouvintes[nome], 'function', `falta o ouvinte de ${nome}`);
    }
  });

  // ═════════════════════════════════════════════════════════════════════════
  // A REGRA CENTRAL
  // ═════════════════════════════════════════════════════════════════════════
  test('`/api/*` NÃO é assumido pelo SW — nunca entra em cache', async () => {
    const rotas = [
      '/api/auth/me',
      '/api/clients?page=1',
      '/api/financeiro/resumo',
      '/api/documents/123/download?formato=pdf',
      '/api/portal/processo'
    ];

    for (const rota of rotas) {
      const assumiu = await dispararFetch(
        ambiente.ouvintes,
        requisicao(`https://lex.exemplo${rota}`)
      );
      assert.equal(
        assumiu, false,
        `${rota}: o SW assumiu uma requisição da API. Resposta autenticada em cache é ` +
        'vazamento esperando o segundo usuário no mesmo navegador.'
      );
    }

    const cacheadas = [...ambiente.cacheado.values()].flatMap((s) => [...s]);
    assert.ok(
      !cacheadas.some((u) => u.includes('/api/')),
      `URL de /api/ foi parar no cache: ${cacheadas.filter((u) => u.includes('/api/')).join(', ')}`
    );
  });

  test('escrita (POST/PATCH/DELETE) nunca é assumida', async () => {
    for (const metodo of ['POST', 'PATCH', 'DELETE', 'PUT']) {
      const assumiu = await dispararFetch(
        ambiente.ouvintes,
        requisicao('https://lex.exemplo/assets/index-abc.js', { method: metodo })
      );
      assert.equal(assumiu, false, `${metodo} não pode ser servido de cache`);
    }
  });

  test('requisição de outra origem não é assumida', async () => {
    const assumiu = await dispararFetch(
      ambiente.ouvintes,
      requisicao('https://fonts.googleapis.com/css2?family=Inter')
    );
    assert.equal(assumiu, false, 'fontes do Google seguem o caminho normal do navegador');
  });

  test('asset com hash é assumido (cache-first) e cacheado', async () => {
    const url = 'https://lex.exemplo/assets/index-CfD22H-8.js';
    const assumiu = await dispararFetch(ambiente.ouvintes, requisicao(url));
    assert.equal(assumiu, true, 'assets com hash precisam ser servidos pelo SW');

    const cacheadas = [...ambiente.cacheado.values()].flatMap((s) => [...s]);
    assert.ok(cacheadas.includes(url), 'o asset deveria ter entrado no cache');
  });

  test('navegação é assumida (network-first com o shell de reserva)', async () => {
    const assumiu = await dispararFetch(
      ambiente.ouvintes,
      requisicao('https://lex.exemplo/dashboard/clientes', { mode: 'navigate' })
    );
    assert.equal(assumiu, true, 'a navegação precisa do fallback offline');
  });

  test('o install precacha o shell e descobre os assets do index.html', async () => {
    const amb = montarAmbienteSW();
    let promessa = null;
    amb.ouvintes.install({ waitUntil: (p) => { promessa = p; } });
    await promessa;

    const cacheadas = [...amb.cacheado.values()].flatMap((s) => [...s]);
    for (const alvo of ['/', '/index.html', '/manifest.webmanifest', '/icone-192.png']) {
      assert.ok(
        cacheadas.some((u) => u.endsWith(alvo)),
        `o shell precisa incluir ${alvo} — sem ele o app não abre offline`
      );
    }
  });

  test('o activate apaga caches de versões anteriores', async () => {
    const amb = montarAmbienteSW();
    await amb.contexto.caches.open('lex-v0-shell');
    await amb.contexto.caches.open('lex-v1-shell');

    let promessa = null;
    amb.ouvintes.activate({ waitUntil: (p) => { promessa = p; } });
    await promessa;

    const restantes = await amb.contexto.caches.keys();
    assert.ok(!restantes.includes('lex-v0-shell'), 'o cache da versão antiga tem de sumir');
    assert.ok(restantes.includes('lex-v1-shell'), 'o da versão corrente fica');
  });
});
