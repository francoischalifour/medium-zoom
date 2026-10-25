import { stories } from './registry.ts'

import.meta.glob('../*.stories.js', { eager: true })

export { stories }
