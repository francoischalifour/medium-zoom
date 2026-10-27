import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

import { codeToHtml } from '@pierre/highlights'
import { githubLightDefault, githubDarkDefault } from '@pierre/highlights/themes'
import type { Plugin } from 'vite'

import { photos, usageCode, javascriptUsageCode } from '../src/gallery.ts'
import { javascriptCommands, componentCommands } from '../src/install-commands.ts'
import { usageExamples } from '../src/usage-snippets.ts'

type HighlightLanguage = 'html' | 'tsx' | 'js' | 'bash' | 'css'

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

// Generate trusted, escaped token markup for both the static page and React hydration.
// Keeping this output in source also lets type checks and standalone SSR run before a build.
export function siteHighlights(): Plugin {
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
  const docs = new URL('../src/docs/', import.meta.url)
  for (const file of readdirSync(docs).filter(file => file.endsWith('.mdx'))) {
    const source = readFileSync(new URL(file, docs), 'utf8')
    for (const [, lang, code] of source.matchAll(/^```(js|tsx|html|bash|css)\n([\s\S]*?)^```/gm)) {
      snippets[code.trim()] = highlight(code.trim(), lang as HighlightLanguage)
    }
  }
  for (const file of readdirSync(new URL('examples/', docs))) {
    const code = readFileSync(new URL(`examples/${file}`, docs), 'utf8').trim()
    snippets[code] = highlight(
      code,
      file.endsWith('.tsx') ? 'tsx' : file.endsWith('.css') ? 'css' : 'js'
    )
  }
  return {
    name: 'medium-zoom-site-highlights',
    buildStart() {
      const path = new URL('../src/highlighted-snippets.json', import.meta.url)
      const output = `${JSON.stringify(snippets, null, 2)}\n`
      let previous = ''
      try {
        previous = readFileSync(path, 'utf8')
      } catch {}
      if (previous !== output) {
        writeFileSync(path, output)
      }
    },
  }
}
