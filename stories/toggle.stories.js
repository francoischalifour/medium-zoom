import { storiesOf } from '@storybook/html'

storiesOf('toggle()', module)
  .add(
    'default',
    () =>
      `
      <div>
        <img id="image-1" src="image-3.jpg">
      </div>

      <div>
        <img id="image-2" src="image-4.jpg">
      </div>

      <script>
        const zoom = mediumZoom('img');
        zoom
          .toggle()
          .then(zoom => zoom.toggle());
      </script>
    `,
    {
      notes: {
        markdown: `Toggles the zoom twice.`,
      },
    }
  )
  .add(
    'with target',
    () =>
      `
      <div>
        <img id="image-1" src="image-3.jpg">
      </div>

      <div>
        <img id="image-2" src="image-4.jpg">
      </div>


      <script>
        const zoom = mediumZoom('img');
        zoom
          .toggle({ target: document.querySelector('#image-2') })
          .then(zoom => zoom.toggle());
      </script>
    `,
    {
      notes: {
        markdown: `Toggles the zoom twice with the specified target.`,
      },
    }
  )
