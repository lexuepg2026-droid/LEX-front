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
VITE_API_URL=https://api.seu-dominio/api npm run build
```

O Vite injeta o valor em **tempo de compilação**: alterar depois do build não
tem efeito.

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
