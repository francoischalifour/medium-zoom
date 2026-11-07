import { readFileSync } from 'node:fs'

import type { Plugin } from 'vite'

import { siteMarkdownHeaders } from './site-markdown.ts'

// Reads the headers of each exact path in a _headers file; wildcard rules are left to hosting.
export function readExactHeaders(file: string | URL) {
  const headers = new Map<string, Record<string, string>>()
  for (const rule of readFileSync(file, 'utf8').split(/\n{2,}/)) {
    const [path, ...lines] = rule.trim().split('\n')
    if (!path?.startsWith('/') || path.includes('*')) {
      continue
    }
    headers.set(
      path,
      Object.fromEntries(
        lines.map(line => {
          const separator = line.indexOf(':')
          return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
        })
      )
    )
  }
  return headers
}

export function siteHeaders(): Plugin {
  return {
    name: 'medium-zoom-site-headers',
    generateBundle(_options, bundle) {
      // Only Vite's fingerprinted output can stay immutable across deployments.
      const fingerprintedAssetPaths = Object.keys(bundle)
        .filter(assetPath => assetPath.startsWith('assets/') && /-[\w-]{8}\.[^.]+$/.test(assetPath))
        .sort()
      this.emitFile({
        type: 'asset',
        fileName: '_headers',
        source: [
          '/examples/*\n  X-Robots-Tag: noindex, follow',
          '/storybook/*\n  X-Robots-Tag: noindex, follow',
          ...siteMarkdownHeaders(),
          ...fingerprintedAssetPaths.map(
            assetPath => `/${assetPath}\n  Cache-Control: public, max-age=31536000, immutable`
          ),
          '',
        ].join('\n\n'),
      })
    },
  }
}
