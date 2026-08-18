import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // Sem o eslint-plugin-react (que traz o jsx-uses-vars), o ESLint não
      // liga uma referência em JSX à variável que a declarou: `<Icon />` não
      // conta como uso de `Icon`. Componentes desestruturados de arrays de
      // configuração (`{ icon: Icon }`, `{ Component }`) caem nesse caso e
      // eram reportados como não usados mesmo estando em uso.
      //
      // Identificador em PascalCase é convenção de componente React, então
      // ignorá-lo aqui é seguro. `argsIgnorePattern` é necessário além de
      // `varsIgnorePattern` porque desestruturação em parâmetro de callback
      // conta como argumento, não como variável.
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        argsIgnorePattern: '^[A-Z_]',
      }],
    },
  },

  // ── Contextos que não são o navegador (Fase F-0) ─────────────────────────
  //
  // O bloco acima declara `globals.browser` para todo `**/*.{js,jsx}`, o que
  // inclui dois arquivos que nunca rodam numa aba. Os dois eram tratados por
  // comentário dentro do próprio arquivo — forma que o flat config do ESLint 9
  // já ignora (com aviso) e que o ESLint 10 passa a reportar como erro. A
  // declaração migra para cá, que é onde o flat config a lê de verdade.
  {
    // Configuração e build: rodam em Node, e `vite.config.js` usa
    // `process.cwd()` para a guarda de `VITE_API_URL`.
    //
    // `scripts/**` entrou na F-1b com `checarRoteiro.js`, que confere a
    // numeração do roteiro de validação manual: é utilitário de linha de
    // comando, lê arquivo e escreve em `process.stdout`. Declarar aqui, e não
    // por comentário dentro do arquivo, é o que a F-0 fixou — a forma por
    // comentário o flat config do ESLint 9 já ignora.
    files: ['vite.config.js', 'eslint.config.js', 'scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    // O service worker roda em `ServiceWorkerGlobalScope`: `self`, `caches`,
    // `clients` e `skipWaiting` não existem em `globals.browser`.
    files: ['public/sw.js'],
    languageOptions: { globals: globals.serviceworker },
  },
])
