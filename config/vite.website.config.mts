import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { libraryConfig } from './vite.shared.config.mts'
import { siteHighlights } from '../website/build/site-highlights.ts'
import { sitePreferences } from '../website/build/site-preferences.ts'
import { siteFonts } from '../website/build/site-fonts.ts'
import { galleryAssets } from '../examples/shadcn/gallery-assets.ts'

export default mergeConfig(
  libraryConfig,
  defineConfig({
    plugins: [react(), galleryAssets(), siteFonts(), sitePreferences(), siteHighlights()],
    envDir: fileURLToPath(new URL('../', import.meta.url)),
    root: fileURLToPath(new URL('../website/', import.meta.url)),
    build: {
      rolldownOptions: {
        input: {
          index: fileURLToPath(new URL('../website/index.html', import.meta.url)),
          shadcn: fileURLToPath(new URL('../website/examples/shadcn/index.html', import.meta.url)),
        },
      },
    },
  })
)
