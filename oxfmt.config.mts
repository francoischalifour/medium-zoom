import { defineConfig } from 'oxfmt'

export default defineConfig({
  singleQuote: true,
  semi: false,
  trailingComma: 'es5',
  arrowParens: 'avoid',
  ignorePatterns: ['CHANGELOG.md', 'bun.lock', '**/dist/**', 'coverage/**', '.cache/**'],
})
