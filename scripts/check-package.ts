import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

import { type ecmaVersion, parse } from 'acorn'

import {
  candidateArtifacts,
  candidateEntries,
  extensionEntries,
  type Profile,
} from '../config/package.config.mts'
import baseline from '../config/size-baseline.json' with { type: 'json' }
import { checkAnalyzers } from './check-package-analyzers.ts'
import { checkConsumers } from './check-package-consumers.ts'
import { packExperimental } from './pack-experimental.ts'
import { pack } from './pack.ts'
import { bytes, change, table } from './size-report'

const packageRows: string[][] = []
const entryFunctions = Object.fromEntries(
  extensionEntries.map(entry => [entry.name, entry.primaryExport])
)

// Syntax checks cannot see API use. `Object.assign` and `Promise` are allowed only behind
// the fallbacks that the platform module provides, which the patterns below skip.
const LEGACY_UNSUPPORTED_APIS: Record<string, RegExp> = {
  'Node.isConnected': /\.isConnected\b/,
  'ChildNode.remove()': /\.remove\(\)/,
  'Element.closest()': /\.closest\(/,
  'Element.matches()': /\.matches\(/,
  'ParentNode.append()': /\.(?:append|prepend|replaceChildren)\(/,
  'Element.getAnimations()': /\.getAnimations\b/,
  'HTMLElement.dataset': /\.dataset\b/,
  'window.scrollX/scrollY': /\.scroll[XY]\b/,
  'new CustomEvent()': /new CustomEvent\b/,
  'String/Array.includes()': /\.includes\(/,
  'Array.find()': /\.find(?:Index)?\(/,
  'Array.from()': /Array\.from\b/,
  'Object.entries/values()': /Object\.(?:entries|values)\b/,
  queueMicrotask: /queueMicrotask\b/,
  'WeakMap/WeakSet': /\bWeak(?:Map|Set)\b/,
  AbortController: /\bAbortController\b/,
  'MediaQueryList.addEventListener()': /matchMedia\([^)]*\)\.addEventListener/,
}
// Legacy builds keep these fallbacks; modern builds must drop them.
const LEGACY_FALLBACKS = [
  'initCustomEvent',
  '.keyCode',
  '.addListener(',
  'documentElement.scrollTop',
]

type ModuleFormat = 'esm' | 'cjs' | 'umd'

function moduleFormat(path: string): ModuleFormat {
  if (
    path.endsWith('.mjs') ||
    path.endsWith('.esm.js') ||
    path === 'pure/index.js'
  ) {
    return 'esm'
  }
  return path.endsWith('.cjs') ? 'cjs' : 'umd'
}

// Modern files may use ES2020. Legacy ESM keeps ES2015 module syntax around an ES5 body.
// The syntax each profile's artifacts must parse as, per module format.
const profileSyntax: Record<Profile, Record<ModuleFormat, ecmaVersion>> = {
  compat: { esm: 2_015, cjs: 5, umd: 5 },
  modern: { esm: 2_020, cjs: 2_020, umd: 2_020 },
}

const sourceTypes: Record<ModuleFormat, 'module' | 'script'> = {
  esm: 'module',
  cjs: 'script',
  umd: 'script',
}

function runCommonJs(code: string, file: string) {
  const commonjs = { exports: {} as unknown }
  runInNewContext(code, {
    module: commonjs,
    exports: commonjs.exports,
    require: createRequire(file),
  })
  return commonjs.exports
}

/** Loads a packed script the way its consumers do and checks its primary export. */
const checkExports: Record<
  ModuleFormat,
  (
    code: string,
    file: string,
    primaryExport: string | undefined
  ) => Promise<void> | void
> = {
  async esm(code, file, primaryExport) {
    const loaded = await import(
      file.endsWith('.mjs')
        ? pathToFileURL(file).href
        : `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    )
    assert.equal(typeof loaded[primaryExport ?? 'default'], 'function', file)
  },
  cjs(code, file, primaryExport) {
    const exports = runCommonJs(code, file) as Record<string, unknown>
    assert.equal(
      typeof (primaryExport ? exports[primaryExport] : exports),
      'function',
      file
    )
  },
  umd(code, file) {
    const context: Record<string, unknown> = {
      Promise: undefined,
      Symbol: undefined,
      Set: undefined,
      Map: undefined,
    }
    runInNewContext(code, context)
    assert.equal(
      typeof context.mediumZoom,
      'function',
      `${file} browser global`
    )
    assert.equal(
      typeof runCommonJs(code, file),
      'function',
      `${file} CommonJS export`
    )
    let amd: unknown
    const define = (_dependencies: string[], factory: () => unknown) => {
      amd = factory()
    }
    define.amd = true
    runInNewContext(code, { define })
    assert.equal(typeof amd, 'function', `${file} AMD export`)
  },
}

async function checkPackage(
  artifact: ReturnType<typeof pack>,
  experimental: boolean
) {
  try {
    const packedFiles = readdirSync(artifact.root, {
      recursive: true,
      encoding: 'utf8',
    }).filter(path => statSync(join(artifact.root, path)).isFile())
    const before = baseline.packages[experimental ? 'candidate' : 'release']
    const tarball = statSync(artifact.archive).size
    const unpacked = packedFiles.reduce(
      (sum, path) => sum + statSync(join(artifact.root, path)).size,
      0
    )
    packageRows.push([
      experimental ? 'private candidate fixture' : 'current release manifest',
      String(packedFiles.length),
      bytes(tarball),
      bytes(unpacked),
      change(tarball, before.tarball),
      change(unpacked, before.unpacked),
      experimental
        ? 'all experimental entries + legacy files'
        : 'legacy distributions + declarations/docs',
    ])
    const metadata = JSON.parse(
      readFileSync(join(artifact.root, 'package.json'), 'utf8')
    )
    assert.equal(metadata.main, 'dist/medium-zoom.min.js')
    assert.equal(metadata.module, 'dist/medium-zoom.esm.js')
    assert.equal(metadata.types, 'dist/medium-zoom.d.ts')
    assert.deepEqual(Object.keys(metadata.dependencies || {}), [])
    assert.equal(
      !!metadata.exports,
      experimental,
      'Only the unpublished fixture can declare proposed exports'
    )
    assert.equal(
      !!metadata.typesVersions,
      experimental,
      'Do not expose prototype types in release metadata'
    )
    assert.equal(metadata.private === true, experimental)
    assert.equal(
      readFileSync(join(artifact.root, 'CHANGELOG.md'), 'utf8'),
      readFileSync('CHANGELOG.md', 'utf8'),
      'The npm tarball must include the complete changelog'
    )

    const files = readdirSync(join(artifact.root, 'dist'), {
      recursive: true,
      encoding: 'utf8',
    })
    const releasedFiles = [
      'medium-zoom.d.ts',
      'medium-zoom.esm.js',
      'medium-zoom.js',
      'medium-zoom.min.js',
      'pure/index.d.ts',
      'pure/index.js',
      'pure/medium-zoom.min.umd.js',
      'pure/medium-zoom.umd.js',
      'style.css',
    ]
    assert(
      !files.some(path => path.startsWith('controls/')),
      'The runtime package must not contain built-in controls or their stylesheet'
    )
    if (!experimental) {
      assert.deepEqual(
        packedFiles.sort(),
        [
          'package.json',
          'README.md',
          'LICENSE',
          'CHANGELOG.md',
          ...releasedFiles.map(path => `dist/${path}`),
        ].sort(),
        'The release tarball must not contain private sources, fixtures, or experimental outputs'
      )
      assert.deepEqual(
        files
          .filter(path => statSync(join(artifact.root, 'dist', path)).isFile())
          .sort(),
        releasedFiles.sort(),
        'The npm tarball must contain only the existing v1 distributions'
      )
    }
    const expectedScripts = releasedFiles.filter(path => path.endsWith('.js'))
    if (experimental) {
      expectedScripts.push(
        ...candidateArtifacts.map(path => path.slice('dist/'.length))
      )
    }
    const scripts = files.filter(path => /\.(?:[mc])?js$/.test(path))
    assert.deepEqual([...scripts].sort(), expectedScripts.sort())

    for (const path of scripts) {
      const file = join(artifact.root, 'dist', path)
      const code = readFileSync(file, 'utf8')
      const format = moduleFormat(path)
      // Release artifacts are not in the candidate catalog; they all use the compat profile.
      const profile: Profile =
        candidateEntries.find(
          entry => entry.esm === `dist/${path}` || entry.cjs === `dist/${path}`
        )?.profile ?? 'compat'
      const modern = profile === 'modern'
      parse(code, {
        ecmaVersion: profileSyntax[profile][format],
        sourceType: sourceTypes[format],
      })
      // ESM syntax is intentionally retained; its implementation must still be ES5.
      if (format === 'esm' && !modern) {
        parse(code.replace(/export\s*\{[^}]+\};?\s*$/, ''), { ecmaVersion: 5 })
      }
      const banner = `/*! medium-zoom ${metadata.version} | MIT License | https://github.com/francoischalifour/medium-zoom */`
      assert(
        code.startsWith(banner + '\n'),
        `${path} must start with the release banner`
      )
      assert.equal(
        code.split(banner).length - 1,
        1,
        `${path} must contain exactly one banner`
      )
      assert(
        !code.includes('#platform'),
        `${path} must resolve its platform at build time`
      )
      for (const fallback of LEGACY_FALLBACKS) {
        assert.equal(
          code.includes(fallback),
          !modern,
          `${path} must ${modern ? 'not ship' : 'retain'} ${fallback}`
        )
      }
      if (!modern) {
        // No browser from the support table runs in CI, so reject the DOM and language
        // APIs that Internet Explorer 10 lacks instead of discovering them there.
        for (const [api, pattern] of Object.entries(LEGACY_UNSUPPORTED_APIS)) {
          assert(
            !pattern.test(code),
            `${path} must not use ${api}: unavailable in IE 10`
          )
        }
      }
      assert(!code.includes('__TEST__'), `${path} must not ship test branches`)
      await checkExports[format](
        code,
        file,
        entryFunctions[path.split('/')[0]!]
      )
    }

    assert.equal(
      readFileSync(join(artifact.root, 'dist/medium-zoom.d.ts'), 'utf8'),
      readFileSync(join(artifact.root, 'dist/pure/index.d.ts'), 'utf8')
    )
    assert(
      !readFileSync(
        join(artifact.root, 'dist/medium-zoom.d.ts'),
        'utf8'
      ).includes('trigger?:'),
      'Release declarations must not expose modal trigger options'
    )
    const css = readFileSync(join(artifact.root, 'dist/style.css'), 'utf8')
    assert(css.includes('cursor:pointer') && css.includes('cursor:zoom-in'))
    assert(css.includes('cursor:zoom-out'))

    if (experimental) {
      const modernCss = readFileSync(
        join(artifact.root, 'dist/modern/style.css'),
        'utf8'
      )
      assert(!modernCss.includes('cursor:pointer'))
      assert(
        modernCss.includes('cursor:zoom-in') &&
          modernCss.includes('cursor:zoom-out')
      )
    }

    await checkAnalyzers(artifact.archive, experimental)
    await checkConsumers(artifact, experimental)
    console.log(
      `${experimental ? 'Unpublished experimental fixture' : 'Release package'} paths, modules, syntax, CSS, license, and declarations verified.`
    )
  } finally {
    artifact.cleanup()
  }
}

const releaseManifest = readFileSync('package.json', 'utf8')
await checkPackage(pack(), false)
await checkPackage(packExperimental(), true)
assert.equal(
  readFileSync('package.json', 'utf8'),
  releaseManifest,
  'Private fixture checks must not mutate release metadata'
)

console.log(
  '\nPACKAGE CONTENTS · npm download/install cost, not browser bundle cost'
)
table(
  [
    'Manifest',
    'Files',
    'Tarball',
    'Unpacked',
    `Δ tarball vs ${baseline.revision}`,
    'Δ unpacked',
    'Contents',
  ],
  packageRows
)
