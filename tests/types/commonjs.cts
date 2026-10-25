import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'

// The default import works when TypeScript emits its CommonJS interop helper.
const factory: (options?: ZoomOptions) => Zoom = mediumZoom
if (typeof factory !== 'function') throw new Error('CommonJS interop must load the callable UMD')

import callable = require('medium-zoom')
// @ts-expect-error v1's default-export declaration does not model callable require().
const direct: (options?: ZoomOptions) => Zoom = callable
void direct
