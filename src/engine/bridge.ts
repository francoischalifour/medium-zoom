import type { CoreZoomOptions, Zoom, ZoomOptions } from '../types'

export type ZoomCommands<Options extends CoreZoomOptions = ZoomOptions> = Pick<
  Zoom<Options>,
  'open' | 'close' | 'toggle' | 'detach'
>

/** Stable internal ABI across independent entries. __mz$ names are never property-mangled. */
export interface CoordinatedZoom<
  Options extends CoreZoomOptions = ZoomOptions,
> extends Zoom<Options> {
  __mz$coordinate(owner: (engine: ZoomCommands<Options>) => ZoomCommands<Options>): () => void
}
