import { useEffect, useRef, type ReactNode } from 'react'
import './scroll-area.css'

// Native scrolling with shared overflow feedback. Size it with --scroll-area-max-height;
// set --scroll-area-background when it sits on a surface other than the page.
export function ScrollArea({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current!
    const viewport = viewportRef.current!
    const update = () => {
      root.toggleAttribute('data-scroll-above', viewport.scrollTop > 1)
      root.toggleAttribute(
        'data-scroll-below',
        viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop > 1
      )
    }
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    observer.observe(contentRef.current!)
    viewport.addEventListener('scroll', update, { passive: true })
    update()
    root.setAttribute('data-scroll-ready', '')
    return () => {
      observer.disconnect()
      viewport.removeEventListener('scroll', update)
      root.removeAttribute('data-scroll-ready')
    }
  }, [])

  return (
    <div ref={rootRef} className={`scroll-area ${className}`}>
      <div ref={viewportRef} className="scroll-area-viewport">
        <div ref={contentRef} className="scroll-area-content">
          {children}
        </div>
      </div>
    </div>
  )
}
