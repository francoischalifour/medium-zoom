declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const Content: ComponentType<{ components?: Record<string, unknown> }>
  export const outline: { title: string; id: string }[]
  export default Content
}
