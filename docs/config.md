# Configuration

Currently the only available configuration option is `postcss` which is described in [PostCSS plugin](postcss.md).

## Normal script

If you installed the prolyfill as a normal script, the configuration can be set via `window.containerQueriesConfig`:

```html
<script>
	// Set this variable before the script gets loaded
	window.containerQueriesConfig = {
		postcss: true
	};
</script>
<script src="cq-prolyfill.min.js" async></script>
```

## Module loader

If you’re using a module loader and [browserify or webpack](browserify.md), pass the configuration as the first parameter to the module function.

```js
// Pass the configuration as a parameter
var cq = require('cq-prolyfill')({
	postcss: true
});
```
