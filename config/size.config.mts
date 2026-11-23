import { candidateBudgets } from './package.config.mts'
interface BundleBudget {
  path: string
  maxBytes: number
}

// Measured budgets leave a few bytes of headroom. Modern UI capabilities stay optional.
export default [
  ...candidateBudgets,
  { path: 'dist/modern/style.css', maxBytes: 380 },
  { path: 'dist/style.css', maxBytes: 260 },
  { path: 'dist/medium-zoom.esm.js', maxBytes: 3_410 },
  // The website rounds this file's size: under 3,500 B it reads 3 kB, whether Bun or Node
  // compresses it. Their results differ by a few bytes, so stay clear of the boundary.
  { path: 'dist/medium-zoom.min.js', maxBytes: 3_490 },
  { path: 'dist/pure/index.js', maxBytes: 3_200 },
  { path: 'dist/pure/medium-zoom.min.umd.js', maxBytes: 3_290 },
] satisfies BundleBudget[]

/**
 * Import sets measured beyond each preset, each entry on top of core, and every entry
 * together, as `entry/export`.
 */
export const compositions: Record<string, string[]> = {
  'stock gallery': [
    'core/createZoom',
    'loaders/loadHdImage',
    'renderers/dialog',
    'gallery/galleryControls',
    'transitions/slide',
    'triggers/bindZoomTriggers',
  ],
}

/** A consumer, named as in `scripts/size.ts`, that must ship at most `maxRatio` of another. */
interface SizeRatio {
  consumer: string
  reference: string
  maxRatio: number
}

export const ratios = [
  {
    consumer: 'medium-zoom/modern/pure',
    reference: 'medium-zoom/modern',
    maxRatio: 1.03,
  },
] satisfies SizeRatio[]
