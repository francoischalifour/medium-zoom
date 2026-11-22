import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { checkAnalyzers } from './check-package-analyzers.ts'
import { checkConsumers } from './check-package-consumers.ts'
import { packPreview } from './pack-preview.ts'

const version = process.argv[2] || ''
const artifact = packPreview(version)
try {
  await checkAnalyzers(artifact.archive, true, true)
  await checkConsumers(artifact, true, true)
  const directory = '.cache/preview'
  mkdirSync(directory, { recursive: true })
  copyFileSync(artifact.archive, join(directory, 'medium-zoom.tgz'))
  console.log(
    `Validated ${version}: ${directory}/medium-zoom.tgz (not published)`
  )
} finally {
  artifact.cleanup()
}
