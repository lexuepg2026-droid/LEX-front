# LEX — Frontend

Interface web do LEX (sistema de gestão para prática jurídica), em React + Vite.

O guia de setup completo (backend, `.env`, MongoDB Atlas, seed de dados e login) está no repositório do backend:
**[lexuepg2026-droid/LEX-back](https://github.com/lexuepg2026-droid/LEX-back)**.

## Rodando localmente

```bash
npm install
cp .env.example .env
npm run dev   # http://localhost:5173
```

> O backend precisa estar rodando antes (`http://localhost:3001`) — veja o passo a passo completo no README do repositório `LEX-back`.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `VITE_API_URL` | Não | `http://localhost:3001/api` | URL base da API, já com o prefixo `/api`. |

O `.env` não é versionado; use o `.env.example` como ponto de partida. Sem a
variável, o app cai no padrão de desenvolvimento — então o `npm run dev` local
funciona sem configuração alguma. Em outro ambiente (deploy, backend em outra
porta ou máquina), defina `VITE_API_URL` antes do build: o Vite injeta o valor
em tempo de compilação, alterar depois não tem efeito.
