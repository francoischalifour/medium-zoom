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
/** An entry is built from `src/<name>/index.ts`: the source tree mirrors the package. */
function optional(
  name: string,
  primaryExport: string,
  kind: string,
  includes: string,
  budgets: readonly [number, number],
  css?: string
): CandidateEntry {
  const source = `src/${name}/index.ts`
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
      esm: `src/preset/${pure ? 'pure' : 'index'}.ts`,
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
    'createZoom',
    'instance API',
    'engine/contracts + state, close reasons and events, signal, groups',
    [4_040, 4_040],
    'dist/modern/style.css'
  ),
  optional(
    'loaders',
    'loadHdImage',
    'loading strategy',
    'detached media; readiness + cancellation',
    [464, 464]
  ),
  optional(
    'viewport',
    'containerBounds',
    'measurement strategy',
    'positioning-time layout',
    [420, 420]
  ),
  optional(
    'content',
    'templateContent',
    'content helper',
    'renderer-neutral mount + cleanup',
    [320, 320]
  ),
  optional(
    'triggers',
    'bindZoomTriggers',
    'DOM binding',
    'pointer/keyboard activation; shared binding + signal',
    [910, 910]
  ),
  styled(
    optional(
      'renderers',
      'dialog',
      'modal renderer',
      'native dialog + scene replacement + state attributes',
      [1_900, 1_900]
    ),
    [
      {
        fileName: 'renderers/style.css',
        sources: ['src/renderers/dialog.css'],
        maxBytes: 180,
      },
    ]
  ),
  optional(
    'transitions',
    'galleryTransition',
    'transition runner',
    'effect runner + slide; cancellation + reduced motion',
    [660, 660]
  ),
  styled(
    optional(
      'gallery',
      'createGallery',
      'headless controller',
      'shared headless controller + keyboard/gestures; optional stock controls',
      // Gestures are about 3 KB of it, shaken out by consumers that do not bind them.
      [5_630, 5_630]
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
          'src/renderers/dialog.css',
          'src/gallery/gallery.css',
        ],
        maxBytes: 1_168,
      },
    ]
  ),
]
export const profileEntries: CandidateEntry[] = [
  preset('compat', 'compat', true, [3_410, 3_410]),
  preset('compat/pure', 'compat', false, [3_200, 3_200]),
  preset('modern', 'modern', true, [3_225, 3_225]),
  preset('pure', 'compat', false, [3_200, 3_200]),
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
