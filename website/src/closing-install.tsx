import { InstallCommand } from './install-command'
import { closingTitle, productPages } from './product-pages'
import type { SitePage } from './site-data'

export function ClosingInstall({ page }: { page: SitePage }) {
  return (
    <section className="closing-install" aria-labelledby="closing-title">
      <h2 id="closing-title">{closingTitle}</h2>
      <p>{productPages[page].closing}</p>
      <InstallCommand page={page} />
      <a className="button button-primary" href="/docs/">
        Read the documentation
      </a>
    </section>
  )
}
