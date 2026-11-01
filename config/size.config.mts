interface BundleBudget {
  path: string
  maxBytes: number
}

// Measured budgets include the adapter/frame preparation. Modern UI capabilities stay optional.
export default [
  { path: 'dist/core/index.mjs', maxBytes: 4_096 },
  { path: 'dist/core/index.cjs', maxBytes: 4_096 },
  { path: 'dist/features/index.mjs', maxBytes: 1_984 },
  { path: 'dist/features/index.cjs', maxBytes: 2_048 },
  { path: 'dist/pure/index.mjs', maxBytes: 4_160 },
  { path: 'dist/pure/index.cjs', maxBytes: 4_160 },
  { path: 'dist/compat/index.mjs', maxBytes: 4_416 },
  { path: 'dist/compat/index.cjs', maxBytes: 4_416 },
  { path: 'dist/compat/pure/index.mjs', maxBytes: 4_160 },
  { path: 'dist/compat/pure/index.cjs', maxBytes: 4_160 },
  { path: 'dist/modern/index.mjs', maxBytes: 4_352 },
  { path: 'dist/modern/index.cjs', maxBytes: 4_352 },
  { path: 'dist/modern/style.css', maxBytes: 256 },
  { path: 'dist/renderers/index.mjs', maxBytes: 1_216 },
  { path: 'dist/renderers/index.cjs', maxBytes: 1_280 },
  { path: 'dist/session/index.mjs', maxBytes: 832 },
  { path: 'dist/session/index.cjs', maxBytes: 896 },
  { path: 'dist/gallery/index.mjs', maxBytes: 640 },
  { path: 'dist/gallery/index.cjs', maxBytes: 704 },
  { path: 'dist/controls/index.mjs', maxBytes: 768 },
  { path: 'dist/controls/index.cjs', maxBytes: 832 },
  { path: 'dist/controls/style.css', maxBytes: 320 },
  { path: 'dist/style.css', maxBytes: 260 },
  { path: 'dist/medium-zoom.esm.js', maxBytes: 4_416 },
  { path: 'dist/medium-zoom.min.js', maxBytes: 4_480 },
  { path: 'dist/pure/index.js', maxBytes: 4_160 },
  { path: 'dist/pure/medium-zoom.min.umd.js', maxBytes: 4_288 },
] satisfies BundleBudget[]
