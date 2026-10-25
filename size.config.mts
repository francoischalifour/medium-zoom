interface BundleBudget {
  path: string
  maxBytes: number
}

export default [
  { path: 'dist/style.css', maxBytes: 260 },
  { path: 'dist/medium-zoom.esm.js', maxBytes: 3_584 },
  { path: 'dist/medium-zoom.min.js', maxBytes: 3_584 },
  { path: 'dist/pure/index.js', maxBytes: 3_328 },
  { path: 'dist/pure/medium-zoom.min.umd.js', maxBytes: 3_328 },
] satisfies BundleBudget[]
