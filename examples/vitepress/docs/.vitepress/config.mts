import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Medium Zoom',
  description: 'Medium Zoom VitePress demo',
  outDir: '../dist',
  themeConfig: {
    sidebar: [
      {
        text: 'Demo',
        items: [
          { text: 'Getting started', link: '/' },
          { text: 'Gallery', link: '/gallery' },
        ],
      },
    ],
  },
})
