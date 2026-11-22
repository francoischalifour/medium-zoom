import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

import {
  candidateAliases,
  noPostcssLookup,
} from '../../config/vite.shared.config.mts'

const fromRoot = (path: string) =>
  fileURLToPath(new URL(`../../${path}`, import.meta.url))

// Candidate subpaths are not published yet, so the playground resolves them to the build.
export default defineConfig({
  root: fromRoot('playground/gallery'),
  publicDir: fromRoot('assets'),
  css: noPostcssLookup,
  resolve: { alias: candidateAliases },
  server: { host: '127.0.0.1' },
})
