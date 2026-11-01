import { listenForMotionChange } from '#platform'

// A transition may be disabled, cancelled, or have no change to animate.
export const waitForTransition = (image: HTMLImageElement, done: () => void): (() => void) => {
  let timer: ReturnType<typeof setTimeout>
  let frame: number
  let finished = false
  const query = window.matchMedia('(prefers-reduced-motion)')
  const getTime = (value: string) => Math.max(...value.split(',').map(parseFloat))
  const finish = (event?: TransitionEvent) => {
    if (finished || (event && event.propertyName !== 'transform')) {
      return
    }
    cleanup()
    done()
  }
  const motionChange = () => {
    if (query.matches) {
      finish()
    }
  }
  const cleanup = () => {
    finished = true
    clearTimeout(timer)
    window.cancelAnimationFrame(frame)
    image.removeEventListener('transitionend', finish)
    stopMotion()
  }
  image.addEventListener('transitionend', finish)
  const stopMotion = listenForMotionChange(query, motionChange)
  const style = window.getComputedStyle(image)
  // Keep a fallback independent of animation frames, which pause in hidden tabs.
  const duration = (getTime(style.transitionDuration) + getTime(style.transitionDelay)) * 1_000
  timer = setTimeout(finish, Math.max(0, duration) + 50)
  // Let the opening body class update before completing a zero-duration zoom.
  if (duration <= 0) {
    frame = window.requestAnimationFrame(() => finish())
  }
  return cleanup
}
