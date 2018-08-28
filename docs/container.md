# Using a custom viewport

The zoom is by default rendered in the window viewport. You can also render your image in any element of the DOM, or any custom coordinates with the `container` option.

## Rendering in a DOM Element

```html
<article>
  <p>My article...</p>
  <img src="image.jpg" alt="My image">
  <div id="zoom-container"></div>
</article>

<script>
  mediumZoom('img', {
    container: '#zoom-container'
  })
</script>
```

[Check the example →](https://medium-zoom.francoischalifour.com/storybook/?selectedKind=options&selectedStory=container%20%28DOM%20element%29)

## Rendering with coordinates

If you don't already have an element in your DOM to specify the position of the zoom, you can pass an object with the following properties as `number`s:

```js
mediumZoom('img', {
  container: {
    width: 720,
    height: 480,
    top: 64,
    bottom: 64,
    right: 0,
    left: 0,
  },
})
```

These properties behave very much like [`Element.getBoundingClientRect()`](https://developer.mozilla.org/docs/Web/API/Element/getBoundingClientRect). They will get merged with the default ones so you don't need to specify all of them.

The default `width` and `height` are `window.innerWidth` and `window.innerHeight`. Others are set to `0`.

[Check the example →](https://medium-zoom.francoischalifour.com/storybook/?selectedKind=options&selectedStory=container%20%28coordinates%20object%29)
