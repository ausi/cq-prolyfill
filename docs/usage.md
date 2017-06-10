# Usage

One goal of this prolyfill is to be ease to use. Elements with container queries don’t have to be modified in the markup, you don’t have to predefine “element break-points” or the like, everything is done via CSS. All you need is to load the script on your page and you are ready to use container queries in your CSS. You can load the script in any way you like, I would recommend to load it asynchronously in the head:

```html
<script src="cq-prolyfill.min.js" async></script>
```

Now you can use container queries in the following form:

```css
.element:container(min-width: 100px) {
	/* Styles for .element if its container is at least 100px wide */
}
.element:container(100px < height < 200px) {
	/* Styles for .element if its container is between 100px and 200px high */
}
.element:container(text-align = right) {
	/* Styles for .element if its container has a right text-align */
}
```

## Syntax

A container query begins with `:container(` and ends with `)`. It contains a single query against a CSS property and can be suffixed by an [optional filter](#color-filters). The syntax of the query follows the [Media Queries Level 4](https://www.w3.org/TR/2017/WD-mediaqueries-4-20170519/#mq-features) syntax for media features including the range form. The container query is attached to the element you want to style. So instead of writing `.parent:media(min-with: 100px) .child` like in other element query scripts, you append the query to the child itself `.child:container(width > 100px)`.

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

For more details about the comparison syntax take a look at the [Media Queries Level 4 Specification](https://www.w3.org/TR/2017/WD-mediaqueries-4-20170519/#mq-features).

## Color filters

It’s also possible to query color properties, for this purpose the color filters `hue`, `saturation`, `lightness` and `alpha` are available.

```css
.element:container(background-color-lightness > 20%) {
	/* Styles for .element if its containers background-color is brighter than 20% */
}
.element:container(60deg < background-color-hue < 180deg) {
	/* Styles for .element if its containers background-color is greenish */
}
.element:container(max-background-color-alpha: 10%) {
	/* Styles for .element if its containers background-color is nearly transparent */
}
```
