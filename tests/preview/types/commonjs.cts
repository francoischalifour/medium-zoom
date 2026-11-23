import mediumZoom, { type Zoom } from 'medium-zoom'
import callable = require('medium-zoom')
const factory: (images?: string) => Zoom = mediumZoom
const direct: (images?: string) => Zoom = callable
if (typeof factory !== 'function' || typeof direct !== 'function') {
  throw new Error('Expected callable CommonJS exports')
}
