import { writeFileSync } from 'node:fs'
import { fetchNpmDownloads } from '../website/src/npm-downloads.ts'

// medium-zoom was first published on 2016-07-26.
const downloads = await fetchNpmDownloads({ total: 0, end: '2016-07-25' })
writeFileSync(
  new URL('../website/src/npm-downloads.json', import.meta.url),
  `${JSON.stringify(downloads, null, 2)}\n`
)
console.log(`Verified ${downloads.total.toLocaleString('en')} downloads through ${downloads.end}.`)
