import mediumZoom from 'medium-zoom'
import pure from 'medium-zoom/dist/pure'
import pureIndex from 'medium-zoom/dist/pure/index.js'

for (const zoom of [mediumZoom, pure, pureIndex]) {
  if (typeof zoom !== 'function') {
    throw new Error('A bundled package import must provide the zoom factory')
  }
}
