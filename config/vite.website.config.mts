import { fileURLToPath } from 'node:url'

import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import { defineConfig, mergeConfig } from 'vite'

import { galleryAssets } from '../examples/shadcn/gallery-assets.ts'
import { docsPlugin } from '../website/build/docs-plugin.ts'
import { siteFonts } from '../website/build/site-fonts.ts'
import { siteHighlights } from '../website/build/site-highlights.ts'
import { sitePreferences } from '../website/build/site-preferences.ts'
import { siteRedirects } from '../website/build/site-redirects.ts'
import { siteStyles } from '../website/build/site-styles.ts'
import { libraryConfig } from './vite.shared.config.mts'

export default mergeConfig(
  libraryConfig,
  defineConfig({
    plugins: [
      siteRedirects(),
      docsPlugin(),
      { ...mdx(), enforce: 'pre' },
      react({ include: /\.(jsx|tsx|mdx)$/ }),
      galleryAssets(),
      siteFonts(),
      siteStyles(),
      sitePreferences(),
      siteHighlights(),
    ],
    resolve: {
      alias: {
        '@/components/ui/image-zoom': fileURLToPath(
          new URL('../examples/shadcn/src/components/ui/image-zoom.tsx', import.meta.url)
        ),
      },
    },
    envDir: fileURLToPath(new URL('../', import.meta.url)),
    root: fileURLToPath(new URL('../website/', import.meta.url)),
    build: {
      // Prerendered content must be styled before its hydration chunk loads.
      cssCodeSplit: false,
      rolldownOptions: {
        input: {
          index: fileURLToPath(new URL('../website/index.html', import.meta.url)),
          react: fileURLToPath(new URL('../website/react.html', import.meta.url)),
        },
      },
    },
  })
)
