import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { createElement, StrictMode } from 'react'
import { renderToString } from 'react-dom/server'

import { App } from '../src/App'
import { DocsPage } from '../src/docs/DocsPage'
import { docsPages } from '../src/docs/pages'
import { NotFoundPage } from '../src/NotFoundPage'

export function prerenderWebsite(directory: string) {
  const pages = [
    { file: '404.html', element: createElement(NotFoundPage) },
    { file: 'index.html', element: createElement(App, { page: 'javascript' }) },
    { file: 'react.html', element: createElement(App, { page: 'react' }) },
    ...docsPages.map(page => ({
      file: `${page.path.slice(1)}index.html`,
      element: createElement(DocsPage, { path: page.path }),
    })),
  ]
  const outlet = '<div id="root"></div>'
  for (const { file, element } of pages) {
    const path = join(directory, file)
    const template = readFileSync(path, 'utf8')
    if (!template.includes(outlet)) {
      throw new Error(`Missing React outlet: ${file}`)
    }
    const markup = renderToString(createElement(StrictMode, null, element))
    writeFileSync(path, template.replace(outlet, `<div id="root">${markup}</div>`))
  }
}
