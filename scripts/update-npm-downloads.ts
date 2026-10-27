import { writeFileSync } from 'node:fs'

import snapshot from '../website/src/npm-downloads.json'
import { fetchMonthlyDownloads } from '../website/src/npm-downloads.ts'

const downloads = await fetchMonthlyDownloads(snapshot.end)
writeFileSync(
  new URL('../website/src/npm-downloads.json', import.meta.url),
  `${JSON.stringify(downloads, null, 2)}\n`
)
console.log(
  `Verified ${downloads.monthly.toLocaleString('en')} monthly downloads through ${downloads.end}.`
)
