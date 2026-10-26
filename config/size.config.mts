interface BundleBudget {
  path: string
  maxBytes: number
}

export default [
  { path: 'dist/core/index.mjs', maxBytes: 3_200 },
  { path: 'dist/core/index.cjs', maxBytes: 3_328 },
  { path: 'dist/features/index.mjs', maxBytes: 1_152 },
  { path: 'dist/features/index.cjs', maxBytes: 1_216 },
  { path: 'dist/style.css', maxBytes: 260 },
  { path: 'dist/medium-zoom.esm.js', maxBytes: 3_840 },
  { path: 'dist/medium-zoom.min.js', maxBytes: 3_840 },
  { path: 'dist/pure/index.js', maxBytes: 3_584 },
  { path: 'dist/pure/medium-zoom.min.umd.js', maxBytes: 3_584 },
] satisfies BundleBudget[]
