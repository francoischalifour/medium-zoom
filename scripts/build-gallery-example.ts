import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { build } from 'vite'

import { extensionEntries } from '../config/package.config.mts'

export async function buildGalleryExample() {
  const root = resolve('examples/shadcn/tests/experimental')
  await build({
    configFile: false,
    root,
    base: '/composition/',
    logLevel: 'error',
    plugins: [react()],
    resolve: {
      alias: [
        ...extensionEntries.map(entry => ({
          find: entry.path,
          replacement: resolve(entry.esm),
        })),
        {
          find: /^.*\/src\/components\/ui\/image-zoom$/,
          replacement: resolve(root, 'image-zoom.tsx'),
        },
      ],
    },
    build: {
      outDir: resolve('.cache/gallery-composition'),
      emptyOutDir: true,
      rolldownOptions: {
        input: {
          index: resolve(root, 'index.html'),
          playground: resolve(root, 'playground.html'),
        },
      },
    },
  })
}
