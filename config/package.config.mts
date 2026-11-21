import legacyFixture from '../tests/experimental/package.json' with { type: 'json' }

export type Profile = 'modern' | 'compat'

// Each profile publishes its own stylesheet; compat keeps the v1 path.
export const profileStylesheets: Record<Profile, string> = {
  compat: 'style.css',
  modern: 'modern/style.css',
}

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
  profile: Profile
  primaryExport: string
  emitsCss: boolean
  budgets: readonly [number, number]
  cjs: string
  stylesheets?: readonly Stylesheet[]
}
/**
 * A stylesheet built from its sources, inlined in order, published as
 * `medium-zoom/<fileName>` and emitted as `dist/<fileName>`.
 */
export interface Stylesheet {
  fileName: string
  sources: readonly string[]
  maxBytes: number
}
/** An entry whose styles the application imports; the first one is the entry's own. */
function styled(
  entry: CandidateEntry,
  stylesheets: readonly Stylesheet[]
): CandidateEntry {
  return { ...entry, stylesheets, css: `dist/${stylesheets[0]!.fileName}` }
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
  profile: Profile,
  injected: boolean,
  budgets: readonly [number, number]
): CandidateEntry {
  const pure = name.includes('pure')
  const entry = optional(
    name,
    `src/preset/${pure ? 'pure' : 'index'}.ts`,
    'default',
    `${profile} preset`,
    'HD/container/template; no modal/gallery',
    budgets,
    `dist/${profileStylesheets[profile]}`
  )
  return {
    ...entry,
    profile,
    injected,
    emitsCss: injected,
    source: {
      ...entry.source,
      cjs: `src/preset/${pure ? 'pure' : 'index'}-commonjs.ts`,
    },
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
    'src/zoom/index.ts',
    'createZoom',
    'instance API',
    'engine/contracts; strategies imported separately',
    [3_470, 3_470],
    'dist/modern/style.css'
  ),
  optional(
    'loaders',
    'src/zoom/hd-image.ts',
    'loadHdImage',
    'loading strategy',
    'detached media; readiness + cancellation',
    [464, 464]
  ),
  optional(
    'viewport',
    'src/zoom/viewport.ts',
    'containerBounds',
    'measurement strategy',
    'positioning-time layout',
    [448, 512]
  ),
  optional(
    'content',
    'src/zoom/content.ts',
    'templateContent',
    'content helper',
    'renderer-neutral mount + cleanup',
    [320, 320]
  ),
  optional(
    'triggers',
    'src/zoom/triggers.ts',
    'bindZoomTriggers',
    'DOM binding',
    'pointer/keyboard activation + cleanup',
    [840, 840]
  ),
  styled(
    optional(
      'renderers',
      'src/zoom/dialog.ts',
      'dialog',
      'modal renderer',
      'native dialog + scene replacement',
      [1_660, 1_660]
    ),
    [
      {
        fileName: 'renderers/style.css',
        sources: ['src/zoom/dialog.css'],
        maxBytes: 180,
      },
    ]
  ),
  optional(
    'session',
    'src/zoom/session.ts',
    'createZoomSession',
    'coordinator',
    'releasable ownership; no UI',
    [840, 840]
  ),
  optional(
    'transitions',
    'src/gallery/transition.ts',
    'galleryTransition',
    'transition runner',
    'effect runner + slide; cancellation + reduced motion',
    [660, 660]
  ),
  styled(
    optional(
      'gallery',
      'src/gallery/index.ts',
      'createGallery',
      'headless controller',
      'headless controller + keyboard/gestures; optional stock controls',
      // Gestures are about 3 KB of it, shaken out by consumers that do not bind them.
      [5_300, 5_300]
    ),
    [
      {
        fileName: 'gallery/style.css',
        sources: ['src/gallery/gallery.css'],
        maxBytes: 980,
      },
      // Core, dialog and gallery styles in one request for the common setup.
      {
        fileName: 'gallery.css',
        sources: [
          'src/zoom/medium-zoom.css',
          'src/zoom/dialog.css',
          'src/gallery/gallery.css',
        ],
        maxBytes: 1_168,
      },
    ]
  ),
]
export const profileEntries: CandidateEntry[] = [
  preset('compat', 'compat', true, [3_540, 3_540]),
  preset('compat/pure', 'compat', false, [3_340, 3_340]),
  preset('modern', 'modern', true, [3_420, 3_420]),
  preset('pure', 'compat', false, [3_340, 3_340]),
]
export const candidateEntries = [...extensionEntries, ...profileEntries]
export const candidateArtifacts = candidateEntries.flatMap(entry => [
  entry.esm,
  entry.cjs,
])
export const candidateBudgets = candidateEntries.flatMap(entry => [
  { path: entry.esm, maxBytes: entry.budgets[0] },
  { path: entry.cjs, maxBytes: entry.budgets[1] },
  ...(entry.stylesheets || []).map(({ fileName, maxBytes }) => ({
    path: `dist/${fileName}`,
    maxBytes,
  })),
])
export function candidateManifest() {
  const exports: Record<string, unknown> = { ...legacyFixture.exports }
  const types: Record<string, string[]> = {
    ...legacyFixture.typesVersions['*'],
  }
  const sideEffects = [...legacyFixture.sideEffects]
  for (const entry of candidateEntries) {
    exports[`./${entry.name}`] = {
      import: {
        types: `./dist/${entry.name}/index.d.mts`,
        default: `./${entry.esm}`,
      },
      require: {
        types: `./dist/${entry.name}/index.d.cts`,
        default: `./${entry.cjs}`,
      },
    }
    types[entry.name] = [
      `dist/${entry.name}/index.d.${entry.primaryExport === 'default' ? 'mts' : 'cts'}`,
    ]
    if (entry.injected) {
      sideEffects.push(`./${entry.esm}`, `./${entry.cjs}`)
    }
    for (const { fileName } of entry.stylesheets || []) {
      exports[`./${fileName}`] = `./dist/${fileName}`
    }
  }
  return {
    ...legacyFixture,
    exports,
    typesVersions: { '*': types },
    sideEffects,
  }
}
