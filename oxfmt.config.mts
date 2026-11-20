// A type-only import lets CI run oxfmt without installing the workspace.
import type { OxfmtConfig } from 'oxfmt'

export default {
  singleQuote: true,
  semi: false,
  trailingComma: 'es5',
  arrowParens: 'avoid',
  sortImports: true,
  overrides: [
    {
      files: ['website/src/docs/examples/*.tsx', 'website/src/docs/*.mdx'],
      options: { printWidth: 72 },
    },
  ],
  ignorePatterns: ['CHANGELOG.md', 'bun.lock', '**/dist/**', 'coverage/**', '.cache/**'],
} satisfies OxfmtConfig
