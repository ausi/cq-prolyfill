# JavaScript API

The script triggers itself on load, on DOM ready and if the browser window resizes. If you want to trigger it manually you can call `reprocess` (step 1), `reparse` (step 2) or `reevaluate` (step 3) on the `window.containerQueries` object. Most of the time `reevaluate` should do the job if you didn’t add, remove or change stylesheets. E.g.

```js
document.querySelector('.element').addEventListener('click', function() {
	// Do something that changes the size of container elements
	// ...
	window.containerQueries.reevaluate(false, function() {
		// Do something after all elements were updated
	});
});
```

If you installed the prolyfill as a normal script the API is available at `window.containerQueries`. If you’re using a module loader the API gets returned from the module function.

## `reprocess(fn callback)`

Reprocess all stylesheets on the page. Call this method if you added a stylesheet via JavaScript. The `callback` gets called after all stylesheets are processed, parsed and evaluated.

## `reparse(fn callback)`

Reparse all stylesheets on the page and look for new container queries. Call this method if you added a stylesheet via JavaScript which doesn’t contain a container query. The `callback` gets called after all stylesheets are parsed and evaluated.

## `reevaluate(bool clearCache, fn callback)`

Reevaluate all container queries. Call this method if you added new elements or changed styles that affect a container query. The boolean parameter `clearCache` specifies if the container cache should be cleared before the evaluation. The `callback` gets called after all container queries are evaluated.
