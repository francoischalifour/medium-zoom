import * as React from 'react'

export function TabList<Value extends string>({
  id,
  label,
  items,
  value,
  onValueChange,
  className,
}: {
  id: string
  label: string
  items: readonly { value: Value; label: React.ReactNode }[]
  value: Value
  onValueChange: (value: Value) => void
  className?: string
}) {
  return (
    <div
      className={['demo-tabs', className].filter(Boolean).join(' ')}
      role="tablist"
      aria-label={label}
    >
      {items.map((item, index) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          id={`${id}-${item.value}`}
          aria-controls={`${id}-panel`}
          aria-selected={value === item.value}
          tabIndex={value === item.value ? 0 : -1}
          onClick={() => onValueChange(item.value)}
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
            onValueChange(items[next].value)
            event.currentTarget
              .parentElement!.querySelectorAll<HTMLButtonElement>('[role="tab"]')
              [next].focus()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
