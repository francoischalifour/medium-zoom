// Run the existing story definitions without depending on Storybook.
interface Story {
  id: string
  kind: string
  name: string
  render(): string
  notes: string
}

export const stories: Story[] = []

export function storiesOf(kind: string) {
  const group = {
    add(
      name: string,
      render: () => string,
      options: { notes?: string | { markdown?: string } } = {}
    ) {
      const notes =
        typeof options.notes === 'string' ? options.notes : options.notes?.markdown || ''
      stories.push({ id: `${kind}/${name}`, kind, name, render, notes: notes.trim() })
      return group
    },
  }
  return group
}
