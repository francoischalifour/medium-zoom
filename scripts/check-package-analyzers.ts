import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { publint } from 'publint'
import { formatMessage } from 'publint/utils'

interface AttwAnalysis {
  problems: {
    kind: string
    fileName?: string
    typesFileName?: string
    implementationFileName?: string
  }[]
  entrypoints: Record<string, { resolutions: Record<string, { visibleProblems: number[] }> }>
}

export async function checkAnalyzers(archive: string) {
  await checkPublint(archive)
  checkAttw(archive)
}

async function checkPublint(archive: string) {
  const result = await publint({
    pack: { tarball: new Uint8Array(readFileSync(archive)).buffer },
    level: 'warning',
  })
  for (const message of result.messages) console.log(formatMessage(message, result.pkg))
  // These established ESM .js paths cannot be renamed or put in a type:module
  // package without breaking v1's dist imports or callable UMD main.
  assert.deepEqual(
    result.messages,
    ['/dist/medium-zoom.esm.js', '/dist/pure/index.js'].map(actualFilePath => ({
      code: 'FILE_INVALID_FORMAT',
      args: {
        actualFormat: 'ESM',
        expectFormat: 'CJS',
        actualExtension: '.js',
        expectExtension: '.mjs',
        actualFilePath,
      },
      path: ['name'],
      type: 'warning',
    })),
    'Unexpected publint findings outside the v1 ESM .js compatibility exceptions'
  )
}

function checkAttw(archive: string) {
  // Explicitly include both typed pure paths: without exports, ATTW discovers
  // only the root by default. Other UMD paths are runtime-only (checked separately).
  const attw = spawnSync(
    resolve('node_modules/.bin/attw'),
    [archive, '--entrypoints', '.', './dist/pure', './dist/pure/index.js', '--format', 'json'],
    { encoding: 'utf8' }
  )
  assert.ifError(attw.error)
  assert(attw.status === 0 || attw.status === 1, attw.stderr)
  // Exit 1 means findings were reported; validate their exact scope below.
  const { analysis } = JSON.parse(attw.stdout) as { analysis: AttwAnalysis }
  const findings = analysis.problems.map(problem => ({
    kind: problem.kind,
    files: [problem.fileName, problem.typesFileName, problem.implementationFileName].filter(
      Boolean
    ),
  }))
  console.log('ATTW v1 compatibility findings:', findings)
  // v1's default-export types misdescribe the callable UMD. Switching to export =
  // would break legacy default imports and misdescribe the shared pure ESM types.
  assert.deepEqual(findings, [
    {
      kind: 'FalseExportDefault',
      files: [
        '/node_modules/medium-zoom/dist/medium-zoom.d.ts',
        '/node_modules/medium-zoom/dist/medium-zoom.min.js',
      ],
    },
    {
      kind: 'UnexpectedModuleSyntax',
      files: ['/node_modules/medium-zoom/dist/pure/index.js'],
    },
  ])
  const entrypoints = ['.', './dist/pure', './dist/pure/index.js']
  const modes = ['node10', 'node16-cjs', 'node16-esm', 'bundler']
  assert.deepEqual(Object.keys(analysis.entrypoints), entrypoints)
  for (const entry of entrypoints) {
    const { resolutions } = analysis.entrypoints[entry]
    assert.deepEqual(Object.keys(resolutions), modes)
    for (const mode of modes) {
      const actual = resolutions[mode].visibleProblems.map(index => analysis.problems[index].kind)
      let expected: string[] = []
      if (entry === '.') expected = ['FalseExportDefault']
      else if (mode.startsWith('node16-')) expected = ['UnexpectedModuleSyntax']
      assert.deepEqual(actual, expected, `${entry}: ${mode}`)
    }
  }
}
