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
])
