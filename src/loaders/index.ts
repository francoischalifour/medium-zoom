import type { ZoomLoader } from 'medium-zoom/core'

import { loadHdImage as load } from '@/zoom/hd-image'

/**
 * Loads the image's `data-zoom-src`, or its `srcset`, in high resolution and shows it over the
 * frame once loaded. Keeps the attached image when neither is set or loading fails.
 */
export const loadHdImage: ZoomLoader = load
