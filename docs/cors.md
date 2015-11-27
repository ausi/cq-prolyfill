# Cross origin stylesheets

In order to work properly the prolyfill needs access to the stylesheets on the page. If a stylesheet is served from a different domain it needs to have a CORS header, e.g. `Access-Control-Allow-Origin: *`. You can find more information about how to enable CORS on your server at [enable-cors.org](http://enable-cors.org/server.html).

For better performance it’s also recommended to use the attribute `crossorigin="anonymous"` for cross origin `<link>` tags:

```html
<link crossorigin="anonymous" href="http://example.com/styles.css" rel="stylesheet">
```
