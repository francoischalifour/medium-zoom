import { createMediumZoom } from './factory'
import { hdImage, container, template } from './features'
import type { ZoomFactory } from './types'

const mediumZoom: ZoomFactory = createMediumZoom({ features: [hdImage(), container(), template()] })
export default mediumZoom
export type { Zoom, ZoomOptions, ZoomSelector, ZoomContainer, ZoomOpenOptions } from './types'
