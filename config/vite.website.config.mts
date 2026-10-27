import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

import mdx from '@mdx-js/rollup'
import react from '@vitejs/plugin-react'
import { defineConfig, mergeConfig } from 'vite'

import { galleryAssets } from '../examples/shadcn/gallery-assets.ts'
import packageJson from '../package.json' with { type: 'json' }
import { docsPlugin } from '../website/build/docs-plugin.ts'
import { siteFonts } from '../website/build/site-fonts.ts'
import { siteHeaders } from '../website/build/site-headers.ts'
import { siteHighlights } from '../website/build/site-highlights.ts'
import { sitePreferences } from '../website/build/site-preferences.ts'
import { siteRedirects } from '../website/build/site-redirects.ts'
import { siteStyles } from '../website/build/site-styles.ts'
import { libraryConfig } from './vite.shared.config.mts'

export default mergeConfig(
  libraryConfig,
  defineConfig({
    define: {
      __MEDIUM_ZOOM_VERSION__: JSON.stringify(packageJson.version),
      __MEDIUM_ZOOM_GZIP_BYTES__: gzipSync(
        readFileSync(new URL('../dist/medium-zoom.min.js', import.meta.url)),
        { level: 9 }
      ).length,
    },
    plugins: [
      {
        name: 'medium-zoom-package-metadata',
        transformIndexHtml(html) {
          return html.replaceAll('__MEDIUM_ZOOM_VERSION__', packageJson.version)
        },
      },
      siteRedirects(),
      docsPlugin(),
      { ...mdx(), enforce: 'pre' },
      react({ include: /\.(jsx|tsx|mdx)$/ }),
      galleryAssets(),
      siteFonts(),
      siteHeaders(),
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
          notFound: fileURLToPath(new URL('../website/404.html', import.meta.url)),
          index: fileURLToPath(new URL('../website/index.html', import.meta.url)),
          react: fileURLToPath(new URL('../website/react.html', import.meta.url)),
        },
      },
    },
  })
)
