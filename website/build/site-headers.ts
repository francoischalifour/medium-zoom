import type { Plugin } from 'vite'

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
          ...fingerprintedAssetPaths.map(
            assetPath => `/${assetPath}\n  Cache-Control: public, max-age=31536000, immutable`
          ),
          '',
        ].join('\n\n'),
      })
    },
  }
}
