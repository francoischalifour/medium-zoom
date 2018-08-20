import { storiesOf } from '@storybook/html'

storiesOf('attributes', module)
  .add(
    'data-zoom-target',
    () => `
      <img
        src="https://placehold.it/300x500?text=default-image"
        data-zoom-target="https://placehold.it/1440x1920?text=data-zoom-target"
      >

      <script>
        const zoom = mediumZoom('img');
      </script>
  `,
    {
      notes: {
        markdown: `Zoom on an image having a \`data-zoom-target\` attribute.`,
      },
    }
  )
  .add(
    'srcset',
    () => `
    <img
      srcset="
        https://placehold.it/300x200?text=300x200 300w,
        https://placehold.it/600x400?text=600x400 600w,
        https://placehold.it/800x500?text=800x500 800w,
        https://placehold.it/1000x650?text=1000x650 1000w,
        https://placehold.it/1200x800?text=1200x800 1200w
      "
    >

    <script>
      const zoom = mediumZoom('img');
    </script>
`,
    {
      notes: {
        markdown: `
Zoom on an image having \`srcset\` attributes.
    `,
      },
    }
  )
  .add(
    'srcset and data-zoom-target',
    () => `
    <img
      src="https://placehold.it/1200x800?text=fallback_src"
      srcset="
        https://placehold.it/200x300?text=200x300 200w,
        https://placehold.it/400x600?text=400x600 400w,
        https://placehold.it/500x800?text=500x800 500w,
        https://placehold.it/650x1000?text=650x1000 650w,
        https://placehold.it/800x1200?text=800x1200 800w"
      sizes="(max-width: 400px) 100vw, 400px"
      data-zoom-target="https://placehold.it/1440x1920?text=data-zoom-target"
    >

    <script>
      const zoom = mediumZoom('img');
    </script>
`,
    {
      notes: `Zoom with srcset and data-zoom-target defined (zoom-target wins).`,
    }
  )
  .add(
    'SVG',
    () => `
      <img src="crab.svg">

      <script>
        const zoom = mediumZoom('img');
      </script>
    `,
    {
      notes: `
        Zoom on a SVG.
        The image fills the entire container.

        <em>Icon made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></em>
      `,
    }
  )
