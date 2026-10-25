import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export const libraryConfig = defineConfig({
  resolve: {
    alias: { 'medium-zoom': fileURLToPath(new URL('./dist/medium-zoom.esm.js', import.meta.url)) },
  },
})
