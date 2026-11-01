import { imageAdapter } from './image'
import type { TargetAdapter, ZoomTarget } from './types'
const adapters: readonly TargetAdapter[] = [imageAdapter]
/** Add target forms here; source, measurement and frame ownership stay with each adapter. */
export function getTargetAdapter(target: ZoomTarget): TargetAdapter | undefined {
  return adapters.filter(adapter => adapter.supports(target))[0]
}
