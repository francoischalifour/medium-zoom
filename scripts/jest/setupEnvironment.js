if (typeof window !== 'undefined') {
  global.requestAnimationFrame = callback => setTimeout(callback)
}
