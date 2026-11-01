import { imageAdapter } from './image'
import type { TargetAdapter, ZoomTarget } from './types'
const adapters: readonly TargetAdapter[] = [imageAdapter]
/** Add target forms here; source, measurement and frame ownership stay with each adapter. */
export function getTargetAdapter(target: ZoomTarget): TargetAdapter | undefined {
  for (let index = 0; index < adapters.length; index++) {
    const adapter = adapters[index]!
    if (adapter.supports(target)) {
      return adapter
    }
  }
}
