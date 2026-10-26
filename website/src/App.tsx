import { Hero } from './hero'
import { SiteHeader, SiteFooter } from './site-shell'
import { LibraryPage } from './LibraryPage'
import { ShadcnPage } from './ShadcnPage'
import { ClosingInstall } from './closing-install'
import type { SitePage } from './site-data'

export function App({ page }: { page: SitePage }) {
  return (
    <div className="site-shell">
      <SiteHeader page={page} />
      <main className="page-content" id="main">
        <Hero page={page} />
        {page === 'library' ? <LibraryPage /> : <ShadcnPage />}
        <ClosingInstall page={page} />
      </main>
      <SiteFooter />
    </div>
  )
}
