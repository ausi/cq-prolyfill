# Configuration

* `postcss` should be set to `true` if PostCSS is used as described in [PostCSS plugin](postcss.md).
* `skipObserving` set this to `true` if the prolyfill shouldn’t listen to browser events and DOM modifications and you want to manage it yourself via the [API methods](api.md).

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
