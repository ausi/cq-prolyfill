# Container Queries Prolyfill

[![Build Status](https://img.shields.io/travis/ausi/cq-prolyfill/master.svg?style=flat-square)](https://travis-ci.org/ausi/cq-prolyfill/branches) [![Coverage](https://img.shields.io/coveralls/ausi/cq-prolyfill/master.svg?style=flat-square)](https://coveralls.io/github/ausi/cq-prolyfill?branch=master) [![npm version](https://img.shields.io/npm/v/cq-prolyfill.svg?style=flat-square) ![npm downloads](https://img.shields.io/npm/dt/cq-prolyfill.svg?style=flat-square)](https://www.npmjs.com/package/cq-prolyfill) ![MIT](https://img.shields.io/npm/l/cq-prolyfill.svg?style=flat-square) [![Patreon](https://img.shields.io/badge/Patreon-%24110%2Fmonth-lightgrey.svg?style=flat-square&colorA=E6461A&colorB=555555)](https://www.patreon.com/ausi)

This is a [prolyfill](https://au.si/what-is-a-prolyfill) for a special version of [container queries](https://github.com/ResponsiveImagesCG/container-queries) (aka element queries). You can read more about the idea and how they work internally in [this article](https://au.si/css-container-element-queries).

## Demo

A quick demo of the container queries in action can be found here:
<https://ausi.github.io/cq-prolyfill/demo/>

## Usage

With this prolyfill you can use container queries in your CSS in the following form:

```css
.element:container(min-width: 100px) {
	/* Styles for .element if its container is at least 100px wide */
}
.element[data-cq~="min-width:100px"] {
	/* Alternative syntax, same as the container query above */
}
.element:container(text-align = right) {
	/* Styles for .element if its container has a right text-align */
}
```

For more information take a look at the [usage documentation](docs/usage.md).

## Documentation

[Read the documentation](docs/index.md) to see how you can install and use this script on your next project.

## Browser Support

* Firefox 52+
* Opera 48+
* Chrome 49+
* Internet Explorer 11
* Edge 14+
* Safari 9+
* iOS 9+
* Android 4.4+

Thanks to [BrowserStack](https://www.browserstack.com/automate) for sponsoring automated cross browser testing for this project.

## Contribute

* Create a [new issue on GitHub](https://github.com/ausi/cq-prolyfill/issues/new) if you have a question, a suggestion or found a bug.
* Talk about it on IRC: Join `#cq-prolyfill` on Freenode or [connect with the browser](https://webchat.freenode.net?randomnick=1&channels=%23cq-prolyfill&prompt=1).
* Spread the word about this project.
* [Support this project on Patreon](https://www.patreon.com/ausi).

## Sponsors

Thanks to all sponsors that help to bring this project forward. You can [become a sponsor now](https://www.patreon.com/ausi) too.

* [Webflow](https://webflow.com/)
* [BrowserStack](https://www.browserstack.com/)

## License

MIT
