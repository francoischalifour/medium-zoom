import { defineConfig } from 'oxlint'

import { extensionEntries } from './config/package.config.mts'

const relative = {
  regex: '^\\.\\.?(/|$)',
  message: 'Use an absolute `@/` import.',
}
type Override = NonNullable<
  Parameters<typeof defineConfig>[0]['overrides']
>[number]
interface Pattern {
  regex: string
  message: string
  allowTypeImports?: boolean
}
const restrict = (files: string[], ...patterns: Pattern[]): Override => ({
  files,
  rules: {
    'no-restricted-imports': ['error', { patterns: [relative, ...patterns] }],
  },
})
const entries = extensionEntries.map(({ name }) => name)
// The boundaries CONTRIBUTING.md describes, as imports each part of `src` may not make.
const boundaries = [
  restrict(['src/zoom/**', 'src/platform/**'], {
    regex: `^(medium-zoom|@/(preset|${entries.join('|')})/)`,
    message: 'Shared mechanics import neither library.',
  }),
  restrict(['src/preset/**'], {
    regex: `^(medium-zoom/|@/(${entries.join('|')})/)`,
    message: 'The v1 library imports only shared mechanics.',
  }),
  ...entries.map(entry =>
    restrict(
      [`src/${entry}/**`],
      {
        regex: '^(#platform$|@/preset/)',
        message:
          'The modern library imports neither the v1 library nor its platform layer.',
      },
      {
        regex: `^@/(${entries.filter(name => name !== entry).join('|')})/`,
        allowTypeImports: true,
        message:
          'Import another entry only for its types: its code belongs to its own bundle.',
      }
    )
  ),
]

export default defineConfig({
  ignorePatterns: ['**/node_modules/**', 'tests/fixtures/next/.next/**'],
  categories: { correctness: 'error' },
  env: { browser: true, node: true },
  globals: { __TEST__: 'readonly' },
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
    ...boundaries,
    {
      // Examples are code to copy, in their own style: lint them for correctness only.
      files: ['examples/**'],
      rules: { curly: 'off', 'typescript/no-floating-promises': 'off' },
    },
  ],
})
