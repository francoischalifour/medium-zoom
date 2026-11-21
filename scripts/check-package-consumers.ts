import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

import { build, createServer } from 'vite'

import { candidateEntries } from '../config/package.config.mts'
import type { pack } from './pack.ts'

export async function checkConsumers(
  artifact: ReturnType<typeof pack>,
  experimental = false
) {
  const consumer = join(artifact.directory, 'consumer')
  mkdirSync(join(consumer, 'node_modules'), { recursive: true })
  const packageRoot = join(consumer, 'node_modules/medium-zoom')
  cpSync(artifact.root, packageRoot, { recursive: true })
  const fixtures = experimental ? 'tests/experimental/types' : 'tests/types'
  for (const file of [
    'consumer.ts',
    'commonjs.cts',
    'node-esm.mts',
    'runtime.mjs',
  ]) {
    copyFileSync(join(fixtures, file), join(consumer, file))
  }

  copyFileSync('tests/types/bundler.mjs', join(consumer, 'bundler.mjs'))

  if (experimental) {
    for (const extension of ['ts', 'cts', 'mts']) {
      copyFileSync(
        join(fixtures, 'strategies-consumer.ts'),
        join(consumer, `strategies-consumer.${extension}`)
      )
    }
  } else {
    const unpublished = [
      ...new Set([
        ...candidateEntries.map(entry => entry.name),
        ...candidateEntries.flatMap(entry => [entry.esm, entry.cjs]),
        'features',
        'controls',
        'dist/features/index.mjs',
        'dist/controls/index.mjs',
      ]),
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
    execFileSync('node', [join(consumer, file)], {
      cwd: consumer,
      stdio: 'inherit',
    })
  }
}

interface TypeCase {
  /** Diagnostic label; also names the generated tsconfig. */
  name: string
  /** The packed manifest whose fixtures this case compiles; both when omitted. */
  manifest?: 'release' | 'candidate'
  module: string
  moduleResolution: string
  file: string
  compiler?: 'typescript' | 'typescript-legacy'
  esModuleInterop?: boolean
  noEmit?: boolean
}

const typeCases: TypeCase[] = [
  {
    name: 'strategies-bundler',
    manifest: 'candidate',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    file: 'strategies-consumer.ts',
  },
  {
    name: 'strategies-legacy',
    manifest: 'candidate',
    module: 'ESNext',
    moduleResolution: 'Node10',
    file: 'strategies-consumer.ts',
    compiler: 'typescript-legacy',
    esModuleInterop: false,
  },
  {
    name: 'strategies-commonjs',
    manifest: 'candidate',
    module: 'Node16',
    moduleResolution: 'Node16',
    file: 'strategies-consumer.cts',
  },
  {
    name: 'strategies-node-esm',
    manifest: 'candidate',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    file: 'strategies-consumer.mts',
  },
  {
    name: 'unpublished-boundary',
    manifest: 'release',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    file: 'unpublished.ts',
  },
  {
    name: 'bundler',
    module: 'ESNext',
    moduleResolution: 'Bundler',
    file: 'consumer.ts',
  },
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
  {
    name: 'node-esm',
    module: 'Node16',
    moduleResolution: 'Node16',
    file: 'node-esm.mts',
  },
  {
    name: 'nodenext',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    file: 'node-esm.mts',
  },
]

function checkTypes(consumer: string, experimental: boolean) {
  const manifest = experimental ? 'candidate' : 'release'
  const cases = typeCases.filter(
    typeCase => (typeCase.manifest ?? manifest) === manifest
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
    execFileSync(
      'node',
      [resolve(`node_modules/${compiler}/bin/tsc`), '-p', config],
      {
        cwd: consumer,
        stdio: 'inherit',
      }
    )
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
        ...candidateEntries.map(
          entry => [entry.path, entry.esm] as [string, string]
        ),
        ['medium-zoom/modern/style.css', 'dist/modern/style.css'],
        ['medium-zoom/compat/style.css', 'dist/style.css'],
        ['medium-zoom/style.css', 'dist/style.css']
      )
    }
    for (const [specifier, path] of paths) {
      const resolved =
        await server.environments.client.pluginContainer.resolveId(
          specifier,
          join(consumer, 'consumer.ts')
        )
      assert.equal(
        resolved?.id,
        realpathSync(join(packageRoot, path)),
        specifier
      )
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
