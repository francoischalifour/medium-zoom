import { defineConfig } from 'oxlint'

export default defineConfig({
  ignorePatterns: ['**/node_modules/**', 'tests/fixtures/next/.next/**'],
  categories: { correctness: 'error' },
  env: { browser: true, node: true },
  globals: { __TEST__: 'readonly', __PRESET__: 'readonly' },
  rules: {
    curly: ['error', 'all'],
    'unicorn/numeric-separators-style': [
      'error',
      { number: { minimumDigits: 4, groupLength: 3 } },
    ],
    'no-unused-vars': ['error', { caughtErrors: 'none' }],
  },
  options: { typeAware: true },
  overrides: [
    {
      files: ['**/*.ts', '**/*.mts', '**/*.tsx'],
      rules: {
        'typescript/no-floating-promises': 'error',
        'typescript/no-misused-promises': 'error',
        'typescript/await-thenable': 'error',
      },
    },
    {
      files: ['src/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                regex: '^\\.\\.?(/|$)',
                message: 'Use an absolute `@/` import.',
              },
            ],
          },
        ],
      },
    },
    {
      // Examples are code to copy, in their own style: lint them for correctness only.
      files: ['examples/**'],
      rules: { curly: 'off', 'typescript/no-floating-promises': 'off' },
    },
  ],
})
