import { storiesOf } from '@storybook/html'

storiesOf('trigger from element', module).add(
  'with button',
  () => `
    <img src="image-6.jpg">

    <div>
      <button>Toggle zoom</button>
    </div>

    <script>
      const zoom = mediumZoom('img');
      const button = document.querySelector('button');

      button.addEventListener('click', () => zoom.show());
    </script>
  `,
  {
    notes: `
      You can trigger the zoom from another DOM element.
    `,
  }
)
