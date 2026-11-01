interface BundleBudget {
  path: string
  maxBytes: number
}

// Measured budgets include the adapter/frame preparation. Modern UI capabilities stay optional.
export default [
  { path: 'dist/core/index.mjs', maxBytes: 3_800 },
  { path: 'dist/core/index.cjs', maxBytes: 3_800 },
  { path: 'dist/loaders/index.mjs', maxBytes: 832 },
  { path: 'dist/loaders/index.cjs', maxBytes: 896 },
  { path: 'dist/viewport/index.mjs', maxBytes: 448 },
  { path: 'dist/viewport/index.cjs', maxBytes: 512 },
  { path: 'dist/content/index.mjs', maxBytes: 320 },
  { path: 'dist/content/index.cjs', maxBytes: 320 },
  { path: 'dist/triggers/index.mjs', maxBytes: 832 },
  { path: 'dist/triggers/index.cjs', maxBytes: 896 },
  { path: 'dist/pure/index.mjs', maxBytes: 4_192 },
  { path: 'dist/pure/index.cjs', maxBytes: 4_192 },
  { path: 'dist/compat/index.mjs', maxBytes: 4_416 },
  { path: 'dist/compat/index.cjs', maxBytes: 4_416 },
  { path: 'dist/compat/pure/index.mjs', maxBytes: 4_192 },
  { path: 'dist/compat/pure/index.cjs', maxBytes: 4_192 },
  { path: 'dist/modern/index.mjs', maxBytes: 4_384 },
  { path: 'dist/modern/index.cjs', maxBytes: 4_384 },
  { path: 'dist/modern/style.css', maxBytes: 256 },
  { path: 'dist/renderers/index.mjs', maxBytes: 1_472 },
  { path: 'dist/renderers/index.cjs', maxBytes: 1_536 },
  { path: 'dist/session/index.mjs', maxBytes: 832 },
  { path: 'dist/session/index.cjs', maxBytes: 896 },
  { path: 'dist/gallery/index.mjs', maxBytes: 832 },
  { path: 'dist/gallery/index.cjs', maxBytes: 896 },
  { path: 'dist/style.css', maxBytes: 260 },
  { path: 'dist/medium-zoom.esm.js', maxBytes: 4_416 },
  { path: 'dist/medium-zoom.min.js', maxBytes: 4_480 },
  { path: 'dist/pure/index.js', maxBytes: 4_192 },
  { path: 'dist/pure/medium-zoom.min.umd.js', maxBytes: 4_288 },
] satisfies BundleBudget[]
