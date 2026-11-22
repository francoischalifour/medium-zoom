import { createZoom } from 'medium-zoom/core'
import { galleryControls } from 'medium-zoom/gallery'
import { loadHdImage } from 'medium-zoom/loaders'
import { dialog } from 'medium-zoom/renderers'
import { slide } from 'medium-zoom/transitions'
import { bindZoomTriggers } from 'medium-zoom/triggers'

import 'medium-zoom/gallery.css'

// Phones give the image the full width; the controls sit over it.
const phone = matchMedia('(max-width: 600px)')
const margin = () => (phone.matches ? 0 : 24)

const zoom = createZoom('.gallery img', {
  loader: loadHdImage,
  margin: margin(),
  renderer: dialog({ content: galleryControls(), transition: slide() }),
})

phone.addEventListener('change', () => zoom.update({ margin: margin() }))
bindZoomTriggers(zoom)

Object.assign(window, { zoom })
