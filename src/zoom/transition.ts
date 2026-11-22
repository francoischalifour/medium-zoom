import {
  findRunningTransform,
  hasAnimations,
  listenForMotionChange,
} from '#platform'

export const waitForTransition = (
  image: Element,
  done: () => void
): (() => void) => {
  let timer: ReturnType<typeof setTimeout>
  let finished = false
  const getTime = (value: string) =>
    Math.max(...value.split(',').map(parseFloat))
  const finish = (event?: Event) => {
    if (
      finished ||
      (event && (event as TransitionEvent).propertyName !== 'transform')
    ) {
      return
    }
    cleanup()
    done()
  }
  const cleanup = () => {
    finished = true
    clearTimeout(timer)
    image.removeEventListener('transitionend', finish)
    stopMotion()
  }
  image.addEventListener('transitionend', finish)
  const stopMotion = listenForMotionChange(change => change.matches && finish())
  const style = getComputedStyle(image)
  // Use a timer because transitionend can be skipped and animation frames pause in hidden tabs.
  const delay =
    Math.max(
      0,
      (getTime(style.transitionDuration) + getTime(style.transitionDelay)) *
        1_000
    ) + 50
  // A busy page runs the transition behind wall time: when the transform transition is still
  // running at the timer, leave it to transitionend, capped by another delay because animation
  // frames pause in hidden tabs.
  timer = setTimeout(
    hasAnimations
      ? () =>
          findRunningTransform(image)
            ? (timer = setTimeout(finish, delay))
            : finish()
      : finish,
    delay
  )
  // Let the opening body class update before completing a zero-duration zoom. A frame
  // after cleanup finds the zoom finished.
  if (delay <= 50) {
    requestAnimationFrame(() => finish())
  }
  return cleanup
}
