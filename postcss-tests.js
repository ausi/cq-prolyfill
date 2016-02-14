/*eslint-env node */
/*eslint-disable no-process-exit,strict*/

var postcssPlugin = require('./postcss-plugin');
var sass = require('node-sass');

var data = {
	':container( MIN-WIDTH : 100.00px )': '.\\:container\\(min-width\\:100\\.00px\\)',
	':container( 10% < background-color-lightness < 90% )': '.\\:container\\(10\\%\\<background-color-lightness\\<90\\%\\)',
	'.before:container(height > 100px).after': '.before.\\:container\\(height\\>100px\\).after',
	'.combined-selector:container(width > 100px):container(height > 100px)': '.combined-selector.\\:container\\(width\\>100px\\).\\:container\\(height\\>100px\\)',
	':container( " width <= 100.00px")': '.\\:container\\(width\\<\\=100\\.00px\\)',
};

var dataScss = {
	'.foo#{cq-prolyfill("width >= 100.00px")} { color: red }': '.foo.\\:container\\(width\\>\\=100\\.00px\\){color:red}',
	'.foo { @include cq-prolyfill("width >= 100.00px") { color: red } }': '.foo.\\:container\\(width\\>\\=100\\.00px\\){color:red}',
	'@function container($query) { @return cq-prolyfill($query) } .foo#{container("width >= 100.00px")} { color: red }': '.foo.\\:container\\(width\\>\\=100\\.00px\\){color:red}',
	'@mixin container($query) { @include cq-prolyfill($query) { @content } } .foo { @include container("width >= 100.00px") { color: red } }': '.foo.\\:container\\(width\\>\\=100\\.00px\\){color:red}',
};

var dataSass = {
	'.foo#{cq-prolyfill("width >= 100.00px")}\n\tcolor: red': '.foo.\\:container\\(width\\>\\=100\\.00px\\){color:red}',
	'.foo\n\t+cq-prolyfill("width >= 100.00px")\n\t\tcolor: red': '.foo.\\:container\\(width\\>\\=100\\.00px\\){color:red}',
	'@function container($query)\n\t@return cq-prolyfill($query)\n.foo#{container("width >= 100.00px")}\n\tcolor: red': '.foo.\\:container\\(width\\>\\=100\\.00px\\){color:red}',
	'=container($query)\n\t+cq-prolyfill($query)\n\t\t@content\n.foo\n\t+container("width >= 100.00px")\n\t\tcolor: red': '.foo.\\:container\\(width\\>\\=100\\.00px\\){color:red}',
};

var failed = [];

Object.keys(data).forEach(function(selector) {

	var expected = data[selector] + '{}';
	var processed = postcssPlugin.process(selector + '{}').css;
	if (processed !== expected) {
		failed.push('Failed that "' + processed + '" equals "' + expected + '"');
	}

	expected = data[selector] + '{color:red}';
	selector = '@import "mixins.scss"; ' + selector.replace(/:container\(\s*"*([^)]*?)"*\s*\)/g, '#{cq-prolyfill("$1")}') + '{color:red}';
	processed = (sass.renderSync({
		data: selector,
		outputStyle: 'compressed',
	}).css + '').trim();
	if (processed !== expected) {
		failed.push('Failed that "' + processed + '" equals "' + expected + '"');
	}

});

Object.keys(dataScss).forEach(function(css) {

	var expected = dataScss[css];
	css = '@import "mixins.scss"; ' + css;
	processed = (sass.renderSync({
		data: css,
		outputStyle: 'compressed',
	}).css + '').trim();
	if (processed !== expected) {
		failed.push('Failed that "' + processed + '" equals "' + expected + '"');
	}

});

Object.keys(dataSass).forEach(function(css) {

	var expected = dataSass[css];
	css = '@import "mixins.scss"\n' + css;
	processed = (sass.renderSync({
		data: css,
		indentedSyntax: true,
		outputStyle: 'compressed',
	}).css + '').trim();
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
