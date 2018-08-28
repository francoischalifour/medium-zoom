const LOADING_DURATION = 200
const ANIMATION_DURATION = 400

const storybook = [
  {
    kind: 'attributes',
    stories: [
      { name: 'data-zoom-src' },
      { name: 'srcset' },
      { name: 'srcset and data-zoom-src' },
      { name: 'SVG' },
    ],
  },
  {
    kind: 'options',
    stories: [
      { name: 'default' },
      { name: 'background (dark)' },
      { name: 'background (transparent)' },
      { name: 'margin' },
      { name: 'scrollOffset' },
      { name: 'container (DOM element)' },
      { name: 'container (coordinates object)' },
      { name: 'template (Dropbox Paper)' },
      { name: 'template (Facebook)' },
    ],
  },
]

storybook.forEach(category => {
  describe(category.kind, () => {
    category.stories.forEach(story => {
      it(story.name, () => {
        const queryParams = {
          full: 1,
          addons: 0,
          stories: 0,
          selectedKind: encodeURI(category.kind),
          selectedStory: encodeURI(story.name),
        }

        const urlParams = Object.entries(queryParams)
          .map(param => param.join('='))
          .join('&')

        cy.visit(`/?${urlParams}`)
        cy.wait(LOADING_DURATION)

        cy.findInStory('.medium-zoom-image').each(($image, index) => {
          $image.click()
          cy.wait(ANIMATION_DURATION)

          cy.matchImageSnapshot(
            `${category.kind}/${[
              story.name.toLowerCase().replace(/\s/g, '-'),
              index + 1,
            ].join('-')}`,
            {
              failureThreshold: 0.26, // threshold for entire image to accept scrollbars depending on the OS (especially for Travis)
              failureThresholdType: 'percent',
              customDiffConfig: {
                threshold: 0.1,
              },
            }
          )

          const $zoomedImage = cy.getInStory('.medium-zoom-image--opened')

          if ($zoomedImage.length) {
            $zoomedImage.click()
            cy.wait(ANIMATION_DURATION)
          }
        })
      })
    })
  })
})
