# How it works

It basically runs in three steps:

## Step 1

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

## Step 2

Parses all (pre)processed container query rules and stores them indexed by the preceding selector to be used in step 3.

## Step 3

Loops through all stored queries and adds or removes the CSS classes of the matching elements. The added CSS classes look the same as the container query itself to improve the readability in the developer tools of the browser. E.g.:

```html
<div class="element :container(width>=10px)"></div>
```
