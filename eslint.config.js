import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    // As skills de plugin são modelo de MCP guardado no repositório, não código
    // do projeto: varrer aquilo enchia o lint de erros alheios e derrubava o
    // portão do CI. As skills próprias do Beever são markdown e não entram aqui.
    ignores: [
      'node_modules/**',
      'src/public/css/**',
      'docs/legacy/**',
      'venv/**',
      '.github/skills/**',
      '.claude/skills/impeccable/**',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // O documento proíbe console.log em código de produção: use o logger (pino).
      'no-console': ['error', { allow: ['error'] }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  {
    // Scripts de linha de comando podem escrever no stdout.
    files: ['scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },
  {
    // JS servido para o navegador (interatividade das views EJS): globals de
    // browser, não de Node.
    files: ['src/public/js/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-console': 'off' },
  },
];
