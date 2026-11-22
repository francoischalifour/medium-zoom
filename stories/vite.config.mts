import { fileURLToPath } from 'node:url'

import { defineConfig, mergeConfig } from 'vite'

import { libraryConfig } from '../config/vite.shared.config.mts'

export default mergeConfig(
  libraryConfig,
  defineConfig({
    root: fileURLToPath(new URL('.', import.meta.url)),
    base: '/storybook/',
    publicDir: 'images',
    define: { module: '{}' },
    resolve: {
      alias: {
        '@storybook/html': fileURLToPath(
          new URL('catalogue/registry.ts', import.meta.url)
        ),
      },
    },
    build: {
      outDir: '../website/dist/storybook',
      emptyOutDir: true,
      // Story modules register themselves; retain those calls despite package sideEffects:false.
      rolldownOptions: {
        // Absolute paths: the development dependency scan resolves inputs from `root`, not the cwd.
        input: ['index.html', 'frame.html'].map(page =>
          fileURLToPath(new URL(page, import.meta.url))
        ),
        treeshake: false,
      },
    },
  })
)
