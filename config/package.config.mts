import legacyFixture from '../tests/experimental/package.json' with { type: 'json' }

// One npm package. Candidate subpaths remain private until their contracts are proven.
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
export interface CandidateEntry extends PackageEntry {
  name: string
  source: { esm: string; cjs: string }
  profile: 'modern' | 'compat'
  primaryExport: string
  emitsCss: boolean
  budgets: readonly [number, number]
  cjs: string
}
function optional(
  name: string,
  source: string,
  primaryExport: string,
  kind: string,
  includes: string,
  budgets: readonly [number, number],
  css?: string
): CandidateEntry {
  return {
    name,
    source: { esm: source, cjs: source },
    primaryExport,
    kind,
    includes,
    budgets,
    css,
    path: `medium-zoom/${name}`,
    esm: `dist/${name}/index.mjs`,
    cjs: `dist/${name}/index.cjs`,
    profile: 'modern',
    emitsCss: false,
  }
}
function preset(
  name: string,
  profile: 'modern' | 'compat',
  injected: boolean,
  budgets: readonly [number, number]
): CandidateEntry {
  const pure = name.includes('pure')
  const entry = optional(
    name,
    `src/${pure ? 'pure' : 'index'}.ts`,
    'default',
    `${profile} preset`,
    'HD/container/template; no modal/gallery',
    budgets,
    `dist/${profile === 'modern' ? 'modern/' : ''}style.css`
  )
  return {
    ...entry,
    profile,
    injected,
    emitsCss: injected,
    source: { ...entry.source, cjs: `src/${pure ? 'pure' : 'index'}-commonjs.ts` },
  }
}
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

export const extensionEntries: CandidateEntry[] = [
  optional(
    'core',
    'src/core.ts',
    'createZoom',
    'instance API',
    'engine/contracts; strategies imported separately',
    [3_800, 3_800],
    'dist/modern/style.css'
  ),
  optional(
    'loaders',
    'src/loaders.ts',
    'loadHdImage',
    'loading strategy',
    'detached media; readiness + cancellation',
    [640, 704]
  ),
  optional(
    'viewport',
    'src/viewport.ts',
    'containerBounds',
    'measurement strategy',
    'positioning-time layout',
    [448, 512]
  ),
  optional(
    'content',
    'src/content.ts',
    'templateContent',
    'content helper',
    'renderer-neutral mount + cleanup',
    [320, 320]
  ),
  optional(
    'triggers',
    'src/triggers.ts',
    'bindZoomTriggers',
    'DOM binding',
    'pointer/keyboard activation + cleanup',
    [896, 960]
  ),
  optional(
    'renderers',
    'src/renderers/index.ts',
    'dialog',
    'modal renderer',
    'native dialog + optional transition runner',
    [1_472, 1_536]
  ),
  optional(
    'session',
    'src/session.ts',
    'createZoomSession',
    'coordinator',
    'releasable ownership; no UI',
    [960, 1_024]
  ),
  optional(
    'gallery',
    'src/gallery.ts',
    'createGallery',
    'headless controller',
    'selection/subscriptions + keyboard; no UI',
    [896, 896]
  ),
]
export const profileEntries: CandidateEntry[] = [
  preset('compat', 'compat', true, [3_799, 3_799]),
  preset('compat/pure', 'compat', false, [4_512, 4_512]),
  preset('modern', 'modern', true, [4_608, 4_608]),
  preset('pure', 'compat', false, [4_512, 4_512]),
]
export const candidateEntries = [...extensionEntries, ...profileEntries]
export const candidateArtifacts = candidateEntries.flatMap(entry => [entry.esm, entry.cjs])
export const candidateBudgets = candidateEntries.flatMap(entry => [
  { path: entry.esm, maxBytes: entry.budgets[0] },
  { path: entry.cjs, maxBytes: entry.budgets[1] },
])
export function candidateManifest() {
  const exports: Record<string, unknown> = { ...legacyFixture.exports }
  const types: Record<string, string[]> = { ...legacyFixture.typesVersions['*'] }
  const sideEffects = [...legacyFixture.sideEffects]
  for (const entry of candidateEntries) {
    exports[`./${entry.name}`] = {
      import: { types: `./dist/${entry.name}/index.d.mts`, default: `./${entry.esm}` },
      require: { types: `./dist/${entry.name}/index.d.cts`, default: `./${entry.cjs}` },
    }
    types[entry.name] = [
      `dist/${entry.name}/index.d.${entry.primaryExport === 'default' ? 'mts' : 'cts'}`,
    ]
    if (entry.injected) {
      sideEffects.push(`./${entry.esm}`, `./${entry.cjs}`)
    }
  }
  return { ...legacyFixture, exports, typesVersions: { '*': types }, sideEffects }
}
