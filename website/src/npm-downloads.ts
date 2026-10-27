type MonthlyDownloadReport = {
  monthly: number
  start: string
  end: string
}

// npm reports completed UTC days. Show a rolling 30-day period.
export async function fetchMonthlyDownloads(
  reportedThrough: string
): Promise<MonthlyDownloadReport> {
  const endDate = new Date()
  endDate.setUTCHours(0, 0, 0, 0)
  endDate.setUTCDate(endDate.getUTCDate() - 1)
  const end = endDate.toISOString().slice(0, 10)
  const startDate = new Date(endDate)
  startDate.setUTCDate(startDate.getUTCDate() - 29)
  const start = startDate.toISOString().slice(0, 10)
  const response = await fetch(
    `https://api.npmjs.org/downloads/point/${start}:${end}/medium-zoom`,
    { signal: AbortSignal.timeout(10_000) }
  )
  if (!response.ok) {
    throw new Error(`npm download statistics: ${response.status}`)
  }
  const report = await response.json()
  if (
    report.package !== 'medium-zoom' ||
    !Number.isSafeInteger(report.downloads) ||
    report.downloads < 0 ||
    report.end !== end ||
    report.start !== start ||
    report.end < reportedThrough
  ) {
    throw new Error('Invalid npm reporting period')
  }

  return {
    monthly: report.downloads,
    start: report.start,
    end: report.end,
  }
}
