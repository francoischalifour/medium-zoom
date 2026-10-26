import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transformSync } from '@babel/core'
import { parse } from 'acorn'
import { transform as transformCss } from 'lightningcss'
import { minify as minifyJavaScript } from 'terser'
import { defineConfig } from 'tsdown'
import type { TsdownPlugin, UserConfig } from 'tsdown'
import pkg from '../package.json' with { type: 'json' }

const banner = `/*! ${pkg.name} ${pkg.version} | ${pkg.license} License | https://github.com/${pkg.repository} */`
const stylesheetPath = new URL('../src/medium-zoom.css', import.meta.url)
// Restrict property mangling to private per-opening state, excluding public options and DOM APIs.
const privateSessionProperties =
  /^__mz_(original|zoomed|nodes|template|closing|cancelOpen|viewportScale|isPinching|scrollTimer)$/

type Profile = 'modern' | 'compat'

// Switch this profile for the v2 default; explicit compat stays stable.
const defaultProfile: Profile = 'compat'

function stylesheet(profile: Profile): TsdownPlugin {
  return {
    name: 'medium-zoom-stylesheet',
    resolveId(source) {
      if (source === './medium-zoom.css') return '\0medium-zoom-stylesheet'
    },
    load(id) {
      if (id !== '\0medium-zoom-stylesheet') return
      this.addWatchFile(stylesheetPath.pathname)
      const source = readFileSync(stylesheetPath, 'utf8')
      const css = transformCss({
        filename: stylesheetPath.pathname,
        code: Buffer.from(
          profile === 'compat'
            ? source.replace(/cursor: (zoom-(?:in|out));/g, 'cursor: pointer;\n  cursor: $1;')
            : source
        ),
        minify: true,
        targets:
          profile === 'compat'
            ? { ie: 10 << 16 }
            : { chrome: 80 << 16, firefox: 78 << 16, safari: 14 << 16 },
      }).code.toString()
      this.emitFile({
        type: 'asset',
        fileName: profile === 'compat' ? 'style.css' : 'modern/style.css',
        source: css,
      })
      return `if (typeof document !== 'undefined') {
        var style = document.createElement('style');
        style.textContent = ${JSON.stringify(css)};
        document.head.appendChild(style);
      }`
    },
  }
}

function browserSyntax(profile: Profile, minify: boolean): TsdownPlugin {
  return {
    name: `medium-zoom-${profile}-syntax`,
    generateBundle(_options, bundle) {
      // Preserve the older declaration syntax of the existing root and pure entries.
      for (const fileName of ['medium-zoom.d.ts', 'pure/index.d.ts']) {
        const declaration = bundle[fileName]
        if (declaration?.type !== 'chunk') continue
        declaration.code = declaration.code.replace(
          /export \{([^}]+)\}/g,
          (_match, names: string) => `export {${names.replace(/\btype\s+/g, '')}}`
        )
      }
    },
    async renderChunk(source, chunk, options) {
      if (chunk.name.endsWith('.d')) return
      const result =
        profile === 'compat'
          ? transformSync(source, {
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
          : { code: source }
      if (!result?.code) throw new Error('The browser syntax transform did not emit code')
      const code = minify
        ? (
            await minifyJavaScript(result.code, {
              ecma: profile === 'compat' ? 5 : 2_020,
              module: options.format === 'es',
              // CJS bindings are module-local, just like ESM bindings.
              ...(options.format === 'cjs' && { toplevel: true }),
              mangle: { properties: { regex: privateSessionProperties } },
              // Core and features are bundled independently: their session keys must agree.
              nameCache: {
                props: {
                  props: {
                    $__mz_original: 'o',
                    $__mz_zoomed: 'z',
                    $__mz_nodes: 'n',
                    $__mz_template: 't',
                    $__mz_closing: 'c',
                    $__mz_cancelOpen: 'a',
                    $__mz_viewportScale: 'v',
                    $__mz_isPinching: 'p',
                    $__mz_scrollTimer: 's',
                  },
                },
              },
              format: { comments: /^!/ },
            })
          ).code
        : result.code
      if (!code) throw new Error('The browser minifier did not emit code')
      // Line-based package analyzers can mistake URL strings for comments.
      // Keep ESM exports visible on their own lines regardless of minifier formatting.
      let output = code
      if (options.format === 'es') {
        const { body } = parse(code, {
          ecmaVersion: profile === 'compat' ? 2_015 : 2_020,
          sourceType: 'module',
        })
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
  format: 'esm' | 'umd' | 'cjs',
  minify = true,
  profile: Profile = defaultProfile
): UserConfig {
  return {
    cwd: fileURLToPath(new URL('../', import.meta.url)),
    entry: { 'medium-zoom': source },
    platform: 'browser',
    // Keep editor paths from overriding the runtime platform alias.
    tsconfig: false,
    target: profile === 'compat' ? 'esnext' : 'es2020',
    alias: {
      '#platform': fileURLToPath(new URL(`../src/platform/${profile}.ts`, import.meta.url)),
    },
    dts: false,
    clean: false,
    unbundle: false,
    define: { __TEST__: 'false' },
    // Tsdown applies the release banner after renderChunk via Rolldown postBanner.
    banner,
    failOnWarn: true,
    format,
    globalName: 'mediumZoom',
    // Apply profile-specific lowering and minification once in the output plugin.
    minify: false,
    outputOptions: {
      entryFileNames: chunk =>
        chunk.name.endsWith('.d')
          ? /\.[mc]js$/.test(fileName)
            ? fileName.replace(/\.([mc])js$/, '.d.$1ts')
            : fileName.replace(/(?:\.esm)?\.js$/, '.d.ts')
          : fileName,
      ...(format === 'umd' && { exports: 'default', intro: '"use strict";' }),
      ...(format === 'cjs' && { intro: '"use strict";' }),
    },
    plugins: [stylesheet(profile), browserSyntax(profile, minify)],
  }
}

function featureBundle(
  name: 'core' | 'features' | 'pure' | 'compat' | 'compat/pure' | 'modern',
  format: 'esm' | 'cjs'
): UserConfig {
  const sources = {
    core: 'src/core.ts',
    features: 'src/features/index.ts',
    pure: format === 'cjs' ? 'src/pure-commonjs.ts' : 'src/pure.ts',
    'compat/pure': format === 'cjs' ? 'src/pure-commonjs.ts' : 'src/pure.ts',
    compat: format === 'cjs' ? 'src/index-commonjs.ts' : 'src/index.ts',
    modern: format === 'cjs' ? 'src/index-commonjs.ts' : 'src/index.ts',
  }
  const source = sources[name]
  const profile: Profile =
    name === 'compat' || name === 'compat/pure'
      ? 'compat'
      : name === 'pure'
        ? defaultProfile
        : 'modern'
  const full = name !== 'core' && name !== 'features'
  return {
    ...browserBundle(
      source,
      `${name}/index.${format === 'esm' ? 'mjs' : 'cjs'}`,
      format,
      true,
      profile
    ),
    entry: { [`${name}/index`]: source },
    // Keep the opaque feature type shared with the core declaration entry.
    deps: { neverBundle: ['medium-zoom/core'] },
    dts: {
      generator: 'oxc',
      tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
      cjsDefault: full && format === 'cjs',
    },
    plugins: [
      ...(name === 'compat' || name === 'modern' ? [stylesheet(profile)] : []),
      browserSyntax(profile, true),
    ],
    ...(full &&
      format === 'cjs' && {
        onSuccess(config) {
          // CJS declarations are emitted in a separate pipeline without runtime plugins.
          const path = join(config.outDir, `${name}/index.d.cts`)
          const names = ['ZoomOptions', 'ZoomSelector', 'ZoomContainer', 'ZoomOpenOptions']
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
    ...browserBundle('src/index.ts', 'medium-zoom.esm.js', 'esm'),
    dts: {
      generator: 'oxc',
      tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
    },
  },
  browserBundle('src/index.ts', 'medium-zoom.js', 'umd', false),
  browserBundle('src/index.ts', 'medium-zoom.min.js', 'umd'),
  {
    ...browserBundle('src/medium-zoom.ts', 'pure/index.js', 'esm'),
    dts: {
      generator: 'oxc',
      tsconfig: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
    },
  },
  browserBundle('src/medium-zoom.ts', 'pure/medium-zoom.umd.js', 'umd', false),
  browserBundle('src/medium-zoom.ts', 'pure/medium-zoom.min.umd.js', 'umd'),
  featureBundle('core', 'esm'),
  featureBundle('features', 'esm'),
  featureBundle('core', 'cjs'),
  featureBundle('features', 'cjs'),
  featureBundle('pure', 'esm'),
  featureBundle('pure', 'cjs'),
  featureBundle('compat', 'esm'),
  featureBundle('compat', 'cjs'),
  featureBundle('compat/pure', 'esm'),
  featureBundle('compat/pure', 'cjs'),
  featureBundle('modern', 'esm'),
  featureBundle('modern', 'cjs'),
])
