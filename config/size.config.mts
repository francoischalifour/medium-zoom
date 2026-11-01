interface BundleBudget {
  path: string
  maxBytes: number
}

export default [
  { path: 'dist/core/index.mjs', maxBytes: 2_600 },
  { path: 'dist/core/index.cjs', maxBytes: 2_688 },
  { path: 'dist/features/index.mjs', maxBytes: 1_056 },
  { path: 'dist/features/index.cjs', maxBytes: 1_120 },
  { path: 'dist/pure/index.mjs', maxBytes: 3_584 },
  { path: 'dist/pure/index.cjs', maxBytes: 3_584 },
  { path: 'dist/compat/index.mjs', maxBytes: 3_500 },
  { path: 'dist/compat/index.cjs', maxBytes: 3_500 },
  { path: 'dist/compat/pure/index.mjs', maxBytes: 3_584 },
  { path: 'dist/compat/pure/index.cjs', maxBytes: 3_584 },
  { path: 'dist/modern/index.mjs', maxBytes: 3_456 },
  { path: 'dist/modern/index.cjs', maxBytes: 3_456 },
  { path: 'dist/modern/style.css', maxBytes: 256 },
  { path: 'dist/style.css', maxBytes: 260 },
  { path: 'dist/medium-zoom.esm.js', maxBytes: 3_500 },
  { path: 'dist/medium-zoom.min.js', maxBytes: 3_600 },
  { path: 'dist/pure/index.js', maxBytes: 3_584 },
  { path: 'dist/pure/medium-zoom.min.umd.js', maxBytes: 3_584 },
] satisfies BundleBudget[]
