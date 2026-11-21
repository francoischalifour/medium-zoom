import { fileURLToPath } from 'node:url'
export default {
  turbopack: {
    root: fileURLToPath(new URL('../../../', import.meta.url)),
    resolveAlias: {
      'medium-zoom': fileURLToPath(new URL('../../../dist/medium-zoom.esm.js', import.meta.url)),
    },
  },
  poweredByHeader: false,
}
