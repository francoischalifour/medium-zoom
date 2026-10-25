import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vite'
import { libraryConfig } from './vite.shared.config.mts'

export default mergeConfig(
  libraryConfig,
  defineConfig({
    root: 'stories',
    base: '/storybook/',
    publicDir: 'images',
    define: { module: '{}' },
    resolve: {
      alias: {
        '@storybook/html': fileURLToPath(
          new URL('./stories/catalogue/registry.ts', import.meta.url)
        ),
      },
    },
    build: {
      outDir: '../website/dist/storybook',
      emptyOutDir: true,
      // Story modules register themselves; retain those calls despite package sideEffects:false.
      rolldownOptions: { input: ['stories/index.html', 'stories/frame.html'], treeshake: false },
    },
  })
)
