/*eslint-env node */
/*eslint-disable no-process-exit,strict*/

var postcssPlugin = require('./postcss-plugin');

var data = {
	':container( MIN-WIDTH : 100.00px )': '.\\:container\\(min-width\\:100\\.00px\\)',
	':container( 10% < background-color-lightness < 90% )': '.\\:container\\(10\\%\\<background-color-lightness\\<90\\%\\)',
	'.before:container(height > 100px).after': '.before.\\:container\\(height\\>100px\\).after',
	'.combined-selector:container(width > 100px):container(height > 100px)': '.combined-selector.\\:container\\(width\\>100px\\).\\:container\\(height\\>100px\\)',
	':container( " width <= 100.00px")': '.\\:container\\(width\\<\\=100\\.00px\\)',
};

var failed = [];

Object.keys(data).forEach(function(selector) {
	var expected = data[selector] + '{}';
	var processed = postcssPlugin.process(selector + '{}').css;
	if (processed !== expected) {
		failed.push('Failed that "' + processed + '" equals "' + expected + '"');
	}
});

if (failed.length) {
	console.log(failed.join('\n'));
	console.log('PostCSS tests failed');
	process.exit(1);
}
else {
	console.log('PostCSS tests: ' + Object.keys(data).length + ' passed');
}
