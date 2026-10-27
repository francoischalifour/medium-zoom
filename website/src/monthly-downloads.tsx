import { useEffect, useState } from 'react'

import { fetchMonthlyDownloads } from './npm-downloads'
import snapshot from './npm-downloads.json'
import { SiteLink } from './site-components'

let reportPromise: ReturnType<typeof fetchMonthlyDownloads> | undefined
const fullCountFormat = new Intl.NumberFormat('en-US')
const compactCountFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function MonthlyDownloads() {
  const [report, setReport] = useState(snapshot)

  useEffect(() => {
    let active = true
    reportPromise ??= fetchMonthlyDownloads(snapshot.end).catch(() => snapshot)
    void reportPromise.then(value => {
      if (active) {
        setReport(value)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <p className="monthly-downloads">
      <SiteLink
        externalIcon={false}
        href="https://www.npmjs.com/package/medium-zoom"
        title={`${fullCountFormat.format(report.monthly)} downloads over the last 30 completed days`}
      >
        <strong>{compactCountFormat.format(report.monthly)}</strong> monthly downloads on npm
      </SiteLink>
    </p>
  )
}
