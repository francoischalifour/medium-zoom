import type { Plugin } from 'vite'

export function siteFonts(): Plugin {
  return {
    name: 'medium-zoom-site-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        return Object.keys(context.bundle || {})
          .filter(filename => filename.endsWith('.woff2'))
          .map(filename => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `/${filename}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
            },
            injectTo: 'head',
          }))
      },
    },
  }
}
