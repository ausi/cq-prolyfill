# Container Queries Prolyfill

[![Build Status](https://travis-ci.org/ausi/cq-prolyfill.svg?branch=master)](https://travis-ci.org/ausi/cq-prolyfill/branches) [![Coverage Status](https://coveralls.io/repos/ausi/cq-prolyfill/badge.svg?branch=master&service=github)](https://coveralls.io/github/ausi/cq-prolyfill?branch=master)

This is a [prolyfill](https://au.si/what-is-a-prolyfill) for a special version of [container queries](https://github.com/ResponsiveImagesCG/container-queries) (aka element queries). You can read more about the idea and how they work internally in [this article](https://au.si/css-container-element-queries).

A quick demo of the container queries in action can be found here: <https://ausi.github.io/cq-prolyfill/demo/>.

## Download

The source version can be found in the same directory as this readme file. For the minified version take a look at the [releases section on GitHub](https://github.com/ausi/cq-prolyfill/releases).

### Via npm

To install it via [npm](https://www.npmjs.com/) execute the following command in your project directory:

```bash
npm install --save cq-prolyfill
```

The script gets installed to *node_modules/cq-prolyfill/cq-prolyfill.min.js*.

## Usage

One goal of this prolyfill is to be ease to use. Elements with container queries don’t have to be modified in the markup, you don’t have to predefine “element break-points” or the like, everything is done via CSS. All you need is to load the script on your page and you are ready to use container queries in your CSS. You can load the script in any way you like, I would recommend to load it asynchronously in the head:

```html
<script src="cq-prolyfill.min.js" async></script>
```

Now you can use container queries in the following form:

```css
.element:container(width >= 100px) {
	/* Styles for .element if it’s container is at least 100px wide */
}
.element:container(height > 100px < 200px) {
	/* Styles for .element if it’s container is between 100px and 200px high */
}
.element:container(text-align = right) {
	/* Styles for .element if it’s container has a right text-align */
}
```

All CSS properties are supported, most important `width` and `height`. Available comparison operators are `<`, `>`, `<=`, `>=`, `=` and `!=`.

### Color filters

It’s also possible to query color properties, for this purpose the color filters `hue`, `saturation`, `lightness` and `alpha` are available.

```css
.element:container(background-color lightness > 20%) {
	/* Styles for .element if it’s containers background-color is brighter than 20% */
}
.element:container(background-color hue > 60deg < 180deg) {
	/* Styles for .element if it’s containers background-color is greenish */
}
.element:container(background-color alpha < 10%) {
	/* Styles for .element if it’s containers background-color is nearly transparent */
}
```

## JavaScript API

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

* `reprocess(fn callback)`
* `reparse(fn callback)`
* `reevaluate(bool clearContainerCache, fn callback)`

### Usage with browserify or webpack

If you want to use it with [browserify](http://browserify.org/) or [webpack](https://webpack.github.io/) you can do so by `require`ing the module as usual. The configuration can be passed into the required function and the API gets returned:

```js
var cq = require('cq-prolyfill')({ /* configuration */ });
cq.reevaluate(false, function() {
	// Do something after all elements were updated
});
```

## PostCSS plugin

To improve the performance of the prolyfill, you can use [PostCSS](https://github.com/postcss/postcss) to prepare the stylesheet on the server side:

```js
var fs = require('fs');
var cqPostcss = require('cq-prolyfill/postcss-plugin');

fs.writeFileSync(
	'dist.css',
	cqPostcss.process(fs.readFileSync('source.css', 'utf-8')).css
);
```

Now we need to tell the prolyfill that the postcss plugin was used:

```js
// Set this variable before the script gets loaded
window.containerQueriesConfig = { postcss: true };

// Or pass the configuration as a parameter if you use browserify or webpack
var cq = require('cq-prolyfill')({ postcss: true });
```

## How it works

It basically runs in three steps:

### Step 1

Looks for stylesheets that contain container queries and escapes them to be readable by the browser.

E.g. this:

```css
.element:container(width >= 10px) {
	color: red;
}
```

gets converted to this:

```css
.element.\:container\(width\>\=10px\) {
	color: red;
}
```

So this step could (theoretically) be done by a preprocessor on the server side to speed up the script.

### Step 2

Parses all (pre)processed container query rules and stores them indexed by the preceding selector to be used in step 3.

### Step 3

Loops through all stored queries and adds or removes the CSS classes of the matching elements. The added CSS classes look the same as the container query itself to improve the readability in the developer tools of the browser. E.g.:

```html
<div class="element :container(width>=10px)"></div>
```

## Browser Support

* Firefox 36+
* Opera 12.16+
* Chrome 40+
* Internet Explorer 9+
* Edge
* Safari 7+
* Yandex 14+
* iOS 7+
* Android 4+
* Windows Phone 8.1+

Thanks to [BrowserStack](https://www.browserstack.com/automate) for sponsoring automated cross browser testing for this project.

## License

MIT
