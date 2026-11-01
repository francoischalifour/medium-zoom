// Logical entry points, not separate npm packages. Candidate exports remain private.
export interface PackageEntry {
  path: string
  kind: string
  includes: string
  esm: string
  cjs?: string
  umd?: string
  css?: string
  injected?: boolean
}
const optional = (path: string, kind: string, includes: string, css?: string): PackageEntry => ({
  path: `medium-zoom/${path}`,
  kind,
  includes,
  esm: `dist/${path}/index.mjs`,
  cjs: `dist/${path}/index.cjs`,
  css,
})
export const releaseEntries: PackageEntry[] = [
  {
    path: 'medium-zoom',
    kind: 'compat preset',
    includes: 'engine + HD/container/template',
    esm: 'dist/medium-zoom.esm.js',
    umd: 'dist/medium-zoom.min.js',
    css: 'dist/style.css',
    injected: true,
  },
  {
    path: 'medium-zoom/dist/pure',
    kind: 'compat preset',
    includes: 'same preset; explicit CSS',
    esm: 'dist/pure/index.js',
    umd: 'dist/pure/medium-zoom.min.umd.js',
    css: 'dist/style.css',
  },
]
export const extensionEntries: PackageEntry[] = [
  optional(
    'core',
    'engine/factory',
    'no features, renderer, session or UI',
    'dist/modern/style.css'
  ),
  optional('features', 'feature factories', 'HD/container/template/accessibility'),
  optional('renderers', 'modal renderer', 'native dialog + optional transition runner'),
  optional('session', 'coordinator', 'ownership/cancellation; no UI'),
  optional('gallery', 'headless controller', 'selection/subscriptions; no UI'),
  optional(
    'controls',
    'DOM adapter',
    'stock buttons/live status + keyboard',
    'dist/controls/style.css'
  ),
]
export const profileEntries: PackageEntry[] = [
  {
    ...optional('compat', 'compat preset', 'alias of root preset', 'dist/style.css'),
    injected: true,
  },
  optional('compat/pure', 'compat preset', 'same preset; explicit CSS', 'dist/style.css'),
  {
    ...optional(
      'modern',
      'modern preset',
      'HD/container/template; no modal/gallery',
      'dist/modern/style.css'
    ),
    injected: true,
  },
  optional('pure', 'compat preset', 'alias of compat/pure', 'dist/style.css'),
]
