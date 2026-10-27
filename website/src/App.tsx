import { ClosingInstall } from './closing-install'
import { Hero } from './hero'
import { JavaScriptPage } from './JavaScriptPage'
import { ReactPage } from './ReactPage'
import type { SitePage } from './site-data'
import { SiteHeader, SiteFooter } from './site-shell'

export function App({ page }: { page: SitePage }) {
  return (
    <div className="site-shell">
      <SiteHeader page={page} />
      <main className="page-content" id="main">
        <Hero page={page} />
        {page === 'javascript' ? <JavaScriptPage /> : <ReactPage />}
        <ClosingInstall page={page} />
      </main>
      <SiteFooter page={page} />
    </div>
  )
}
