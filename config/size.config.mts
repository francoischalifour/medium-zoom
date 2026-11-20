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
  { path: 'dist/medium-zoom.esm.js', maxBytes: 3_520 },
  { path: 'dist/medium-zoom.min.js', maxBytes: 3_620 },
  { path: 'dist/pure/index.js', maxBytes: 3_320 },
  { path: 'dist/pure/medium-zoom.min.umd.js', maxBytes: 3_420 },
] satisfies BundleBudget[]
