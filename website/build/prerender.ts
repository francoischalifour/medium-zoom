import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement, StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from '../src/App'

export function prerenderWebsite(directory: string) {
  const pages = [
    ['library', 'index.html'],
    ['shadcn', 'examples/shadcn/index.html'],
  ] as const
  const outlet = '<div id="root"></div>'
  for (const [page, file] of pages) {
    const path = join(directory, file)
    const template = readFileSync(path, 'utf8')
    if (!template.includes(outlet)) throw new Error(`Missing React outlet: ${file}`)
    const markup = renderToString(createElement(StrictMode, null, createElement(App, { page })))
    writeFileSync(path, template.replace(outlet, `<div id="root">${markup}</div>`))
  }
}
