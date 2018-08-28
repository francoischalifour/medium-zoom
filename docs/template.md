# Using a custom template

You might want to render the zoom in your own template. You could reproduce zooms as seen on [Facebook](https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/master/examples/facebook-template) or [Dropbox Paper](https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/master/examples/dropbox-paper-template). This is possible with the `template` option.

1. Create a [`template`](https://developer.mozilla.org/docs/Web/HTML/Element/template) element
2. Add the template selector or the element to the `template` option

```html
<template id="zoom-template">
  <div>
    <header>My image zoom template</header>
    <div id="zoom-container"></div>
    <aside>Comment on my image</aside>
  </div>
</template>

<script>
  mediumZoom('[data-zoom]', {
    template: '#zoom-template',
    container: '#zoom-container'
  })
</script>
```

[Using a container](container.md) within a template is possible.

## Examples

- [Dropbox Paper](https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/master/examples/dropbox-paper-template)
- [Facebook](https://codesandbox.io/s/github/francoischalifour/medium-zoom/tree/master/examples/facebook-template)
