import mediumZoom, { type Zoom } from 'medium-zoom'
import pure from 'medium-zoom/pure'
const factory: (images?: string) => Zoom = mediumZoom
const pureFactory: (images?: string) => Zoom = pure
void factory
void pureFactory
