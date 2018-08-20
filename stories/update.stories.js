import { storiesOf } from '@storybook/html'

storiesOf('update()', module).add(
  'multiple options',
  () => `
    <img src="image-2.jpg">

    <div>
      <button id="update">Update options</button>
    </div>

    <script>
      const zoom = mediumZoom('img');
      const button = document.querySelector('#update');

      button.addEventListener('click', () => zoom.update({
        margin: 100,
        background: 'yellow',
        scrollOffset: 0,
      }));
    </script>
  `,
  {
    notes: {
      markdown: `Click on the button the update the options and zoom again.`,
    },
  }
)
