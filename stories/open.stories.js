import { storiesOf } from '@storybook/html'

storiesOf('open()', module)
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
        zoom.open();
      </script>
    `,
    {
      notes: {
        markdown: `Opens the zoom with the default target.`,
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
        zoom.open({ target: document.querySelector('#image-2') });
      </script>
    `,
    {
      notes: {
        markdown: `Opens the zoom with the specified target`,
      },
    }
  )
