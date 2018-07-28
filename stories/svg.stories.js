import { storiesOf } from '@storybook/html'

storiesOf('SVG', module).add(
  'default',
  () => `
    <img src="crab.svg">

    <script>
      const zoom = mediumZoom('img');
    </script>
  `,
  {
    notes: `
      Zoom on a SVG.

      <em>Icon made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></em>
    `,
  }
)
