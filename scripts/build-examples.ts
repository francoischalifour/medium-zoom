import { spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { build } from 'vite'

import { localExampleConfig } from '../config/vite.examples.config.mts'
import { exampleNames } from './example-names.ts'

// The repository root is the medium-zoom package the website demos exercise.
const localPackage = resolve('.')

interface FrameworkBuildOptions {
  root: string
  base: string
  workDirectory: string
}

// Examples built by their own framework CLI. Each build returns the directory of its static site.
const frameworkBuilds: Record<string, (options: FrameworkBuildOptions) => Promise<string>> = {
  angular: buildAngular,
  astro: buildAstro,
}

for (const name of exampleNames) {
  const buildWithFramework = frameworkBuilds[name]
  if (!buildWithFramework) {
    await build(await localExampleConfig({ name, command: 'build' }))
    continue
  }
  const workDirectory = mkdtempSync(join(tmpdir(), `medium-zoom-${name}-`))
  try {
    const site = await buildWithFramework({
      root: resolve('examples', name),
      base: `/examples/${name}/`,
      workDirectory,
    })
    publishExample(name, site)
  } finally {
    rmSync(workDirectory, { recursive: true, force: true })
  }
}

// The Angular CLI has no alias option, so a TypeScript path points medium-zoom at this repository.
async function buildAngular({ root, base, workDirectory }: FrameworkBuildOptions) {
  const tsConfig = join(workDirectory, 'tsconfig.json')
  writeFileSync(
    tsConfig,
    JSON.stringify({
      extends: join(root, 'tsconfig.app.json'),
      compilerOptions: { paths: { 'medium-zoom': [localPackage] } },
    })
  )
  const outputPath = join(workDirectory, 'dist')
  const { status } = spawnSync(
    join(root, 'node_modules/.bin/ng'),
    [
      'build',
      `--base-href=${base}`,
      `--ts-config=${relative(root, tsConfig)}`,
      `--output-path=${outputPath}`,
    ],
    { cwd: root, stdio: 'inherit' }
  )
  if (status !== 0) {
    throw new Error(`Angular example build failed (${status})`)
  }
  return join(outputPath, 'browser')
}

// Resolve every medium-zoom import, including its pure entry and stylesheet, to this repository.
async function buildAstro({ root, base, workDirectory }: FrameworkBuildOptions) {
  const astro = await import(
    import.meta.resolve('astro', pathToFileURL(join(root, 'package.json')).href)
  )
  const outDir = join(workDirectory, 'dist')
  await astro.build({
    root,
    base,
    outDir,
    logLevel: 'warn',
    vite: { resolve: { alias: { 'medium-zoom': localPackage } } },
  })
  return outDir
}

// Copy a static site into the website and keep it out of search results.
function publishExample(name: string, site: string) {
  const output = resolve('website/dist/examples', name)
  rmSync(output, { recursive: true, force: true })
  cpSync(site, output, { recursive: true })
  const page = join(output, 'index.html')
  writeFileSync(
    page,
    readFileSync(page, 'utf8').replace(
      '</head>',
      '<meta name="robots" content="noindex,follow"></head>'
    )
  )
}
