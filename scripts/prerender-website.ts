import { fileURLToPath } from 'node:url'
import { prerenderWebsite } from '../website/build/prerender'

prerenderWebsite(fileURLToPath(new URL('../website/dist/', import.meta.url)))
