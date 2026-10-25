import { defineConfig } from 'oxlint'

export default defineConfig({
  categories: { correctness: 'error' },
  env: { browser: true, node: true },
  globals: { __TEST__: 'readonly' },
  rules: {
    'unicorn/numeric-separators-style': ['error', { number: { minimumDigits: 4, groupLength: 3 } }],
    'no-unused-vars': ['error', { caughtErrors: 'none' }],
  },
  options: { typeAware: true },
  overrides: [
    { files: ['src/**/*.js'], rules: { 'typescript/no-floating-promises': 'off' } },
    {
      files: ['**/*.ts', '**/*.mts', '**/*.tsx'],
      rules: {
        'typescript/no-floating-promises': 'error',
        'typescript/no-misused-promises': 'error',
        'typescript/await-thenable': 'error',
      },
    },
  ],
})
