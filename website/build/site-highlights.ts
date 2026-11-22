import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { codeToHtml, isSupportedLanguage, type Lang } from '@pierre/highlights'
import {
  githubDarkDefault,
  githubLightDefault,
} from '@pierre/highlights/themes'
import type { Plugin } from 'vite'

import { javascriptUsageCode, photos, usageCode } from '../src/gallery.ts'
import {
  componentCommands,
  javascriptCommands,
} from '../src/install-commands.ts'
import { usageExamples } from '../src/usage-snippets.ts'

const usageLanguages = {
  javascript: 'html',
  react: 'tsx',
} as const satisfies Record<string, Lang>

// Fence names label code blocks; some highlight with another grammar.
const fenceGrammars: Readonly<Record<string, Lang | undefined>> = {
  solid: 'tsx',
  angular: 'angular-ts',
}

function highlight(code: string, lang: Lang) {
  const html = new TextDecoder().decode(
    codeToHtml(code, {
      lang,
      themes: { light: githubLightDefault, dark: githubDarkDefault },
      defaultColor: false,
    })
  )
  const match = html.match(/^<pre\b[^>]*><code>([\s\S]*)<\/code><\/pre>$/)
  if (!match) {
    throw new Error('Unexpected Highlights HTML wrapper')
  }
  return match[1]
}

const moduleId = 'virtual:highlighted-snippets'
const docs = new URL('../src/docs/', import.meta.url)
const docsModulePrefix = `${moduleId}/docs/`

// The virtual module gives prerendering and hydration the same token markup without a checked-in generated file.
function highlightSnippets(watch: (file: string) => void, source?: string) {
  const snippets: Record<string, string> = {}
  if (!source) {
    snippets[javascriptUsageCode] = highlight(javascriptUsageCode, 'js')
    for (const example of usageExamples) {
      snippets[example.code] = highlight(example.code, 'tsx')
    }
    for (const command of [
      ...Object.values(javascriptCommands),
      ...Object.values(componentCommands),
    ]) {
      snippets[command] = highlight(command, 'bash')
    }
    for (const image of Object.values(photos)) {
      for (const kind of Object.keys(
        usageLanguages
      ) as (keyof typeof usageLanguages)[]) {
        const code = usageCode(image, kind)
        snippets[code] = highlight(code, usageLanguages[kind])
      }
    }
    return snippets
  }
  const path = new URL(source, docs)
  watch(fileURLToPath(path))
  const markdown = readFileSync(path, 'utf8')
  for (const [, lang, code] of markdown.matchAll(
    /^```(js|ts|tsx|solid|vue|svelte|angular|astro|md|html|bash|css)\n([\s\S]*?)^```/gm
  )) {
    const language = fenceGrammars[lang] ?? lang
    if (!isSupportedLanguage(language)) {
      throw new Error(`Unsupported highlighting language: ${language}`)
    }
    snippets[code.trim()] = highlight(code.trim(), language)
  }
  // Live examples import their displayed source. Only ship the examples this article uses.
  const prose = markdown.replace(/^```[^\n]*\n[\s\S]*?^```/gm, '')
  for (const [, file] of prose.matchAll(/from ['"](.+?)\?raw['"]/g)) {
    const example = new URL(file, path)
    watch(fileURLToPath(example))
    const code = readFileSync(example, 'utf8').trim()
    snippets[code] = highlight(
      code,
      file.endsWith('.tsx') ? 'tsx' : file.endsWith('.css') ? 'css' : 'js'
    )
  }
  return snippets
}

export function siteHighlights(): Plugin {
  return {
    name: 'medium-zoom-site-highlights',
    resolveId(id) {
      if (id === moduleId || id.startsWith(docsModulePrefix)) {
        return `\0${id}`
      }
    },
    load(id) {
      if (id === `\0${moduleId}` || id.startsWith(`\0${docsModulePrefix}`)) {
        const snippets = highlightSnippets(
          file => this.addWatchFile(file),
          id === `\0${moduleId}`
            ? undefined
            : id.slice(docsModulePrefix.length + 1)
        )
        return `export default ${JSON.stringify(snippets)}`
      }
    },
  }
}
