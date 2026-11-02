import { imageAdapter } from './image'
import type { TargetAdapter, ZoomTarget } from './types'

/** Constructor-local immutable registry. No global registration or public plugin lifecycle. */
export function targetResolver(adapters: readonly TargetAdapter[] = [imageAdapter]) {
  const available = adapters.slice()
  return (target: ZoomTarget): TargetAdapter | undefined => {
    for (let index = 0; index < available.length; index++) {
      const adapter = available[index]!
      if (adapter.supports(target)) {
        return adapter
      }
    }
  }
}
