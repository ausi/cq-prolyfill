# Usage

One goal of this prolyfill is to be ease to use. Elements with container queries don’t have to be modified in the markup, you don’t have to predefine “element break-points” or the like, everything is done via CSS. All you need is to load the script on your page and you are ready to use container queries in your CSS. You can load the script in any way you like, I would recommend to load it asynchronously in the head:

```html
<script src="cq-prolyfill.min.js" async></script>
```

Now you can use container queries in the following form:

```css
.element:container(width >= 100px) {
	/* Styles for .element if its container is at least 100px wide */
}
.element:container(height > 100px < 200px) {
	/* Styles for .element if its container is between 100px and 200px high */
}
.element:container(text-align = right) {
	/* Styles for .element if its container has a right text-align */
}
```

## Syntax

A container query begins with `:container(` and ends with `)`. It contains one CSS property followed by an [optional filter](#color-filters) followed by up to two comparisons. The container query is attached to the element you want to style. So instead of writing `.parent:media(min-with: 100px) .child` like in other element query scripts, you append the query to the child itself `.child:container(width > 100px)`.

### Sass, Less and other preprocessors

If your CSS preprocessor has problems with the container query syntax, you can put quotes around the comparison like so:

```css
.element:container("width >= 100px") {
	/* Styles for .element if its container is at least 100px wide */
}
```

## Supported CSS properties

Technically all CSS properties are supported, but that doesn’t mean you should use them all. The following properties are most useful and tested: `width`, `height`, `background-color`, `color`, `text-align`, `font-size` and [custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables).

## Comparison operators

Available comparison operators are:

* `<` less than
* `>` greater than
* `<=` less than or equal
* `>=` greater than or equal
* `=` equal
* `!=` not equal

## Color filters

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
