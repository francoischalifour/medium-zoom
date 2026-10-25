import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createServer } from 'vite'
import type { pack } from './pack.ts'

export async function checkConsumers(artifact: ReturnType<typeof pack>) {
  const consumer = join(artifact.directory, 'consumer')
  mkdirSync(join(consumer, 'node_modules'), { recursive: true })
  symlinkSync(artifact.root, join(consumer, 'node_modules/medium-zoom'), 'dir')
  for (const file of ['consumer.ts', 'commonjs.cts', 'node-esm.mts', 'runtime.mjs'])
    copyFileSync(join('tests/types', file), join(consumer, file))

  // An isolated config avoids workspace paths, ambient @types, and skipLibCheck.
  const cases = [
    { name: 'bundler', module: 'ESNext', moduleResolution: 'Bundler', file: 'consumer.ts' },
    { name: 'legacy', module: 'ESNext', moduleResolution: 'Node10', file: 'consumer.ts' },
    { name: 'commonjs', module: 'Node16', moduleResolution: 'Node16', file: 'commonjs.cts' },
    { name: 'node-esm', module: 'Node16', moduleResolution: 'Node16', file: 'node-esm.mts' },
    { name: 'nodenext', module: 'NodeNext', moduleResolution: 'NodeNext', file: 'node-esm.mts' },
  ]
  for (const { name, module, moduleResolution, file } of cases) {
    const emit = name === 'commonjs'
    const config = join(consumer, `tsconfig.${name}.json`)
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
          ...(name === 'legacy' ? { esModuleInterop: false } : {}),
          noEmit: !emit,
          outDir: './output',
        },
        files: [file],
      })
    )
    execFileSync(
      'node',
      [
        resolve(`node_modules/${name === 'legacy' ? 'typescript-legacy' : 'typescript'}/bin/tsc`),
        '-p',
        config,
      ],
      {
        cwd: consumer,
        stdio: 'inherit',
      }
    )
    console.log(`Packed TypeScript consumer: ${name}`)
  }
  const server = await createServer({
    configFile: false,
    root: consumer,
    server: { middlewareMode: true },
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  try {
    for (const [specifier, path] of [
      ['medium-zoom', 'dist/medium-zoom.esm.js'],
      ['medium-zoom/dist/pure', 'dist/pure/index.js'],
      ['medium-zoom/dist/pure/index.js', 'dist/pure/index.js'],
    ]) {
      const resolved = await server.environments.client.pluginContainer.resolveId(
        specifier,
        join(consumer, 'consumer.ts')
      )
      assert.equal(resolved?.id, realpathSync(join(artifact.root, path)), specifier)
    }
  } finally {
    await server.close()
  }
  // Use Node, not Bun's more permissive module loader, for real package resolution.
  for (const file of ['output/commonjs.cjs', 'runtime.mjs'])
    execFileSync('node', [join(consumer, file)], { cwd: consumer, stdio: 'inherit' })
}
