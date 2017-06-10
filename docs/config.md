# Configuration

* `preprocess` should be set to `true` if the [PostCSS plugin](postcss.md) is not used and the CSS code has to be preprocessed client side.
* `skipObserving` set this to `true` if the prolyfill shouldn’t listen to browser events and DOM modifications and you want to manage it yourself via the [API methods](api.md).

## Normal script

If you installed the prolyfill as a normal script, the configuration can be set via `window.cqConfig`:

```html
<script>
	// Set this variable before the script gets loaded
	window.cqConfig = {
		preprocess: true
	};
</script>
<script src="cq-prolyfill.min.js" async></script>
```

## Module loader

If you’re using a module loader and [browserify or webpack](browserify.md), pass the configuration as the first parameter to the module function.

```js
// Pass the configuration as a parameter
var cq = require('cq-prolyfill')({
	preprocess: true
});
```
