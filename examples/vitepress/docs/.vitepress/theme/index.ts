import mediumZoom, { type Zoom } from 'medium-zoom'
import { onContentUpdated, type Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import './style.css'

export default {
  extends: DefaultTheme,
  setup() {
    let zoom: Zoom | undefined

    onContentUpdated(() => {
      zoom ??= mediumZoom({ background: 'var(--vp-c-bg)' })
      zoom.detach().attach('.vp-doc :not(a) > img')
    })
  },
} satisfies Theme
