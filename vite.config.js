import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// ═══════════════════════════════════════════════════════════════════════════
// GUARDA DE BUILD DE PRODUÇÃO — `VITE_API_URL` (Fase F-0)
//
// O achado que originou esta guarda: `npm run build` saía com sucesso, `lint`
// saía 0 e as duas suítes passavam com o bundle apontando para
// `http://localhost:3001/api` — o fallback de `api/axiosConfig.js` entrando no
// arquivo publicado. Um deploy assim sobe, abre a tela de login e falha em
// TODA requisição, num ambiente onde ninguém tem console para investigar.
//
// Nenhuma verificação existente pegava isso, porque não há nada de errado com
// o código: o defeito é a ausência de uma variável. Por isso a guarda vive no
// build, e não num teste.
//
// Só vale para `command === "build"` em modo produção. `npm run dev` continua
// funcionando sem `.env` nenhum — o fallback existe justamente para isso, e
// exigir configuração para rodar localmente seria atrito sem ganho.
// ═══════════════════════════════════════════════════════════════════════════
const exigirApiUrlNoBuild = () => ({
  name: 'lex-exigir-vite-api-url',
  apply: 'build',
  config(_config, { mode }) {
    if (mode !== 'production') return

    // `loadEnv` com prefixo vazio lê `.env`, `.env.production` e o ambiente do
    // processo, na mesma ordem de precedência que o Vite usará no build. Ler
    // só `process.env` deixaria passar quem configurou por arquivo.
    const env = loadEnv(mode, process.cwd(), '')
    const url = (env.VITE_API_URL ?? '').trim()

    if (url === '') {
      throw new Error(
        '\n\n' +
          '  VITE_API_URL não está definida — o build de produção foi abortado.\n\n' +
          '  Sem ela o bundle sai apontando para http://localhost:3001/api, que é o\n' +
          '  fallback de desenvolvimento. O deploy subiria e falharia em toda\n' +
          '  requisição, sem erro visível no build.\n\n' +
          '  Defina a URL da API (com o prefixo /api) de um destes jeitos:\n\n' +
          '    cp .env.production.example .env.production   # e edite o valor\n' +
          '    VITE_API_URL=https://api.seu-dominio/api npm run build\n\n' +
          '  Em desenvolvimento (npm run dev) nada disso é necessário.\n'
      )
    }
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), exigirApiUrlNoBuild()],
})
