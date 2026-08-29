# LEX — Frontend

Interface web do LEX (sistema de gestão para prática jurídica), em React + Vite.

O guia de setup completo (backend, `.env`, MongoDB Atlas, seed de dados e login) está no repositório do backend:
**[lexuepg2026-droid/LEX-back](https://github.com/lexuepg2026-droid/LEX-back)**.

## Rodando localmente

```bash
npm install
cp .env.example .env   # opcional: sem ele o app usa http://localhost:3001/api
npm test               # suíte: sem DOM, sem banco, roda em segundos
npm run dev            # http://localhost:5173
```

> O backend precisa estar rodando antes (`http://localhost:3001`) — veja o passo a passo completo no README do repositório `LEX-back`.

## Variáveis de ambiente

| Variável | Em `npm run dev` | Em `npm run build` | Descrição |
| --- | --- | --- | --- |
| `VITE_API_URL` | opcional (padrão `http://localhost:3001/api`) | **obrigatória** | URL base da API, já com o prefixo `/api`. |

O `.env` não é versionado; use o `.env.example` como ponto de partida. Sem a
variável, o `npm run dev` cai no padrão de desenvolvimento e funciona sem
configuração alguma.

**No build de produção ela é obrigatória e o build FALHA sem ela** (Fase F-0).
Até então o build saía com sucesso embutindo `http://localhost:3001/api` no
bundle: o deploy subia, abria a tela de login e falhava em toda requisição, sem
nada no build acusando. Nem `lint`, nem as suítes pegavam — não há erro no
código, o defeito é a ausência de uma variável.

```bash
cp .env.production.example .env.production   # e edite o valor
# ou, direto:
VITE_API_URL=/api npm run build
```

**Em produção o valor é `/api` — um caminho, e não uma URL.** O site serve a
API na mesma origem, por um rewrite (ver o guia de deploy abaixo e a DEC-061).
Uma URL absoluta de outro domínio faria o cookie de sessão virar cross-site, e
ele passaria a depender de `SameSite=None; Secure` — que parte dos navegadores
e dos bloqueadores recusa.

O Vite injeta o valor em **tempo de compilação**: alterar depois do build não
tem efeito.

---

## Deploy no Render — o passo a passo do dia

> Escrito para ser seguido **sem ler código**, na ordem. Se alguma tela do
> Render não bater exatamente com o que está aqui, o que vale é o **campo**
> descrito, não o nome do botão.
>
> A arquitetura e o porquê de cada decisão estão na **DEC-061**, no `CLAUDE.md`.

### O desenho, em uma frase

Dois serviços — a **API** (Web Service) e o **site** (Static Site) — e um
**rewrite** que faz o site servir `/api/*` no próprio domínio. Para o navegador,
tudo acontece numa origem só: **não há CORS e o cookie de sessão continua sendo
de mesma origem.** O banco continua no MongoDB Atlas.

```
navegador ──► https://<o-site>/dashboard        (arquivos do site)
          └─► https://<o-site>/api/auth/login   ──rewrite──►  https://<a-api>/api/auth/login
```

### Antes de começar, tenha em mãos

- a `MONGO_URI` do Atlas (usuário, senha e o **nome do banco** no fim);
- os dois segredos JWT — cada um gerado com `openssl rand -hex 32`, e
  **diferentes entre si** (a API se recusa a subir se forem iguais);
- no Atlas, **Network Access com `0.0.0.0/0`**: o plano gratuito do Render não
  tem IP de saída fixo.

### Caminho A — pelo Blueprint (recomendado)

1. **Render → Blueprints → New Blueprint Instance**, escolha o repositório
   **LEX-front** e a branch `main`. Ele lê o `render.yaml` da raiz.
2. O Render mostra os dois serviços que vai criar (`lex-uepg-api` e
   `lex-uepg-app`) e **pergunta o valor** de cada variável marcada como
   secreta: `MONGO_URI`, `JWT_SECRET`, `JWT_PORTAL_SECRET` e `CORS_ORIGIN`.
   - Em `CORS_ORIGIN`, se ainda não souber a URL do site, ponha qualquer valor
     e **volte para corrigir** no fim (passo 5).
3. **Apply.** O primeiro build leva alguns minutos.
4. Abra o serviço da **API** e **confira a URL** no topo da página.
   - Se ela **não** for `https://lex-uepg-api.onrender.com`, edite o
     `destination` do rewrite no `render.yaml`, faça commit, e aplique o
     blueprint de novo. É a única linha do arquivo que depende de um valor que
     só existe depois da criação.
5. Abra o serviço do **site**, copie a URL dele, e ponha esse valor em
   `CORS_ORIGIN` no serviço da API (Environment → Save, o que redeploya).

### Caminho B — pelo painel, serviço a serviço

**1. A API — New → Web Service**

| Campo | Valor |
|---|---|
| Repository | `LEX-back` |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Instance Type | `Free` |
| Health Check Path | `/` |

Em **Environment**, uma variável por linha (os valores estão em
`.env.production.example`, no repositório do backend):

| Variável | O quê |
|---|---|
| `NODE_ENV` | `production` |
| `MONGO_URI` | a conexão do Atlas |
| `JWT_SECRET` | segredo dos tokens da advogada |
| `JWT_PORTAL_SECRET` | segredo dos tokens do portal, **diferente do anterior** |
| `CORS_ORIGIN` | a URL do site (preencher no fim) |

**Não configure `PORT`.** O Render injeta a porta certa; fixá-la faz o health
check nunca passar e o deploy fica em "in progress" para sempre.

**2. O site — New → Static Site**

| Campo | Valor |
|---|---|
| Repository | `LEX-front` |
| Branch | `main` |
| Build Command | `npm ci && npm run build` |
| Publish Directory | `dist` |

Em **Environment**: `VITE_API_URL` = **`/api`** (o caminho, não uma URL).

**3. As duas regras de rewrite — no site, aba Redirects/Rewrites**

Na ordem, de cima para baixo:

| # | Source | Destination | Action |
|---|---|---|---|
| 1 | `/api/*` | `https://<a-url-da-api>/api/*` | **Rewrite** |
| 2 | `/*` | `/index.html` | **Rewrite** |

- **É Rewrite, não Redirect.** Redirect trocaria o domínio na barra do
  navegador, e aí o cookie voltaria a ser cross-site — que é exatamente o que
  esta arquitetura existe para evitar.
- **A ordem importa**: o Render aplica a primeira regra que casa, e `/*` casa
  com tudo. Invertidas, toda chamada de API voltaria como o HTML do app.
- A regra 2 é o que faz **F5 numa tela interna** funcionar: o servidor não
  conhece `/dashboard/clientes`, quem conhece é o `react-router`.

### Depois de subir, confira nesta ordem

1. **A API sozinha:** abra `https://<a-url-da-api>/` — precisa responder
   `{"message":"LEX API running"}`.
2. **O site:** abra a URL dele. A tela de login carrega.
3. **Login.** Se falhar, abra o DevTools → Network e olhe a chamada
   `/api/auth/login`: ela precisa sair para o **domínio do site** (e não para o
   da API). Se sair para o da API, o `VITE_API_URL` do build não é `/api`.
4. **F5 depois de logada.** A sessão precisa continuar — é a prova de que o
   cookie foi gravado e volta. Em DevTools → Application → Cookies, o
   `lex-token` aparece **no domínio do site**.
5. **F5 numa tela interna** (`/dashboard/clientes`): precisa carregar a tela, e
   não um 404 — é a regra 2 do rewrite.
6. **Uma tela de cada módulo:** Clientes, Processos, Financeiro, Documentos,
   Agenda. O que se procura é lista que carrega, não pixel.
7. **O roteiro**, seção 38: os passos **252 a 258** existem para esta
   conferência, e são para ser executados **no ar** — validar em `localhost`
   não os substitui.

### ⚠️ A hibernação do plano gratuito

O Web Service gratuito **dorme depois de 15 minutos sem receber requisição**, e
a primeira chamada depois disso leva cerca de **um minuto** para responder
(o Render mostra uma página de carregamento enquanto sobe).

**Antes de qualquer demonstração, abra o sistema alguns minutos antes** e faça
um login. Sem isso, a primeira tela da apresentação fica um minuto parada — e
não há nada na interface que explique o que está acontecendo.

O site (Static Site) **não** hiberna: quem dorme é a API. O sintoma, portanto, é
o app abrir normalmente e a primeira consulta demorar.

O plano gratuito também tem **750 horas de instância por mês** no workspace
inteiro. Um serviço dormindo não consome horas.

## Build e PWA

```bash
npm run build     # gera dist/  — exige VITE_API_URL (ver acima)
npm run preview   # serve o build em http://localhost:4173
```

O LEX é um **PWA instalável** desde a Fase 4.5, escrito à mão — sem workbox e
sem plugin de Vite.

| Peça | Onde | O que faz |
|---|---|---|
| `public/manifest.webmanifest` | copiado para `dist/` | nome, ícones 192/512, `display: standalone`, `start_url: /dashboard` |
| `public/sw.js` | copiado para `dist/` | precache do shell, cache-first nos assets com hash, network-first na navegação |
| `src/registrarSW.js` | entra no bundle | registra o SW **só em produção** (`import.meta.env.PROD`) |

**O service worker NUNCA cacheia `/api/*`.** Toda resposta da API é autenticada
e pertence a uma advogada; um cache dela seria vazamento esperando o segundo
usuário no mesmo navegador. E servir número financeiro velho de cache, sem nada
dizendo que é velho, faria a advogada planejar o mês com o dado do mês passado.

**O SW não roda em desenvolvimento**, de propósito: ele cachearia os módulos que
o Vite serve sem hash, e a tela pararia de refletir o código — sem erro nenhum,
que é o pior modo de falha possível para quem está desenvolvendo.

Para conferir no navegador: `npm run build && npm run preview`, DevTools →
Application → Manifest (instalável) e Service Workers (ativo). Recarregar com a
rede desligada mostra a casca do app; a primeira chamada de API falha e a tela
exibe o erro no padrão do próprio app.
