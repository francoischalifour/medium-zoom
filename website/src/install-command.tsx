import { useId } from 'react'
import { usePackageManager, setPackageManager, packageManagers } from './package-manager'
import { libraryCommands, componentCommands } from './install-commands'
import { CopyButton, CodeTokens } from './site-components'
import type { SitePage } from './site-data'

export function InstallCommand({
  page,
  id,
  className = '',
}: {
  page: SitePage
  id?: string
  className?: string
}) {
  const groupName = useId()
  const manager = usePackageManager()
  const commands = page === 'library' ? libraryCommands : componentCommands
  const command = commands[manager]
  return (
    <div className={`code-block install-block ${className}`} id={id} aria-label="Installation">
      <div className="code-caption">
        <fieldset className="package-switch">
          <legend className="sr-only">Package manager</legend>
          {packageManagers.map(value => (
            <label key={value} data-package-manager-option={value}>
              {/* Storage owns this preference; native history restoration can retain stale checks. */}
              <input
                className="sr-only"
                type="radio"
                autoComplete="off"
                name={groupName}
                value={value}
                checked={manager === value}
                onChange={() => setPackageManager(value)}
              />
              {value}
            </label>
          ))}
        </fieldset>
        <CopyButton key={command} text={command} label="Copy install command" />
      </div>
      <pre tabIndex={0}>
        <code>
          <span className="command-prompt" aria-hidden="true">
            ${' '}
          </span>
          {packageManagers.map(value => (
            <span key={value} data-package-manager-option={value}>
              <CodeTokens code={commands[value]} />
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}
