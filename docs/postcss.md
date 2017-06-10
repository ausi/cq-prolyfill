# PostCSS plugin

To improve the performance of the prolyfill, you should use [PostCSS](https://github.com/postcss/postcss) to prepare the stylesheet on the server side:

```js
var fs = require('fs');
var cqPostcss = require('cq-prolyfill/postcss-plugin');

fs.writeFileSync(
	'dist.css',
	cqPostcss.process(fs.readFileSync('source.css', 'utf-8')).css
);
```

This converts container queries like:

```css
.element:container(width >= 100px) { /* ... */ }
```

Into valid CSS selectors:

```css
.element.\:container\(width\>\=100px\) { /* ... */ }
```

If you don’t use the PostCSS plugin, activate the `preprocess` option in the [configuration](config.md).

Don’t forget to [enable CORS](cors.md) if the stylesheet is loaded from a different domain.

## Build systems

If you’re using a build system like grunt or gulp you can integrate the PostCSS plugin in this process.

### Grunt

```js
grunt.loadNpmTasks('grunt-postcss');
grunt.initConfig({
	postcss: {
		options: {
			processors: [
				require('cq-prolyfill/postcss-plugin')()
			]
		},
		dist: {
			src: 'css/*.css'
		}
	}
});
```

### Gulp

```js
var postcss = require('gulp-postcss');
gulp.task('css', function () {
	return gulp.src('./src/*.css')
		.pipe(postcss([
			require('cq-prolyfill/postcss-plugin')()
		]))
		.pipe(gulp.dest('./dest'));
});
```
