import type { CoreZoomOptions, Zoom, ZoomOptions } from '../types'

export type ZoomCommands<Options extends CoreZoomOptions = ZoomOptions> = Pick<
  Zoom<Options>,
  'open' | 'close' | 'toggle' | 'detach'
>

/** Engine owns command forwarding; the optional session owns installation and its lease. */
export interface CommandGate<Options extends CoreZoomOptions = ZoomOptions> {
  __mz_current: ZoomCommands<Options>
  __mz_owner?: object
}
/** Private protocol keys are pinned across all entries by the build name cache. */
export interface CoordinatedZoom<
  Options extends CoreZoomOptions = ZoomOptions,
> extends Zoom<Options> {
  readonly __mz_gate: CommandGate<Options>
}
