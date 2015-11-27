# browserify and webpack

If you want to use the prolyfill with [browserify](http://browserify.org/) or [webpack](https://webpack.github.io/) you can do so by `require`ing the module as usual. [The configuration](config.md) can be passed into the required function and [the API](api.md) gets returned:

```js
var cq = require('cq-prolyfill')({ /* configuration */ });
cq.reevaluate(false, function() {
	// Do something after all elements were updated
});
```
