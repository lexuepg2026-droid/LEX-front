/* eslint-env serviceworker */
// ═══════════════════════════════════════════════════════════════════════════
// SERVICE WORKER DO LEX — escrito à mão (Fase 4.5, achado #5)
//
// Sem workbox e sem plugin de Vite: a fase proíbe dependência nova, e o que
// este app precisa cabe em três estratégias. Um gerador traria trinta opções e
// um bundle que ninguém leria — e a decisão mais importante daqui (o que NÃO
// se cacheia) é justamente a que um default não toma por nós.
//
// ── A REGRA QUE MANDA: `/api/*` NUNCA é cacheado ─────────────────────────
// Toda resposta da API é autenticada e pertence a UMA advogada. Um cache de
// resposta autenticada é um vazamento esperando o segundo usuário no mesmo
// navegador: a máquina do escritório, a sessão encerrada, o próximo login. Pior
// ainda num sistema cujo isolamento por `usuarioId` é a regra central.
//
// E não é só leitura: servir dado financeiro velho de cache, sem nada dizendo
// que é velho, é o tipo de erro que faz a advogada planejar o mês com o número
// do mês passado. O SW passa `/api/*` direto para a rede, sempre, e se a rede
// não responder o erro chega à tela — que é onde o app já sabe reagir, com o
// padrão de erro dele.
//
// ── Precache do shell, sem acoplar ao build ──────────────────────────────
// Os assets do Vite têm hash no nome (`index-Brj8qbfL.js`), e este arquivo é
// copiado verbatim de `public/` — ele não pode saber os nomes em tempo de
// escrita. Em vez de gerar a lista no build (o que exigiria plugin ou um passo
// a mais que alguém esqueceria de rodar), o `install` BAIXA o `index.html` e
// extrai dele os `/assets/…` referenciados. A fonte da verdade continua sendo
// o próprio HTML que o servidor entrega, e o SW não precisa ser regenerado a
// cada build.
//
// ── Versionamento ────────────────────────────────────────────────────────
// O nome do cache carrega a versão. Trocar a constante invalida tudo de uma
// vez, e o `activate` apaga o que sobrou. Sem isso, um cache antigo sobrevive
// para sempre no navegador de quem instalou o app uma vez.
// ═══════════════════════════════════════════════════════════════════════════

const VERSAO = "lex-v1";
const CACHE = `${VERSAO}-shell`;

// O mínimo para a casca abrir offline.
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icone-192.png", "/icone-512.png"];

// Extrai os `/assets/...` que o index.html referencia (js, css e o que mais o
// Vite emitir com hash). Regex e não parser: é um HTML gerado por ferramenta,
// com formato estável, e trazer um parser para cá seria a dependência que a
// fase proíbe.
const assetsDoHtml = (html) => {
  const encontrados = new Set();
  const regex = /(?:href|src)\s*=\s*["'](\/assets\/[^"']+)["']/g;
  let m;
  while ((m = regex.exec(html)) !== null) encontrados.add(m[1]);
  return [...encontrados];
};

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      // O shell primeiro: mesmo que a descoberta de assets falhe, a casca fica.
      await cache.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })));

      try {
        const resposta = await fetch("/index.html", { cache: "reload" });
        if (resposta.ok) {
          const assets = assetsDoHtml(await resposta.text());
          // `Promise.allSettled`: um asset que falhe (404 de um chunk lazy que
          // o HTML referencie por preload, por exemplo) não pode abortar a
          // instalação inteira e deixar o app sem SW nenhum.
          await Promise.allSettled(assets.map((u) => cache.add(new Request(u, { cache: "reload" }))));
        }
      } catch {
        // Instalar sem os assets é pior que instalar com o shell só, mas é
        // melhor que não instalar: na primeira navegação online eles entram
        // pelo cache-first do `fetch`.
      }

      // Assume o controle sem esperar a aba ser fechada. O app é de uso
      // contínuo; esperar significaria "a atualização vale semana que vem".
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

const ehNavegacao = (req) =>
  req.mode === "navigate" ||
  (req.method === "GET" && (req.headers.get("accept") || "").includes("text/html"));

const ehAssetImutavel = (url) => url.pathname.startsWith("/assets/");

self.addEventListener("fetch", (evento) => {
  const req = evento.request;

  // Só GET. POST/PATCH/DELETE são escrita, e escrita não se serve de cache.
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Outra origem (fontes do Google, por exemplo): deixa passar sem tocar.
  if (url.origin !== self.location.origin) return;

  // ── `/api/*`: passa direto, NUNCA cacheia. Ver o cabeçalho. ─────────────
  if (url.pathname.startsWith("/api/")) return;

  // ── Assets com hash: cache-first ────────────────────────────────────────
  // O nome muda a cada build, então o conteúdo é imutável por definição: se o
  // arquivo existe no cache, ele está certo. Ir à rede antes seria latência
  // sem nenhuma chance de trazer coisa diferente.
  if (ehAssetImutavel(url)) {
    evento.respondWith(
      (async () => {
        const cacheado = await caches.match(req);
        if (cacheado) return cacheado;

        const resposta = await fetch(req);
        if (resposta.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, resposta.clone());
        }
        return resposta;
      })()
    );
    return;
  }

  // ── Navegação: network-first, com o shell como rede de segurança ────────
  // Network-first e não cache-first porque `index.html` NÃO tem hash: servi-lo
  // do cache primeiro entregaria a casca velha, apontando para assets que o
  // deploy novo já apagou — tela branca depois de atualizar.
  if (ehNavegacao(req)) {
    evento.respondWith(
      (async () => {
        try {
          const resposta = await fetch(req);
          if (resposta.ok) {
            const cache = await caches.open(CACHE);
            cache.put("/index.html", resposta.clone());
          }
          return resposta;
        } catch {
          // Offline: devolve a casca. O app sobe, o roteador monta a tela, e a
          // primeira chamada de API falha — e é ali que o usuário recebe a
          // mensagem, no padrão de erro que as telas já têm. É deliberado que o
          // aviso venha do app, e não de uma página de erro do SW: uma tela
          // "sem conexão" genérica jogaria fora o estado e a navegação.
          const cacheado = (await caches.match("/index.html")) || (await caches.match("/"));
          if (cacheado) return cacheado;
          return new Response("Sem conexão e sem cópia local.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" }
          });
        }
      })()
    );
    return;
  }

  // ── Demais GET de mesma origem (ícones, manifest): network-first ────────
  evento.respondWith(
    (async () => {
      try {
        const resposta = await fetch(req);
        if (resposta.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, resposta.clone());
        }
        return resposta;
      } catch {
        const cacheado = await caches.match(req);
        if (cacheado) return cacheado;
        throw new Error("recurso indisponível offline");
      }
    })()
  );
});
