import { useEffect, useState } from 'react'

import { fetchMonthlyDownloads } from './npm-downloads'
import snapshot from './npm-downloads.json'
import { SiteLink } from './site-components'

const fullCountFormat = new Intl.NumberFormat('en-US')
const compactCountFormat = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

// npm is asked once per page load. The saved snapshot stands in when npm is unavailable.
let monthlyRequest: Promise<number> | undefined
// Lets returning to the page show the count without waiting again.
let loadedMonthly: number | undefined

function requestMonthly() {
  monthlyRequest ??= fetchMonthlyDownloads(snapshot.end).then(
    report => report.monthly,
    () => snapshot.monthly
  )
  return monthlyRequest
}

// The line stays empty until the count is known, then fades in, so a stale count
// never shows and then changes. Without JavaScript, the snapshot shows instead.
export function MonthlyDownloads() {
  const [monthly, setMonthly] = useState(loadedMonthly)

  useEffect(() => {
    let active = true
    void requestMonthly().then(value => {
      loadedMonthly = value
      if (active) {
        setMonthly(value)
      }
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <p className="monthly-downloads">
      {monthly === undefined ? (
        <noscript>
          <MonthlyDownloadsLink monthly={snapshot.monthly} />
        </noscript>
      ) : (
        <MonthlyDownloadsLink monthly={monthly} />
      )}
    </p>
  )
}

function MonthlyDownloadsLink({ monthly }: { monthly: number }) {
  return (
    <SiteLink
      externalIcon={false}
      href="https://www.npmjs.com/package/medium-zoom"
      title={`${fullCountFormat.format(monthly)} downloads over the last 30 completed days`}
    >
      <strong>{compactCountFormat.format(monthly)}</strong> monthly downloads on npm
    </SiteLink>
  )
}
