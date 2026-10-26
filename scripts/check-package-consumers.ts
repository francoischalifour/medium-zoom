import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, cpSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { build, createServer } from 'vite'

import type { pack } from './pack.ts'

export async function checkConsumers(artifact: ReturnType<typeof pack>, experimental = false) {
  const consumer = join(artifact.directory, 'consumer')
  mkdirSync(join(consumer, 'node_modules'), { recursive: true })
  const packageRoot = join(consumer, 'node_modules/medium-zoom')
  cpSync(artifact.root, packageRoot, { recursive: true })
  const fixtures = experimental ? 'tests/experimental/types' : 'tests/types'
  for (const file of ['consumer.ts', 'commonjs.cts', 'node-esm.mts', 'runtime.mjs']) {
    copyFileSync(join(fixtures, file), join(consumer, file))
  }

  copyFileSync('tests/types/bundler.mjs', join(consumer, 'bundler.mjs'))

  if (experimental) {
    for (const extension of ['ts', 'cts', 'mts']) {
      copyFileSync(
        join(fixtures, 'features-consumer.ts'),
        join(consumer, `features-consumer.${extension}`)
      )
    }
  }

  if (!experimental) {
    const unpublished = [
      'core',
      'features',
      'renderers',
      'dist/renderers/index.mjs',
      'dist/renderers/index.cjs',
      'compat',
      'compat/pure',
      'modern',
      'pure',
      'dist/core/index.mjs',
      'dist/features/index.mjs',
      'dist/modern/index.mjs',
      'dist/compat/index.mjs',
      'dist/pure/index.mjs',
      'dist/pure/index.cjs',
    ]
    writeFileSync(
      join(consumer, 'unpublished.ts'),
      unpublished
        .map(
          (path, index) =>
            `// @ts-expect-error Unpublished APIs must not resolve from the release tarball.\nimport * as candidate${index} from 'medium-zoom/${path}'\nvoid candidate${index}`
        )
        .join('\n') +
        `\nimport mediumZoom from 'medium-zoom'\n// @ts-expect-error Modal trigger options are private to the experimental core.\nvoid mediumZoom().open({ trigger: document.createElement('button') })`
    )
  }

  checkTypes(consumer, experimental)
  await checkBundlerResolution(consumer, packageRoot, experimental)
  await checkBundlerConsumer(consumer)

  // Use Node, not Bun's more permissive module loader, for real package resolution.
  for (const file of ['output/commonjs.cjs', 'runtime.mjs']) {
    execFileSync('node', [join(consumer, file)], { cwd: consumer, stdio: 'inherit' })
  }
}

function checkTypes(consumer: string, experimental: boolean) {
  // Configuration belongs to each case; names are only diagnostic labels.
  const cases = [
    {
      name: 'features-bundler',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      file: 'features-consumer.ts',
    },
    {
      name: 'features-legacy',
      module: 'ESNext',
      moduleResolution: 'Node10',
      file: 'features-consumer.ts',
      compiler: 'typescript-legacy',
      esModuleInterop: false,
    },
    {
      name: 'features-commonjs',
      module: 'Node16',
      moduleResolution: 'Node16',
      file: 'features-consumer.cts',
    },
    {
      name: 'features-node-esm',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      file: 'features-consumer.mts',
    },
    {
      name: 'unpublished-boundary',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      file: 'unpublished.ts',
    },
    { name: 'bundler', module: 'ESNext', moduleResolution: 'Bundler', file: 'consumer.ts' },
    {
      name: 'legacy',
      module: 'ESNext',
      moduleResolution: 'Node10',
      file: 'consumer.ts',
      compiler: 'typescript-legacy',
      esModuleInterop: false,
    },
    {
      name: 'commonjs',
      module: 'Node16',
      moduleResolution: 'Node16',
      file: 'commonjs.cts',
      noEmit: false,
    },
    { name: 'node-esm', module: 'Node16', moduleResolution: 'Node16', file: 'node-esm.mts' },
    { name: 'nodenext', module: 'NodeNext', moduleResolution: 'NodeNext', file: 'node-esm.mts' },
  ].filter(({ name }) =>
    experimental ? name !== 'unpublished-boundary' : !name.startsWith('features-')
  )
  for (const {
    name,
    module,
    moduleResolution,
    file,
    compiler = 'typescript',
    noEmit = true,
    esModuleInterop,
  } of cases) {
    const config = join(consumer, `tsconfig.${name}.json`)
    // An isolated config avoids workspace paths, ambient @types, and skipLibCheck.
    writeFileSync(
      config,
      JSON.stringify({
        compilerOptions: {
          strict: true,
          skipLibCheck: false,
          target: 'ES2020',
          lib: ['ES2020', 'DOM'],
          types: [],
          module,
          moduleResolution,
          esModuleInterop,
          noEmit,
          outDir: './output',
        },
        files: [file],
      })
    )
    execFileSync('node', [resolve(`node_modules/${compiler}/bin/tsc`), '-p', config], {
      cwd: consumer,
      stdio: 'inherit',
    })
    console.log(`Packed TypeScript consumer: ${name}`)
  }
}

async function checkBundlerResolution(
  consumer: string,
  packageRoot: string,
  experimental: boolean
) {
  const server = await createServer({
    configFile: false,
    root: consumer,
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    const paths = [
      ['medium-zoom', 'dist/medium-zoom.esm.js'],
      ['medium-zoom/dist/pure', 'dist/pure/index.js'],
      ['medium-zoom/dist/pure/index.js', 'dist/pure/index.js'],
    ]
    if (experimental) {
      paths.push(
        ['medium-zoom/compat', 'dist/compat/index.mjs'],
        ['medium-zoom/compat/pure', 'dist/compat/pure/index.mjs'],
        ['medium-zoom/modern', 'dist/modern/index.mjs'],
        ['medium-zoom/modern/style.css', 'dist/modern/style.css'],
        ['medium-zoom/compat/style.css', 'dist/style.css'],
        ['medium-zoom/pure', 'dist/pure/index.mjs'],
        ['medium-zoom/style.css', 'dist/style.css'],
        ['medium-zoom/core', 'dist/core/index.mjs'],
        ['medium-zoom/features', 'dist/features/index.mjs'],
        ['medium-zoom/renderers', 'dist/renderers/index.mjs']
      )
    }
    for (const [specifier, path] of paths) {
      const resolved = await server.environments.client.pluginContainer.resolveId(
        specifier,
        join(consumer, 'consumer.ts')
      )
      assert.equal(resolved?.id, realpathSync(join(packageRoot, path)), specifier)
    }
  } finally {
    await server.close()
  }
}

async function checkBundlerConsumer(consumer: string) {
  await build({
    configFile: false,
    root: consumer,
    logLevel: 'warn',
    build: {
      outDir: 'bundled',
      lib: {
        entry: join(consumer, 'bundler.mjs'),
        formats: ['es'],
        fileName: () => 'consumer.mjs',
      },
    },
  })
  execFileSync('node', [join(consumer, 'bundled/consumer.mjs')], {
    cwd: consumer,
    stdio: 'inherit',
  })
}
