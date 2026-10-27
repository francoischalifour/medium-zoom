import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { transformSync } from '@babel/core'
import { parse } from 'acorn'
import { transform as transformCss } from 'lightningcss'
import { minify as minifyEs5 } from 'terser'
import { defineConfig } from 'tsdown'
import type { TsdownPlugin, UserConfig } from 'tsdown'

import pkg from '../package.json' with { type: 'json' }

const banner = `/*! ${pkg.name} ${pkg.version} | ${pkg.license} License | https://github.com/${pkg.repository} */`
const stylesheetPath = new URL('../src/medium-zoom.css', import.meta.url)
// Restrict property mangling to private per-opening state, excluding public options and DOM APIs.
const privateSessionProperties =
  /^__mz_(original|zoomed|zoomedHd|template|closing|cancelOpen|viewportScale|isPinching|scrollTimer)$/

function stylesheet(): TsdownPlugin {
  return {
    name: 'medium-zoom-stylesheet',
    resolveId(source) {
      if (source === './medium-zoom.css') {
        return '\0medium-zoom-stylesheet'
      }
    },
    load(id) {
      if (id !== '\0medium-zoom-stylesheet') {
        return
      }
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
  }
}

function legacySyntax(minify: boolean): TsdownPlugin {
  return {
    name: 'medium-zoom-legacy-syntax',
    async renderChunk(source, _chunk, options) {
      const result = transformSync(source, {
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
        presets: [['@babel/preset-env', { modules: false, exclude: ['transform-typeof-symbol'] }]],
        compact: minify,
        minified: minify,
        comments: true,
      })
      if (!result?.code) {
        throw new Error('Babel did not emit the browser bundle')
      }
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
      if (!code) {
        throw new Error('The ES5 minifier did not emit a browser bundle')
      }
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
      return { code: output, map: null }
    },
  }
}

function browserBundle(
  source: string,
  fileName: string,
  format: 'esm' | 'umd',
  minify = true
): UserConfig {
  return {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    entry: { 'medium-zoom': source },
    platform: 'browser',
    target: 'esnext',
    dts: false,
    clean: false,
    unbundle: false,
    define: { __TEST__: 'false' },
    // Tsdown applies the release banner after renderChunk via Rolldown postBanner.
    banner,
    failOnWarn: true,
    format,
    globalName: 'mediumZoom',
    // Babel lowers the complete bundle before Terser minifies it as ES5.
    // Rolldown's later minifier must not introduce modern syntax again.
    minify: false,
    outputOptions: {
      entryFileNames: fileName,
      ...(format === 'umd' && { exports: 'default', intro: '"use strict";' }),
    },
    plugins: [stylesheet(), legacySyntax(minify)],
  }
}

export default defineConfig([
  {
    ...browserBundle('src/index.js', 'medium-zoom.esm.js', 'esm'),
    copy: [
      { from: 'src/medium-zoom.d.ts' },
      { from: 'src/medium-zoom.d.ts', to: 'dist/pure', rename: 'index.d.ts' },
    ],
  },
  browserBundle('src/index.js', 'medium-zoom.js', 'umd', false),
  browserBundle('src/index.js', 'medium-zoom.min.js', 'umd'),
  browserBundle('src/medium-zoom.js', 'pure/index.js', 'esm'),
  browserBundle('src/medium-zoom.js', 'pure/medium-zoom.umd.js', 'umd', false),
  browserBundle('src/medium-zoom.js', 'pure/medium-zoom.min.umd.js', 'umd'),
])
