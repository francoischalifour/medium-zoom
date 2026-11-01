import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { build as bundle } from 'tsdown'
import { build } from 'vite'

export async function buildGalleryExample() {
  await build({
    configFile: false,
    root: resolve('examples/shadcn/tests/experimental'),
    base: '/composition/',
    logLevel: 'error',
    plugins: [react()],
    resolve: {
      alias: Object.fromEntries(
        ['core', 'features', 'gallery', 'controls', 'renderers', 'session'].map(name => [
          `medium-zoom/${name}`,
          resolve(`dist/${name}/index.mjs`),
        ])
      ),
    },
    build: { outDir: resolve('.cache/gallery-composition'), emptyOutDir: true },
  })
  await bundle({
    config: false,
    clean: false,
    entry: { 'frame-probe': 'tests/experimental/frame-probe.ts' },
    outDir: resolve('.cache/gallery-composition'),
    platform: 'browser',
    target: 'es2020',
    format: 'esm',
    minify: true,
    dts: false,
    logLevel: 'silent',
    alias: { '#platform': resolve('src/platform/modern.ts') },
    outputOptions: { entryFileNames: 'frame-probe.mjs' },
  })
}
