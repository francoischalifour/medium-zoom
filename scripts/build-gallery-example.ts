import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { build, type InlineConfig } from 'vite'

import { candidateAliases } from '../config/vite.shared.config.mts'

export async function buildGalleryExample() {
  const root = resolve('examples/shadcn/tests/experimental')
  await build(config(root, 'production'))
  // A development build, so the component's development warnings can be tested.
  await build(config(root, 'development'))
}

function config(root: string, mode: 'development' | 'production') {
  const pages: Record<string, string> =
    mode === 'production'
      ? {
          index: resolve(root, 'index.html'),
          playground: resolve(root, 'playground.html'),
        }
      : { details: resolve(root, 'details.html') }
  return {
    configFile: false,
    root,
    base: '/composition/',
    logLevel: 'error',
    plugins: [react()],
    resolve: {
      alias: [
        ...candidateAliases,
        // Run the published component's playground against its composable rewrite.
        {
          find: /^.*\/src\/components\/ui\/image-zoom$/,
          replacement: resolve(root, 'image-zoom.tsx'),
        },
      ],
    },
    mode,
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    build: {
      outDir: resolve('.cache/gallery-composition'),
      // The development build adds its page next to the production ones.
      emptyOutDir: mode === 'production',
      minify: mode === 'production',
      rolldownOptions: { input: pages },
    },
  } satisfies InlineConfig
}
