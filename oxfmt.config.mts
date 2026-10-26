import { defineConfig } from 'oxfmt'

export default defineConfig({
  singleQuote: true,
  semi: false,
  trailingComma: 'es5',
  arrowParens: 'avoid',
  overrides: [
    {
      files: ['website/src/docs/examples/*.tsx', 'website/src/docs/*.mdx'],
      options: { printWidth: 72 },
    },
  ],
  ignorePatterns: ['CHANGELOG.md', 'bun.lock', '**/dist/**', 'coverage/**', '.cache/**'],
})
