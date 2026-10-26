import { useEffect, useRef, useState, type CSSProperties } from 'react'
import snapshot from './npm-downloads.json'
import { fetchNpmDownloads } from './npm-downloads'

let reportedDownloads: ReturnType<typeof fetchNpmDownloads> | undefined
const number = new Intl.NumberFormat('en-US')
const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' })

export function DownloadStats() {
  const [downloads, setDownloads] = useState(snapshot)
  const [entered, setEntered] = useState(false)
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    let active = true
    reportedDownloads ??= fetchNpmDownloads(snapshot).catch(() => snapshot)
    void reportedDownloads.then(value => {
      if (active) setDownloads(value)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setEntered(true)
          observer.disconnect()
        }
      },
      { threshold: 0.5 }
    )
    if (section.current) observer.observe(section.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      className="download-stats"
      aria-label="npm downloads"
      ref={section}
      data-entered={entered}
    >
      <a href="https://www.npmjs.com/package/medium-zoom" className="download-total">
        <span className="sr-only">{number.format(downloads.total)} total downloads on npm</span>
        <span className="download-digits" aria-hidden="true">
          {number
            .format(downloads.total)
            .split('')
            .map((digit, index) => (
              <span key={index} style={{ '--digit-index': index } as CSSProperties}>
                {digit}
              </span>
            ))}
        </span>
        <span aria-hidden="true">total downloads</span>
      </a>
      <p className="download-weekly">
        <strong>{number.format(downloads.weekly)}</strong> weekly downloads
      </p>
      <p className="download-date">
        npm · Reported through{' '}
        <time dateTime={downloads.end}>{date.format(new Date(`${downloads.end}T00:00:00Z`))}</time>
      </p>
    </section>
  )
}
