# Container Queries Prolyfill

This is a [prolyfill](https://youtu.be/UpVj5azI-iI?t=24m54s) for a special version of [container queries](https://github.com/ResponsiveImagesCG/container-queries). You can read more about the syntax and how they work in [this article](https://au.si/css-container-queries).

Use with caution! This is **not** a [polyfill](https://en.wikipedia.org/wiki/Polyfill).

## Download

The source version can be found in the same directory as this readme file. For the minified version take a look at the [releases section on GitHub](https://github.com/ausi/cq-prolyfill/releases).

## Usage

You can load the script in any way you like, I would recommend to load it asynchronously in the head.

```html
<script src="cq-prolyfill.min.js" async></script>
```

The script triggers itself on load, on DOM ready and if the browser window resizes. If you want to trigger it manually you can call `reprocess` (step 1), `reparse` (step 2) or `reevaluate` (step 3) on the `window.containerQueries` object. Most of the time `reevaluate` should do the job if you didn’t add, remove or change stylesheets. E.g.

```js
document.querySelector('.element').addEventListener('click', function() {
	// Do something that changes the size of container elements
	// ...
	window.containerQueries.reevaluate();
});
```

## How it works

It basically runs in three steps:

### Step 1

Looks for stylesheets that contain container queries and escapes them to be readable by the browser.

E.g. this:

```css
.element:container(min-width: 10px) {
	color: red;
}
```

gets converted to this:

```css
.element.\:container\(min-width\:10px\) {
	color: red;
}
```

So this step could (theoretically) be done by a preprocessor on the server side to speed up the script.

### Step 2

Parses all (pre)processed container query rules and stores them indexed by the preceding selector to be used in step 3.

### Step 3

Loops through all stored queries and adds or removes the CSS classes of the matching elements. The added CSS classes look the same as the container query itself to improve the readability in the developer tools of the browser. E.g.:

```html
<div class="element :container(min-width:10px)"></div>
```

## License

MIT
