import type { Plugin } from 'vite'

// The prerendered page can paint without waiting for a separate stylesheet request.
export function siteStyles(): Plugin {
  return {
    name: 'medium-zoom-site-styles',
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        if (!bundle) return html
        return html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, tag => {
          const href = tag.match(/href="([^"]+)"/)?.[1]
          const asset = href && bundle[href.replace(/^\//, '')]
          if (!asset || asset.type !== 'asset' || typeof asset.source !== 'string') return tag
          return `<style>${asset.source.replace(/<\/style/gi, '<\\/style')}</style>`
        })
      },
    },
  }
}
