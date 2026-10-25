import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vite'
import { libraryConfig } from './vite.shared.config.mts'

export default mergeConfig(
  libraryConfig,
  defineConfig({
    root: fileURLToPath(new URL('../website/', import.meta.url)),
  })
)
