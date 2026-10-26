import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import ts from 'typescript-legacy'

// Check the exact authored fences, including short follow-on examples that use `zoom`.
// Live examples are regular TypeScript modules checked by the website's tsconfig.
const docsDirectory = resolve('website/src/docs')
const snippetSources = new Map<string, string>()
for (const file of readdirSync(docsDirectory).filter(file => file.endsWith('.mdx'))) {
  const text = readFileSync(resolve(docsDirectory, file), 'utf8')
  let snippetIndex = 0
  for (const [, language, code] of text.matchAll(/^```(js|tsx)\n([\s\S]*?)^```/gm)) {
    const zoomDeclaration =
      /\bzoom\./.test(code) && !/\bconst zoom\b/.test(code)
        ? "import type { Zoom } from 'medium-zoom'; declare const zoom: Zoom;\n"
        : ''
    snippetSources.set(
      resolve(docsDirectory, `${file}-${snippetIndex++}.${language === 'tsx' ? 'tsx' : 'ts'}`),
      `${zoomDeclaration}${code}\nexport {}\n`
    )
  }
}
const configPath = resolve('website/tsconfig.json')
const config = ts.readConfigFile(configPath, file => ts.sys.readFile(file))
const { options } = ts.parseJsonConfigFileContent(config.config, ts.sys, resolve('website'))
const host = ts.createCompilerHost(options)
const readFile = host.readFile.bind(host)
const fileExists = host.fileExists.bind(host)
host.readFile = file => snippetSources.get(resolve(file)) ?? readFile(file)
host.fileExists = file => snippetSources.has(resolve(file)) || fileExists(file)
const program = ts.createProgram([...snippetSources.keys()], options, host)
const diagnostics = ts.getPreEmitDiagnostics(program)
if (diagnostics.length) {
  process.stderr.write(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: file => file,
      getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
      getNewLine: () => '\n',
    })
  )
  process.exitCode = 1
} else console.log('Authored documentation examples compile against the public API.')
