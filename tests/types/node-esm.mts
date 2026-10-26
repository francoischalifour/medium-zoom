import mediumZoom, { type Zoom, type ZoomOptions } from 'medium-zoom'
import pureZoom from 'medium-zoom/dist/pure/index.js'

// Known v1 limitation: these .d.ts files are interpreted as CommonJS namespaces.
// Keep the failure explicit; runtime.mjs separately verifies the callable root.
// @ts-expect-error Node ESM sees a namespace rather than the callable default.
const factory: (options?: ZoomOptions) => Zoom = mediumZoom
// @ts-expect-error The pure ESM path shares the legacy declaration format.
const pure: (options?: ZoomOptions) => Zoom = pureZoom
void factory
void pure
