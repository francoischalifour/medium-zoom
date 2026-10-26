import { InstallCommand } from './install-command'
import type { SitePage } from './site-data'

export function ClosingInstall({ page }: { page: SitePage }) {
  return (
    <section className="closing-install" aria-labelledby="closing-title">
      <h2 id="closing-title">Add zoom to your project.</h2>
      <p>
        {page === 'library'
          ? 'Start with a few lines of JavaScript.'
          : 'Install with shadcn/ui. Make the component yours.'}
      </p>
      <InstallCommand page={page} />
      <a className="button button-primary" href="/docs/">
        Read the documentation
      </a>
    </section>
  )
}
