import { candidateBudgets } from './package.config.mts'
interface BundleBudget {
  path: string
  maxBytes: number
}

// Measured budgets include the adapter/frame preparation. Modern UI capabilities stay optional.
export default [
  ...candidateBudgets,
  { path: 'dist/modern/style.css', maxBytes: 256 },
  { path: 'dist/style.css', maxBytes: 260 },
  { path: 'dist/medium-zoom.esm.js', maxBytes: 3_540 },
  { path: 'dist/medium-zoom.min.js', maxBytes: 3_640 },
  { path: 'dist/pure/index.js', maxBytes: 3_340 },
  { path: 'dist/pure/medium-zoom.min.umd.js', maxBytes: 3_420 },
] satisfies BundleBudget[]

/** A consumer, named as in `scripts/size.ts`, that must ship at most `maxRatio` of another. */
interface SizeRatio {
  consumer: string
  reference: string
  maxRatio: number
}

export const ratios = [
  // The modern preset drops the compat fallbacks, so it must stay measurably smaller.
  { consumer: 'medium-zoom/modern', reference: 'medium-zoom', maxRatio: 0.95 },
] satisfies SizeRatio[]
