import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { transformSync } from '@babel/core'
import { parse } from 'acorn'
import { transform as transformCss } from 'lightningcss'
import { minify as minifyEs5 } from 'terser'
import { defineConfig } from 'tsdown'
import type { TsdownPlugin, UserConfig } from 'tsdown'
import pkg from './package.json' with { type: 'json' }

const banner = `/*! ${pkg.name} ${pkg.version} | ${pkg.license} License | https://github.com/${pkg.repository} */`
const stylesheetPath = new URL('./src/medium-zoom.css', import.meta.url)
// Restrict property mangling to private per-opening state, excluding public options and DOM APIs.
const privateSessionProperties =
  /^__mz_(original|zoomed|zoomedHd|template|closing|cancelOpen|viewportScale|isPinching|scrollTimer)$/

function stylesheet(): TsdownPlugin {
  return {
    name: 'medium-zoom-stylesheet',
    resolveId(source) {
      if (source === './medium-zoom.css') return '\0medium-zoom-stylesheet'
    },
    load(id) {
      if (id !== '\0medium-zoom-stylesheet') return
      this.addWatchFile(stylesheetPath.pathname)
      const css = transformCss({
        filename: stylesheetPath.pathname,
        code: readFileSync(stylesheetPath),
        minify: true,
        targets: { ie: 10 << 16 },
      }).code.toString()
      this.emitFile({ type: 'asset', fileName: 'style.css', source: css })
      return `if (typeof document !== 'undefined') {
        var style = document.createElement('style');
        style.textContent = ${JSON.stringify(css)};
        document.head.appendChild(style);
      }`
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'medium-zoom.d.ts',
        source: readFileSync(new URL('./src/medium-zoom.d.ts', import.meta.url), 'utf8'),
      })
      this.emitFile({
        type: 'asset',
        fileName: 'pure/index.d.ts',
        source: readFileSync(new URL('./src/medium-zoom.d.ts', import.meta.url), 'utf8'),
      })
    },
  }
}

function legacySyntax({ minify = false }: { minify?: boolean } = {}): TsdownPlugin {
  return {
    name: 'medium-zoom-legacy-syntax',
    async writeBundle(options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        const path = resolve(options.dir!, chunk.fileName)
        const result = transformSync(readFileSync(path, 'utf8').replace(banner, ''), {
          babelrc: false,
          configFile: false,
          targets: { ie: '10' },
          assumptions: {
            iterableIsArray: true,
            ignoreFunctionLength: true,
            ignoreToPrimitiveHint: true,
            pureGetters: true,
            setSpreadProperties: true,
          },
          presets: [
            ['@babel/preset-env', { modules: false, exclude: ['transform-typeof-symbol'] }],
          ],
          compact: minify,
          minified: minify,
          comments: true,
        })
        if (!result?.code) throw new Error('Babel did not emit the browser bundle')
        const code = minify
          ? (
              await minifyEs5(result.code, {
                ecma: 5,
                module: options.format === 'es',
                mangle: { properties: { regex: privateSessionProperties } },
                format: { comments: /^!/ },
              })
            ).code
          : result.code
        if (!code) throw new Error('The ES5 minifier did not emit a browser bundle')
        // Line-based package analyzers can mistake URL strings for comments.
        // Keep ESM exports visible on their own lines regardless of minifier formatting.
        let output = code
        if (options.format === 'es') {
          const { body } = parse(code, { ecmaVersion: 2_015, sourceType: 'module' })
          // Work backwards so each declaration's original offset remains valid.
          for (const declaration of body.reverse()) {
            if (
              declaration.type === 'ExportNamedDeclaration' ||
              declaration.type === 'ExportDefaultDeclaration' ||
              declaration.type === 'ExportAllDeclaration'
            ) {
              output = `${output.slice(0, declaration.start)}\n${output.slice(declaration.start)}`
            }
          }
        }
        writeFileSync(path, `${banner}\n${output}\n`)
      }
    },
  }
}

const umd = {
  format: 'umd',
  globalName: 'mediumZoom',
  outputOptions: { exports: 'default', intro: '"use strict";' },
} satisfies UserConfig

const formats = {
  esm: { format: 'esm', minify: true, outputOptions: {} },
  umd: { ...umd, minify: false },
  minified: { ...umd, minify: true },
} satisfies Record<string, UserConfig>

type Format = keyof typeof formats
interface Entry {
  source: string
  plugins: () => TsdownPlugin[]
  outputs: Record<Format, string>
}

const entries = [
  {
    source: 'src/index.js',
    plugins: () => [stylesheet()],
    outputs: {
      esm: 'medium-zoom.esm.js',
      umd: 'medium-zoom.js',
      minified: 'medium-zoom.min.js',
    },
  },
  {
    source: 'src/medium-zoom.js',
    plugins: () => [],
    outputs: {
      esm: 'pure/index.js',
      umd: 'pure/medium-zoom.umd.js',
      minified: 'pure/medium-zoom.min.umd.js',
    },
  },
] satisfies Entry[]

const shared = {
  platform: 'browser',
  target: 'esnext',
  dts: false,
  clean: false,
  unbundle: false,
  define: { __TEST__: 'false' },
  banner,
  failOnWarn: true,
} satisfies UserConfig

export default defineConfig(
  entries.flatMap(entry =>
    Object.entries(entry.outputs).map(([name, fileName]): UserConfig => {
      const format = formats[name as Format]
      return {
        ...shared,
        ...format,
        entry: { 'medium-zoom': entry.source },
        outputOptions: { ...format.outputOptions, entryFileNames: fileName },
        plugins: [...entry.plugins(), legacySyntax({ minify: format.minify })],
      }
    })
  )
)
