import { customTargets } from '#engine-profile'

import { imageAdapter, isImage } from './image'
import type { TargetAdapter, ZoomTarget } from './types'

/** Resolve source/frame creation behind one immutable constructor-local target registry. */
export function targetResolver(adapters?: readonly TargetAdapter[]) {
  if (!customTargets || !adapters) {
    return {
      supports: isImage,
      create(target: ZoomTarget, coordinates: 'document' | 'viewport') {
        const source = target as HTMLImageElement
        return imageAdapter.createFrame(source, imageAdapter.resolveSource(source), coordinates)
      },
    }
  }
  const available = adapters.slice()
  const resolve = (target: ZoomTarget) => {
    for (let index = 0; index < available.length; index++) {
      const adapter = available[index]!
      if (adapter.supports(target)) {
        return adapter
      }
    }
  }
  return {
    supports: (target: ZoomTarget) => !!resolve(target),
    create(target: ZoomTarget, coordinates: 'document' | 'viewport') {
      const adapter = resolve(target)!
      return adapter.createFrame(target, adapter.resolveSource(target), coordinates)
    },
  }
}
