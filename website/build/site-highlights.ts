import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { codeToHtml } from '@pierre/highlights'
import { githubLightDefault, githubDarkDefault } from '@pierre/highlights/themes'
import type { Plugin } from 'vite'

import { photos, usageCode, javascriptUsageCode } from '../src/gallery.ts'
import { javascriptCommands, componentCommands } from '../src/install-commands.ts'
import { usageExamples } from '../src/usage-snippets.ts'

type HighlightLanguage =
  | 'html'
  | 'tsx'
  | 'js'
  | 'vue'
  | 'svelte'
  | 'angular-ts'
  | 'astro'
  | 'bash'
  | 'css'

// Fence names label code blocks; some highlight with another grammar.
const fenceGrammars: Record<string, HighlightLanguage> = { solid: 'tsx', angular: 'angular-ts' }

function highlight(code: string, lang: HighlightLanguage) {
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
const examples = new URL('examples/', docs)

// Trusted, escaped token markup for every code sample on the site, keyed by its source.
// Served as a virtual module so the static page and React hydration share it without a
// generated file in the repository.
function highlightSnippets(watch: (file: string) => void) {
  const snippets: Record<string, string> = {
    [javascriptUsageCode]: highlight(javascriptUsageCode, 'js'),
  }
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
    for (const kind of ['javascript', 'react'] as const) {
      const code = usageCode(image, kind)
      snippets[code] = highlight(code, kind === 'react' ? 'tsx' : 'html')
    }
  }
  for (const file of readdirSync(docs).filter(file => file.endsWith('.mdx'))) {
    const path = new URL(file, docs)
    watch(fileURLToPath(path))
    for (const [, lang, code] of readFileSync(path, 'utf8').matchAll(
      /^```(js|tsx|solid|vue|svelte|angular|astro|html|bash|css)\n([\s\S]*?)^```/gm
    )) {
      const language = fenceGrammars[lang] ?? (lang as HighlightLanguage)
      snippets[code.trim()] = highlight(code.trim(), language)
    }
  }
  for (const file of readdirSync(examples)) {
    const path = new URL(file, examples)
    watch(fileURLToPath(path))
    const code = readFileSync(path, 'utf8').trim()
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
      if (id === moduleId) {
        return `\0${moduleId}`
      }
    },
    load(id) {
      if (id === `\0${moduleId}`) {
        const snippets = highlightSnippets(file => this.addWatchFile(file))
        return `export default ${JSON.stringify(snippets)}`
      }
    },
  }
}
