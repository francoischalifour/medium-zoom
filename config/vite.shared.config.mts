import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

import { candidateEntries } from './package.config.mts'

const fromRoot = (path: string) =>
  fileURLToPath(new URL(`../${path}`, import.meta.url))

// An inline PostCSS config stops Vite searching parent directories up to the home folder.
export const noPostcssLookup = { postcss: {} }

export const libraryConfig = defineConfig({
  css: noPostcssLookup,
  resolve: {
    alias: {
      'medium-zoom': fileURLToPath(
        new URL('../dist/medium-zoom.esm.js', import.meta.url)
      ),
    },
  },
})

/**
 * Resolves the unpublished candidate entries and their stylesheets to the build, as the
 * package would. Anchored, so an entry never captures its stylesheet's subpath.
 */
export const candidateAliases = candidateEntries.flatMap(
  ({ path, esm, stylesheets = [] }) => [
    { find: new RegExp(`^${path}$`), replacement: fromRoot(esm) },
    ...stylesheets.map(({ fileName }) => ({
      find: new RegExp(`^medium-zoom/${fileName.replaceAll('.', '\\.')}$`),
      replacement: fromRoot(`dist/${fileName}`),
    })),
  ]
)
candidateAliases.push({
  find: /^medium-zoom\/pure$/,
  replacement: fromRoot('dist/compat/pure/index.mjs'),
})
