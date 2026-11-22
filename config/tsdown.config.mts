import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { transformSync } from '@babel/core'
import { type ecmaVersion, parse } from 'acorn'
import { Features, type Targets, transform as transformCss } from 'lightningcss'
import {
  type CompressOptions,
  minify as minifyJavaScript,
  type MinifyOptions,
} from 'terser'
import { defineConfig } from 'tsdown'
import type { TsdownPlugin, UserConfig } from 'tsdown'

import pkg from '../package.json' with { type: 'json' }
import {
  candidateEntries,
  type CandidateEntry,
  type Profile,
  profileStylesheets,
  type Stylesheet,
} from './package.config.mts'

const banner = `/*! ${pkg.name} ${pkg.version} | ${pkg.license} License | https://github.com/${pkg.repository} */`
const stylesheetPath = fileURLToPath(
  new URL('../src/zoom/medium-zoom.css', import.meta.url)
)
// Mangle the engine's private scene state; preserve public options and DOM APIs.
const privateProperties = /^__mz_/

// The modern floor is the first release of each engine with HTMLDialogElement.showModal(),
// which the dialog renderer requires (Baseline 2022): Safari and iOS 15.4, Chrome, Edge and
// Firefox 98. Raising it lets modern entries use the platform without fallbacks.
const modernBrowsers = { chrome: 98, firefox: 98, safari: [15, 4] } as const

// Switch this profile for the v2 default; explicit compat stays stable.
const defaultProfile: Profile = 'compat'

type Format = 'esm' | 'umd' | 'cjs'

interface ProfileConfig {
  /** tsdown's syntax target; compat lowers later, through Babel. */
  target: string | string[]
  css: { prepare: (source: string) => string; targets: Targets }
  /** Lower bundled syntax for the profile's browsers. */
  lower: (source: string, minify: boolean) => string | null | undefined
  terser: Pick<MinifyOptions, 'ecma'> & { compress: CompressOptions }
  ecmaVersion: ecmaVersion
}

const profiles: Record<Profile, ProfileConfig> = {
  compat: {
    target: 'esnext',
    css: {
      prepare: source =>
        source.replace(
          /cursor: (zoom-(?:in|out));/g,
          'cursor: pointer;\n  cursor: $1;'
        ),
      targets: { ie: 10 << 16 },
    },
    lower: (source, minify) =>
      transformSync(source, {
        babelrc: false,
        configFile: false,
        targets: { ie: '10' },
        assumptions: {
          iterableIsArray: true,
          noDocumentAll: true,
          ignoreFunctionLength: true,
          ignoreToPrimitiveHint: true,
          pureGetters: true,
          setSpreadProperties: true,
        },
        presets: [
          [
            '@babel/preset-env',
            { modules: false, exclude: ['transform-typeof-symbol'] },
          ],
        ],
        compact: minify,
        minified: minify,
        comments: true,
      })?.code,
    terser: {
      ecma: 5,
      compress: {
        passes: 10,
        // Separate statements gzip better than comma chains in the fixed preset.
        sequences: false,
        // Fixed compatibility entries expose instances; their Boolean literals are internal flags or DOM arguments.
        booleans_as_integers: true,
      },
    },
    ecmaVersion: 2_015,
  },
  modern: {
    target: [
      `chrome${modernBrowsers.chrome}`,
      `edge${modernBrowsers.chrome}`,
      `firefox${modernBrowsers.firefox}`,
      `safari${modernBrowsers.safari.join('.')}`,
    ],
    css: {
      prepare: source => source,
      targets: {
        chrome: modernBrowsers.chrome << 16,
        firefox: modernBrowsers.firefox << 16,
        safari:
          (modernBrowsers.safari[0] << 16) | (modernBrowsers.safari[1] << 8),
      },
    },
    lower: source => source,
    terser: {
      ecma: 2_020,
      compress: { passes: 3, sequences: true, booleans_as_integers: false },
    },
    // Safari 15.4 parses ES2022 except class static blocks, which the target lowers.
    ecmaVersion: 2_022,
  },
}

interface FormatConfig {
  /** tsdown always builds CommonJS for Node; the code itself is still browser-only. */
  platform: 'browser' | 'node'
  terser: Pick<MinifyOptions, 'module' | 'toplevel'>
  outputOptions: { exports?: 'default'; intro?: string }
  /** Keep exports on separate lines so line-based package analyzers can find them even when URLs look like comments. */
  separateExports: boolean
}

const formats: Record<Format, FormatConfig> = {
  esm: {
    platform: 'browser',
    terser: { module: true },
    outputOptions: {},
    separateExports: true,
  },
  umd: {
    platform: 'browser',
    terser: {},
    outputOptions: { exports: 'default', intro: '"use strict";' },
    separateExports: false,
  },
  cjs: {
    platform: 'node',
    terser: { toplevel: true },
    outputOptions: { intro: '"use strict";' },
    separateExports: false,
  },
}

const exportTypes = new Set([
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'ExportAllDeclaration',
])

function stylesheet(profile: Profile): TsdownPlugin {
  const { css } = profiles[profile]
  return {
    name: 'medium-zoom-stylesheet',
    resolveId(source) {
      if (source === '@/zoom/medium-zoom.css') {
        return '\0medium-zoom-stylesheet'
      }
    },
    load(id) {
      if (id !== '\0medium-zoom-stylesheet') {
        return
      }
      this.addWatchFile(stylesheetPath)
      const source = readFileSync(stylesheetPath, 'utf8')
      const code = transformCss({
        filename: stylesheetPath,
        code: Buffer.from(css.prepare(source)),
        minify: true,
        targets: css.targets,
      }).code.toString()
      this.emitFile({
        type: 'asset',
        fileName: profileStylesheets[profile],
        source: code,
      })
      return `if (typeof document === 'object') {
        var style = document.createElement('style');
        style.textContent = ${JSON.stringify(code)};
        document.head.appendChild(style);
      }`
    },
  }
}

/** Emits the stylesheets an entry declares, as files for the application to import. */
function entryStylesheets(stylesheets: readonly Stylesheet[]): TsdownPlugin {
  const resolve = (source: string) =>
    fileURLToPath(new URL(`../${source}`, import.meta.url))
  return {
    name: 'medium-zoom-entry-stylesheets',
    buildStart() {
      stylesheets.forEach(({ sources }) =>
        sources.forEach(source => this.addWatchFile(resolve(source)))
      )
    },
    generateBundle() {
      for (const { fileName, sources } of stylesheets) {
        // Inlined rather than chained with @import, so a stylesheet is one request.
        const code = sources
          .map(source => readFileSync(resolve(source), 'utf8'))
          .join('\n')
        this.emitFile({
          type: 'asset',
          fileName,
          source: transformCss({
            filename: fileName,
            code: Buffer.from(profiles.modern.css.prepare(code)),
            minify: true,
            targets: profiles.modern.css.targets,
            // Lowered light-dark() needs color-scheme rules in the same stylesheet: keep it native.
            exclude: Features.LightDark,
          }).code.toString(),
        })
      }
    },
  }
}

function browserSyntax(
  profile: Profile,
  format: Format,
  minify: boolean
): TsdownPlugin {
  const config = profiles[profile]
  const output = formats[format]
  return {
    name: `medium-zoom-${profile}-syntax`,
    generateBundle(_options, bundle) {
      // Preserve the older declaration syntax of the existing root and pure entries.
      for (const fileName of ['medium-zoom.d.ts', 'pure/index.d.ts']) {
        const declaration = bundle[fileName]
        if (declaration?.type !== 'chunk') {
          continue
        }
        declaration.code = declaration.code.replace(
          /export \{([^}]+)\}/g,
          (_match, names: string) =>
            `export {${names.replace(/\btype\s+/g, '')}}`
        )
      }
    },
    async renderChunk(source, chunk) {
      if (chunk.name.endsWith('.d')) {
        return
      }
      const lowered = config.lower(source, minify)
      if (!lowered) {
        throw new Error('The browser syntax transform did not emit code')
      }
      const code = minify
        ? (
            await minifyJavaScript(lowered, {
              ...config.terser,
              // Terser writes defaults into the options it receives: give each call its own copy.
              compress: { ...config.terser.compress },
              ...output.terser,
              mangle: { properties: { regex: privateProperties } },
              // Reserving these unused names shifts Terser's scene keys and saves 1–3 bytes after gzip.
              nameCache: {
                props: {
                  props: {
                    $__mz_reserved1: 'w',
                    $__mz_reserved2: 'u',
                    $__mz_reserved3: 'y',
                  },
                },
              },
              format: { comments: /^!/, quote_style: 1 },
            })
          ).code
        : lowered
      if (!code) {
        throw new Error('The browser minifier did not emit code')
      }
      return {
        code: output.separateExports
          ? separateExports(code, config.ecmaVersion)
          : code,
        map: null,
      }
    },
  }
}

function separateExports(code: string, ecmaVersion: ecmaVersion) {
  const { body } = parse(code, { ecmaVersion, sourceType: 'module' })
  // Work backwards so each declaration's original offset remains valid.
  let output = code
  for (const declaration of body.reverse()) {
    if (exportTypes.has(declaration.type)) {
      output = `${output.slice(0, declaration.start)}\n${output.slice(declaration.start)}`
    }
  }
  return output
}

const declarationFileName = (fileName: string) =>
  /\.[mc]js$/.test(fileName)
    ? fileName.replace(/\.([mc])js$/, '.d.$1ts')
    : fileName.replace(/(?:\.esm)?\.js$/, '.d.ts')

function browserBundle(
  source: string,
  fileName: string,
  format: Format,
  minify = true,
  profile: Profile = defaultProfile,
  preset = true
): UserConfig {
  return {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    entry: { 'medium-zoom': source },
    platform: formats[format].platform,
    // Keep editor paths from overriding the runtime platform alias.
    tsconfig: false,
    target: profiles[profile].target,
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      '#platform': fileURLToPath(
        new URL(`../src/platform/${profile}.ts`, import.meta.url)
      ),
    },
    dts: false,
    clean: false,
    unbundle: false,
    // Fixed presets compile their capability checks away; composed core keeps them.
    define: { __TEST__: 'false', __PRESET__: String(preset) },
    // Tsdown applies the release banner after renderChunk via Rolldown postBanner.
    banner,
    failOnWarn: true,
    format,
    globalName: 'mediumZoom',
    minify: false,
    outputOptions: {
      generatedCode: { symbols: false },
      entryFileNames: chunk =>
        chunk.name.endsWith('.d') ? declarationFileName(fileName) : fileName,
      ...formats[format].outputOptions,
    },
    plugins: [stylesheet(profile), browserSyntax(profile, format, minify)],
  }
}

const moduleExtensions = { esm: 'mjs', cjs: 'cjs' } as const

function entryBundle(
  entry: CandidateEntry,
  format: keyof typeof moduleExtensions
): UserConfig {
  const { name, profile } = entry
  const source = entry.source[format]
  const full = entry.primaryExport === 'default'
  return {
    ...browserBundle(
      source,
      `${name}/index.${moduleExtensions[format]}`,
      format,
      true,
      profile,
      full
    ),
    entry: { [`${name}/index`]: source },
    // Declarations reference shared contracts from their owning entry instead of copying them.
    // Source imports of these entries are type-only, so runtime bundles never import them.
    deps: { neverBundle: ['medium-zoom/core', 'medium-zoom/renderers'] },
    dts: {
      generator: 'oxc',
      tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
      cjsDefault: full && format === 'cjs',
    },
    plugins: [
      ...(entry.emitsCss ? [stylesheet(profile)] : []),
      // Once per entry: the ESM build emits the stylesheets for both formats.
      ...(entry.stylesheets && format === 'esm'
        ? [entryStylesheets(entry.stylesheets)]
        : []),
      browserSyntax(profile, format, true),
    ],
    ...(full &&
      format === 'cjs' && {
        onSuccess(config) {
          // CJS declarations are emitted in a separate pipeline without runtime plugins.
          const path = join(config.outDir, `${name}/index.d.cts`)
          const names = [
            'ZoomOptions',
            'ZoomSelector',
            'ZoomContainer',
            'ZoomOpenOptions',
          ]
          const aliases = names
            .map(name => `type ${name} = import('medium-zoom').${name};`)
            .join('\n')
          const zoom = `type Zoom<Options extends import('medium-zoom/core').CoreZoomOptions = import('medium-zoom').ZoomOptions> = import('medium-zoom').Zoom<Options>;`
          const declaration = readFileSync(path, 'utf8')
          if (!declaration.includes('export = mediumZoom;')) {
            throw new Error(
              'The full CommonJS declaration no longer has the expected callable export'
            )
          }
          const code = declaration.replace(
            'export = mediumZoom;',
            `declare namespace mediumZoom { ${zoom}\n${aliases} }\nexport = mediumZoom;`
          )
          writeFileSync(path, code)
        },
      }),
  }
}

export default defineConfig([
  {
    ...browserBundle('src/preset/index.ts', 'medium-zoom.esm.js', 'esm'),
    dts: {
      generator: 'oxc',
      tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
    },
  },
  browserBundle('src/preset/index.ts', 'medium-zoom.js', 'umd', false),
  browserBundle('src/preset/index.ts', 'medium-zoom.min.js', 'umd'),
  {
    ...browserBundle('src/preset/pure.ts', 'pure/index.js', 'esm'),
    dts: {
      generator: 'oxc',
      tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
    },
  },
  browserBundle('src/preset/pure.ts', 'pure/medium-zoom.umd.js', 'umd', false),
  browserBundle('src/preset/pure.ts', 'pure/medium-zoom.min.umd.js', 'umd'),
  ...candidateEntries.flatMap(entry => [
    entryBundle(entry, 'esm'),
    entryBundle(entry, 'cjs'),
  ]),
])
