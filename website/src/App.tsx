import { Hero } from './hero'
import { SiteHeader, SiteFooter } from './site-shell'
import { JavaScriptPage } from './JavaScriptPage'
import { ReactPage } from './ReactPage'
import { ClosingInstall } from './closing-install'
import type { SitePage } from './site-data'

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
