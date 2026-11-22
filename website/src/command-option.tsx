import type { CommandItem } from './command-items'
import { getSearchTerms } from './docs-search'
import { Icon } from './site-components'

function Highlight({
  text,
  query,
  matchedTerms,
}: {
  text: string
  query: string
  matchedTerms?: string[]
}) {
  const words = [...new Set(matchedTerms ?? getSearchTerms(query))].sort(
    (a, b) => b.length - a.length
  )
  if (!words.length) {
    return text
  }
  // Tokens contain only letters and numbers, so the expression treats user input literally.
  return text
    .split(new RegExp(`(${words.join('|')})`, 'gi'))
    .map((part, index) =>
      words.includes(part.toLowerCase()) ? (
        <mark key={index}>{part}</mark>
      ) : (
        part
      )
    )
}

export function CommandOption({
  command,
  query,
  selected,
  id,
  onSelect,
  onActivate,
}: {
  command: CommandItem
  query: string
  selected: boolean
  id: string
  onSelect: () => void
  onActivate: () => void
}) {
  const isChat = command.kind === 'chat'
  const isLink = command.kind === 'navigate' || isChat
  const resultClass = isChat ? 'command-chat' : isLink ? '' : 'command-action'
  const OptionElement = isLink ? 'a' : 'button'
  return (
    <OptionElement
      id={id}
      role="option"
      aria-selected={selected}
      tabIndex={-1}
      type={isLink ? undefined : 'button'}
      href={isLink ? command.url : undefined}
      target={isChat ? '_blank' : undefined}
      rel={isChat ? 'noopener noreferrer' : undefined}
      className={`command-result ${resultClass}`}
      onMouseDown={event => {
        if (event.button === 0) {
          event.preventDefault()
        }
      }}
      onPointerMove={onSelect}
      onClick={onActivate}
    >
      <span className="command-result-icon">
        <Icon name={command.icon} />
      </span>
      <span className="command-result-content">
        <span className="command-title">
          <Highlight
            text={command.title}
            query={query}
            matchedTerms={command.matchedTerms}
          />
        </span>
        {command.detail && (
          <span className="command-detail">
            {isChat ? (
              command.detail
            ) : (
              <Highlight
                text={command.detail}
                query={query}
                matchedTerms={command.matchedTerms}
              />
            )}
          </span>
        )}
        {command.description && (
          <span className="command-description">
            <Highlight
              text={command.description}
              query={query}
              matchedTerms={command.matchedTerms}
            />
          </span>
        )}
      </span>
      <span className="command-result-tail" aria-hidden="true">
        {isChat ? (
          <Icon name="external" className="command-external" />
        ) : (
          <kbd className="command-enter">⏎</kbd>
        )}
      </span>
    </OptionElement>
  )
}
