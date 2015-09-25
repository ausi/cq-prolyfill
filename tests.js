/*global QUnit*/
(function() {
'use strict';

QUnit.module('All', {
	afterEach: function(assert) {
		if (window.BrowserStack && QUnit.config.queue.length < 5) {
			var done = assert.async();
			window.BrowserStack.post('/_log', 'coverage: ' + JSON.stringify(window.__coverage__), function() {
				done();
			});
		}
	},
});

var fixture = document.getElementById('qunit-fixture');
var TEST_FILES_URL_CORS = 'http://cdn.rawgit.com/ausi/cq-prolyfill/78569ef/test-files/';
var TEST_FILES_URL_CROSS_ORIGIN = 'http://127.0.0.1.xip.io:8888/test-files/';
var TEST_FILES_PATH = 'test-files/';

/*global reprocess, getOriginalStyle*/
QUnit.test('CORS', function(assert) {

	var done = assert.async();

	var element;

	load('cors.css', false, true, function() {
		assert.equal(getOriginalStyle(element, 'color'), 'red', 'Style Stylesheet');
	load('cors.css', true, true, function() {
		assert.equal(getOriginalStyle(element, 'color'), 'red', 'Style Stylesheet with crossOrigin');
	load('cors-with-cq.css', false, true, function() {
		assert.equal(getOriginalStyle(element, 'color'), 'blue', 'Container Query');
	load('cors-with-cq.css', true, true, function() {
		assert.equal(getOriginalStyle(element, 'color'), 'blue', 'Container Query with crossOrigin');
	load('cors.css', false, false, function() {
		assert.ok(getOriginalStyle(element, 'color') === undefined || getOriginalStyle(element, 'color') === 'red', 'Non-CORS Style Stylesheet');
		assert.equal(getComputedStyle(element).color, 'rgb(255, 0, 0)', 'Non-CORS Style Stylesheet computed style');
	load('cors.css', true, false, function() {
		assert.ok(getOriginalStyle(element, 'color') === undefined || getOriginalStyle(element, 'color') === 'red', 'Non-CORS Style Stylesheet with crossOrigin');
		if ('crossOrigin' in document.createElement('link')) {
			assert.equal(getComputedStyle(element).color, 'rgb(0, 0, 0)', 'Non-CORS Style Stylesheet with crossOrigin computed style (crossOrigin supported)');
		}
		else {
			assert.equal(getComputedStyle(element).color, 'rgb(255, 0, 0)', 'Non-CORS Style Stylesheet with crossOrigin computed style (crossOrigin not supported)');
		}
	load('cors-with-cq.css', false, false, function() {
		assert.strictEqual(getOriginalStyle(element, 'color'), undefined, 'Non-CORS Container Query');
	load('cors-with-cq.css', true, false, function() {
		assert.strictEqual(getOriginalStyle(element, 'color'), undefined, 'Non-CORS Container Query with crossOrigin');
	done(); }); }); }); }); }); }); }); });

	function load(file, crossOrigin, cors, callback) {

		fixture.innerHTML = '';

		var link = document.createElement('link');
		link.rel = 'stylesheet';
		if (crossOrigin) {
			link.crossOrigin = 'anonymous';
		}
		link.onload = link.onerror = onLoad;
		link.href = (cors ? TEST_FILES_URL_CORS : TEST_FILES_URL_CROSS_ORIGIN) + file;
		fixture.appendChild(link);

		element = document.createElement('div');
		element.className = 'cors-test';
		fixture.appendChild(element);

		function onLoad() {
			reprocess(function() {
				callback();
			});
		}

	}

});

/*global preprocess, SELECTOR_ESCAPED_REGEXP, SELECTOR_REGEXP*/
QUnit.test('preprocess', function(assert) {
	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.first:container( width >= 100.00px ) { display: block }'
		+ '.second:container( height <= 10em ) > child { display: block }'
		+ '.third:container( width <= 100px ), .fourth:container( height >= 100px ) { display: block }';
	fixture.appendChild(style);
	var done = assert.async();
	preprocess(function () {
		var newStyle = style.previousSibling;
		var rules = newStyle.sheet.cssRules;
		assert.equal(style.sheet.disabled, true, 'Old stylesheet disabled');
		assert.equal(newStyle.sheet.disabled, false, 'New stylesheet enabled');
		assert.equal(rules.length, 3, 'Three rules');
		assert.equal(newStyle.innerHTML.match(SELECTOR_ESCAPED_REGEXP).length, 4, 'Four container queries');
		assert.ok(rules[0].selectorText.match(SELECTOR_ESCAPED_REGEXP) || rules[0].selectorText.match(SELECTOR_REGEXP), 'Query matches either the escaped or unescaped RegExp');
		done();
	});
});

/*global preprocessSheet*/
QUnit.test('preprocessSheet', function(assert) {

	var allDone = assert.async();
	var doneCount = 0;
	var done = function() {
		doneCount++;
		if (doneCount >= 4) {
			allDone();
		}
	};

	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = TEST_FILES_PATH + 'cors-with-cq.css';
	link.onload = link.onerror = onLoad;
	fixture.appendChild(link);

	function onLoad() {

		link.sheet.disabled = true;
		var calledback = false;
		preprocessSheet(link.sheet, function() {
			calledback = true;
			assert.notOk(link.previousSibling, 'Disabled stylesheet not preprocessed');
		});
		assert.ok(calledback, 'Disabled stylesheet callback instantly');
		link.sheet.disabled = false;

		calledback = false;
		preprocessSheet({}, function() {
			calledback = true;
			assert.notOk(link.previousSibling, 'Stylesheet without ownerNode not preprocessed');
		});
		assert.ok(calledback, 'Stylesheet without ownerNode callback instantly');

		for (var i = 0; i < 4; i++) {
			preprocessSheet(link.sheet, function() {
				assert.equal(fixture.getElementsByTagName('style').length, 1, 'Calling multiple times doesn’t duplicate the styles');
				done();
			});
		}

	}

});

/*global escapeSelectors*/
QUnit.test('escapeSelectors', function(assert) {
	assert.equal(escapeSelectors(':container( WIDTH > 100px )'), '.\\:container\\(width\\>100px\\)', 'Simple query');
	assert.equal(escapeSelectors(':container(width > 100px < 200px)'), '.\\:container\\(width\\>100px\\<200px\\)', 'Double comparison');
	assert.equal(escapeSelectors(':container(color lightness < 10%)'), '.\\:container\\(color\\|lightness\\<10\\%\\)', 'Filter parameter');
});

/*global parseRules, queries*/
QUnit.test('parseRules', function(assert) {
	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.foo:active:hover:focus:checked .before:container( WIDTH >= 100.00px ).after>child { display: block }'
		+ ':container(height < 10em) .general-selector { display: block }'
		+ '.combined-selector:container(width > 100px):container(height > 100px) { display: block }'
		+ '.double-comparison:container(width > 100px < 200px) { display: block }'
		+ '.filter:container(color lightness < 10%) { display: block }'
		+ '@media screen { .inside-media-query:container(height < 10em) { display: block } }';
	fixture.appendChild(style);
	var done = assert.async();
	preprocess(function () {

		parseRules();
		assert.equal(Object.keys(queries).length, 7, 'Seven queries');

		assert.ok(Object.keys(queries)[0].match(/^\.foo (?:\.before|\.after){2}\.\\:container\\\(width\\>\\=100\\\.00px\\\)$/), 'Correct key');
		assert.ok(queries[Object.keys(queries)[0]]._selector.match(/^\.foo (?:\.before|\.after){2}$/), 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[0]]._prop, 'width', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[0]]._types, ['>='], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[0]]._values, ['100.00px'], 'Value');
		assert.equal(queries[Object.keys(queries)[0]]._className, ':container(width>=100.00px)', 'Class name');

		assert.equal(Object.keys(queries)[1], '*.\\:container\\(height\\<10em\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[1]]._selector, '*', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[1]]._prop, 'height', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[1]]._types, ['<'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[1]]._values, ['10em'], 'Value');
		assert.equal(queries[Object.keys(queries)[1]]._className, ':container(height<10em)', 'Class name');

		// Fix CSS class sorting for IE/Edge
		var combinedKeys = [Object.keys(queries)[2], Object.keys(queries)[3]].sort().reverse();

		assert.equal(combinedKeys[0], '.combined-selector.\\:container\\(width\\>100px\\)', 'Correct key');
		assert.equal(queries[combinedKeys[0]]._selector, '.combined-selector', 'Preceding selector');
		assert.equal(queries[combinedKeys[0]]._prop, 'width', 'Property');
		assert.deepEqual(queries[combinedKeys[0]]._types, ['>'], 'Mode');
		assert.deepEqual(queries[combinedKeys[0]]._values, ['100px'], 'Value');
		assert.equal(queries[combinedKeys[0]]._className, ':container(width>100px)', 'Class name');

		assert.equal(combinedKeys[1], '.combined-selector.\\:container\\(height\\>100px\\)', 'Correct key');
		assert.equal(queries[combinedKeys[1]]._selector, '.combined-selector', 'Preceding selector');
		assert.equal(queries[combinedKeys[1]]._prop, 'height', 'Property');
		assert.deepEqual(queries[combinedKeys[1]]._types, ['>'], 'Mode');
		assert.deepEqual(queries[combinedKeys[1]]._values, ['100px'], 'Value');
		assert.equal(queries[combinedKeys[1]]._className, ':container(height>100px)', 'Class name');

		assert.equal(Object.keys(queries)[4], '.double-comparison.\\:container\\(width\\>100px\\<200px\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[4]]._selector, '.double-comparison', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[4]]._prop, 'width', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[4]]._types, ['>', '<'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[4]]._values, ['100px', '200px'], 'Value');
		assert.equal(queries[Object.keys(queries)[4]]._className, ':container(width>100px<200px)', 'Class name');

		assert.equal(Object.keys(queries)[5], '.filter.\\:container\\(color\\|lightness\\<10\\%\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[5]]._selector, '.filter', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[5]]._prop, 'color', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[5]]._filter, 'lightness', 'Filter');
		assert.deepEqual(queries[Object.keys(queries)[5]]._types, ['<'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[5]]._values, ['10%'], 'Value');
		assert.equal(queries[Object.keys(queries)[5]]._className, ':container(color|lightness<10%)', 'Class name');

		assert.equal(Object.keys(queries)[6], '.inside-media-query.\\:container\\(height\\<10em\\)', 'Correct key');

		done();
	});
});

/*global loadExternal*/
QUnit.test('loadExternal', function(assert) {

	var allDone = assert.async();
	var doneCount = 0;
	var done = function() {
		doneCount++;
		if (doneCount >= 6) {
			allDone();
		}
	};

	loadExternal(TEST_FILES_PATH + 'test.txt', function(response) {
		assert.strictEqual(response, 'test\n', 'Regular request');
		done();
	});

	loadExternal(TEST_FILES_URL_CORS + 'test.txt', function(response) {
		assert.strictEqual(response, 'test\n', 'CORS request');
		done();
	});

	loadExternal(TEST_FILES_PATH + '404', function(response) {
		assert.strictEqual(response, '', 'Regular 404 request');
		done();
	});

	loadExternal(TEST_FILES_URL_CORS + '404', function(response) {
		assert.strictEqual(response, '', 'CORS 404 request');
		done();
	});

	loadExternal('http://google.com/', function(response) {
		assert.strictEqual(response, '', 'Invalid CORS request');
		done();
	});

	loadExternal('invalid-protocol://foo', function(response) {
		assert.strictEqual(response, '', 'Invalid protocol request');
		done();
	});

});

/*global fixRelativeUrls*/
QUnit.test('fixRelativeUrls', function(assert) {
	var data = {
		'url()': 'url()',
		'url( \t)': 'url( \t)',
		'url(foo)': 'url("http://example.org/foo")',
		'url("foo")': 'url("http://example.org/foo")',
		'url(\'foo\')': 'url(\'http://example.org/foo\')',
		'url( foo \t)': 'url("http://example.org/foo")',
		'url( "foo" \t)': 'url("http://example.org/foo")',
		'url( \'foo\' \t)': 'url(\'http://example.org/foo\')',
		'url("http://not.example.com/foo")': 'url("http://not.example.com/foo")',
	};
	Object.keys(data).forEach(function(css) {
		assert.equal(fixRelativeUrls(css, 'http://example.org/'), data[css], css + ' => ' + data[css]);
	});
});

/*global resolveRelativeUrl*/
QUnit.test('resolveRelativeUrl', function(assert) {
	var base = 'http://example.com/dir/file.ext?query#anchor';
	assert.equal(resolveRelativeUrl('http://example.org', base), 'http://example.org/', 'Absolute URL');
	assert.equal(resolveRelativeUrl('//example.org', base), 'http://example.org/', 'Protocol relative');
	assert.equal(resolveRelativeUrl('/foo', base), 'http://example.com/foo', 'Domain relative');
	assert.equal(resolveRelativeUrl('foo', base), 'http://example.com/dir/foo', 'Directory relative');
	assert.equal(resolveRelativeUrl('?foo', base), 'http://example.com/dir/file.ext?foo', 'Query relative');
	assert.equal(resolveRelativeUrl('#foo', base), 'http://example.com/dir/file.ext?query#foo', 'Anchor relative');
	var link = document.createElement('a');
	link.href = '/';
	assert.equal(link.href, document.location.protocol + '//' + document.location.href.split('://')[1].split('/')[0] + '/', 'Opera <base> tag bug');
});

/*global splitSelectors*/
QUnit.test('splitSelectors', function(assert) {
	assert.deepEqual(splitSelectors('foo'), ['foo'], 'Simple selector doesn’t get split');
	assert.deepEqual(splitSelectors('foo,foo\t\n ,\t\n foo'), ['foo', 'foo', 'foo'], 'Simple selectors do get split');
});

/*global evaluateQuery*/
QUnit.test('evaluateQuery', function(assert) {

	var element = document.createElement('div');
	element.style.cssText = 'width: 100px; height: 100px; font-size: 10px; opacity: 0.5; background: red';
	fixture.appendChild(element);

	var data = [
		['>', 99, 100],
		['<', 101, 100],
		['>=', 100, 101],
		['<=', 100, 99],
		['=', 100, 50],
		['!=', 50, 100],
	];
	data.forEach(function(item) {
		assert.strictEqual(evaluateQuery(element, {_prop: 'width', _types: [item[0]], _values: [item[1] + 'px']}), true, 'Width 100 ' + item[0] + ' ' + item[1]);
		assert.strictEqual(evaluateQuery(element, {_prop: 'width', _types: [item[0]], _values: [item[2] + 'px']}), false, 'Width 100 not ' + item[0] + ' ' + item[2]);
		assert.strictEqual(evaluateQuery(element, {_prop: 'height', _types: [item[0]], _values: [item[1] + 'px']}), true, 'Height 100 ' + item[0] + ' ' + item[1]);
		assert.strictEqual(evaluateQuery(element, {_prop: 'height', _types: [item[0]], _values: [item[2] + 'px']}), false, 'Height 100 not ' + item[0] + ' ' + item[2]);
	});

	data = [
		['width', '=', '10em', '9.9em'],
		['display', '=', 'block', 'inline'],
		['display', '!=', 'inline', 'block'],
		['visibility', '=', 'visible', 'hidden'],
		['opacity', '=', '0.500', '1'],
		['opacity', '>', '0.49', '0.5'],
		['font-size', '=', '7.50pt', '10em'],
	];
	data.forEach(function(item) {
		assert.strictEqual(evaluateQuery(element, {_prop: item[0], _types: [item[1]], _values: [item[2]]}), true, item[0] + ' ' + item[1] + ' ' + item[2]);
		assert.strictEqual(evaluateQuery(element, {_prop: item[0], _types: [item[1]], _values: [item[3]]}), false, item[0] + ' not ' + item[1] + ' ' + item[3]);
	});

	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'hue', _types: ['='], _values: ['0deg']}), true, 'Red Hue = 0deg');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'hue', _types: ['>'], _values: ['10deg']}), false, 'Red Hue not > 10deg');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'saturation', _types: ['='], _values: ['100%']}), true, 'Red Saturation = 100%');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'saturation', _types: ['<'], _values: ['90%']}), false, 'Red Saturation not < 90%');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'lightness', _types: ['>'], _values: ['10%']}), true, 'Red Lightness > 10%');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'lightness', _types: ['<'], _values: ['10%']}), false, 'Red Lightness not < 10%');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'alpha', _types: ['='], _values: ['1']}), true, 'Red Alpha = 1');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'alpha', _types: ['<'], _values: ['0.99']}), false, 'Red Alpha not < 0.99');

	assert.strictEqual(evaluateQuery(element, {_prop: 'display', _types: ['<'], _values: ['10px']}), false, 'Invalid block < 10px');
	assert.strictEqual(evaluateQuery(element, {_prop: 'display', _types: ['>'], _values: ['10px']}), false, 'Invalid block > 10px');
	assert.strictEqual(evaluateQuery(element, {_prop: 'invalid', _types: ['<'], _values: ['10px']}), false, 'Invalid undefined < 10px');
	assert.strictEqual(evaluateQuery(element, {_prop: 'invalid', _types: ['>'], _values: ['10px']}), false, 'Invalid undefined > 10px');
	assert.strictEqual(evaluateQuery(element, {_prop: 'font-size', _types: ['<'], _values: ['foo']}), false, 'Invalid 10px < foo');
	assert.strictEqual(evaluateQuery(element, {_prop: 'font-size', _types: ['>'], _values: ['foo']}), false, 'Invalid 10px > foo');
	assert.strictEqual(evaluateQuery(element, {_prop: 'font-size', _types: ['<'], _values: ['']}), false, 'Invalid 10px < ""');
	assert.strictEqual(evaluateQuery(element, {_prop: 'font-size', _types: ['>'], _values: ['']}), false, 'Invalid 10px > ""');
	assert.strictEqual(evaluateQuery(element, {_prop: 'width', _filter: 'invalid', _types: ['>'], _values: ['0px']}), false, 'Invalid filter');
	assert.strictEqual(evaluateQuery(element, {_prop: 'width', _types: ['='], _values: ['auto']}), false, 'Invalid width = auto');

});

/*global getContainer, containerCache: true, createCacheMap*/
QUnit.test('getContainer', function(assert) {

	var element = document.createElement('div');
	element.innerHTML = '<span><div style="float: left"><a>';
	document.body.appendChild(element);
	var link = element.getElementsByTagName('a')[0];
	var float = link.parentNode;
	var span = float.parentNode;

	assert.strictEqual(getContainer(link, 'width'), element, 'Parent <div> for width');
	assert.strictEqual(getContainer(link, 'height'), document.documentElement, 'Document element for height');

	span.style.display = 'block';
	containerCache = createCacheMap(); // Clear cache
	assert.strictEqual(getContainer(link, 'width'), span, '<span> display block for width');

	element.style.height = '100px';
	containerCache = createCacheMap(); // Clear cache
	assert.strictEqual(getContainer(link, 'height'), element, '<div> fixed height');

	span.style.cssText = 'display: block; height: 50%';
	containerCache = createCacheMap(); // Clear cache
	assert.strictEqual(getContainer(link, 'height'), span, '<span> display block percentage height');
	assert.ok(containerCache.has(link));

	document.body.removeChild(element);

});

/*global isFixedSize*/
QUnit.test('isFixedSize', function(assert) {

	var element = document.createElement('div');
	fixture.appendChild(element);

	assert.equal(isFixedSize(element, 'width'), false, 'Standard <div> width');
	assert.equal(isFixedSize(element, 'height'), false, 'Standard <div> height');

	element.style.cssText = 'width: 100%; height: 100%';
	assert.equal(isFixedSize(element, 'width'), false, 'Percentage width');
	assert.equal(isFixedSize(element, 'height'), false, 'Percentage height');

	element.style.cssText = 'width: 100px; height: 100px';
	assert.equal(isFixedSize(element, 'width'), true, 'Fixed width');
	assert.equal(isFixedSize(element, 'height'), true, 'Fixed height');

});

/*global isIntrinsicSize*/
QUnit.test('isIntrinsicSize', function(assert) {

	var element = document.createElement('div');
	fixture.appendChild(element);

	assert.equal(isIntrinsicSize(element, 'width'), false, 'Standard <div> width');
	assert.equal(isIntrinsicSize(element, 'height'), true, 'Standard <div> height');

	element.style.cssText = 'display: inline';
	assert.equal(isIntrinsicSize(element, 'width'), true, 'Display inline width');
	assert.equal(isIntrinsicSize(element, 'height'), true, 'Display inline height');

	element.style.cssText = 'display: none';
	assert.equal(isIntrinsicSize(element, 'width'), false, 'Display none width');
	assert.equal(isIntrinsicSize(element, 'height'), false, 'Display none height');

	element.style.cssText = 'display: inline-block';
	assert.equal(isIntrinsicSize(element, 'width'), true, 'Display inline-block width');
	assert.equal(isIntrinsicSize(element, 'height'), true, 'Display inline-block height');

	element.style.cssText = 'float: left';
	assert.equal(isIntrinsicSize(element, 'width'), true, 'Float left width');
	assert.equal(isIntrinsicSize(element, 'height'), true, 'Float left height');

	element.style.cssText = 'position: absolute';
	assert.equal(isIntrinsicSize(element, 'width'), true, 'Position absolute width');
	assert.equal(isIntrinsicSize(element, 'height'), true, 'Position absolute height');

	element.style.cssText = 'display: inline-block; width: 100%';
	assert.equal(isIntrinsicSize(element, 'width'), false, 'Percentage width');

	element.style.cssText = 'display: inline-block; width: 100px';
	assert.equal(isIntrinsicSize(element, 'width'), false, 'Pixel width');

	element.style.cssText = 'display: inline-block; height: 100%';
	assert.equal(isIntrinsicSize(element, 'height'), false, 'Percentage height');

	element.style.cssText = 'display: inline-block; height: 100px';
	assert.equal(isIntrinsicSize(element, 'height'), false, 'Pixel height');

	element.style.cssText = 'display: inline; float: left; width: 100px; height: 100px';
	assert.equal(isIntrinsicSize(element, 'width'), false, 'Display inline float left pixel width');
	assert.equal(isIntrinsicSize(element, 'height'), false, 'Display inline float left pixel height');

});

/*global getSize*/
QUnit.test('getSize', function(assert) {
	var element = document.createElement('div');
	element.style.width = '100px';
	element.style.height = '100px';
	element.style.boxSizing = 'border-box';
	element.style.padding = '1pc';
	element.style.border = '10px solid black';
	fixture.appendChild(element);
	assert.equal(getSize(element, 'width'), 48, 'Width');
	assert.equal(getSize(element, 'height'), 48, 'Height');
});

/*global getComputedLength*/
QUnit.test('getComputedLength', function(assert) {

	var data = [
		['1px', 1],
		['10px', 10],
		['-0.123px', -0.123],
		['12pt', 16],
		['1pc', 16],
		['1in', 96],
		['2.54cm', 96],
		['25.4mm', 96],
		['1rem', 16],
		['1em', 10],
		['1ex', 5],
		['100vw', window.innerWidth],
		['100vh', window.innerHeight],
		['100vmin', Math.min(window.innerWidth, window.innerHeight)],
		['100vmax', Math.max(window.innerWidth, window.innerHeight)],
		['123foobar', 123],
	];

	var dummy = document.createElement('div');
	dummy.style.fontSize = '10px';
	fixture.appendChild(dummy);

	data.forEach(function(item) {
		assert.equal(getComputedLength(item[0], dummy), item[1], item[0] + ' == ' + item[1] + 'px');
	});

});

/*global getComputedStyle*/
QUnit.test('getComputedStyle', function(assert) {
	var element = document.createElement('div');
	element.style.width = '100px';
	element.style.height = '1in';
	element.style.cssFloat = 'left';
	fixture.appendChild(element);
	assert.equal(getComputedStyle(element).width, '100px', 'Normal style');
	assert.equal(getComputedStyle(element).height, '96px', 'Converted to pixel');
	assert.equal(getComputedStyle(element).cssFloat, 'left', 'Float left');
	assert.equal(getComputedStyle(element).display, 'block', 'Default style');
	element.style.cssText = 'display: inline; float: left; font-size: 10px';
	assert.equal(getComputedStyle(element).display, 'block', 'Correct display value');
	assert.equal(getComputedStyle(element).getPropertyValue('display'), 'block', 'Correct display value via getPropertyValue');
	assert.equal(getComputedStyle(element).fontSize, '10px', 'Correct font-size value');
	assert.equal(getComputedStyle(element).getPropertyValue('font-size'), '10px', 'Correct font-size value via getPropertyValue');
});

/*global getOriginalStyle*/
QUnit.test('getOriginalStyle', function(assert) {

	var element = document.createElement('div');
	element.className = 'myel';

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.myel { width: 100%; height: auto !important }';

	fixture.appendChild(style);
	fixture.appendChild(element);

	assert.equal(getOriginalStyle(element, 'width'), '100%', 'Get width from <style>');
	assert.equal(getOriginalStyle(element, 'height'), 'auto', 'Get height from <style>');
	assert.equal(getOriginalStyle(element, 'color'), undefined, 'Get undefined property');
	element.style.width = '100px';
	assert.equal(getOriginalStyle(element, 'width'), '100px', 'Get width from style attribute');
	element.style.width = '';
	assert.equal(getOriginalStyle(element, 'width'), '100%', 'Get width from <style>');
	element.style.height = '100px';
	assert.equal(getOriginalStyle(element, 'height'), 'auto', 'Get height from <style> !important');
	element.style.setProperty('height', '100px', 'important');
	assert.equal(getOriginalStyle(element, 'height'), '100px', 'Get height from style attribute !important');

});

/*global parseColor*/
QUnit.test('parseColor', function(assert) {
	assert.deepEqual(parseColor('rgb(255, 0, 0)'), [0, 100, 50, 1], 'Rgb');
	assert.deepEqual(parseColor('rgba(255, 0, 0, 0.5)'), [0, 100, 50, 0.5], 'Rgba');
	assert.deepEqual(parseColor('transparent'), [0, 0, 0, 0], 'Transparent');
	assert.deepEqual(parseColor(undefined), [0, 0, 0, 0], 'Undefined');
});

/*global rgbaToHsla*/
QUnit.test('rgbaToHsla', function(assert) {
	assert.deepEqual(rgbaToHsla([0, 0, 0, 1]), [0, 0, 0, 1], 'Black');
	assert.deepEqual(rgbaToHsla([255, 0, 0, 1]), [0, 100, 50, 1], 'Red');
	assert.deepEqual(rgbaToHsla([0, 255, 0, 1]), [120, 100, 50, 1], 'Green');
	assert.deepEqual(rgbaToHsla([0, 0, 255, 1]), [240, 100, 50, 1], 'Blue');
	assert.deepEqual(rgbaToHsla([204, 255, 204, 0.5]), [120, 100, 90, 0.5], 'Light semitransparent green');
});

/*global filterRulesByElementAndProp*/
QUnit.test('filterRulesByElementAndProp', function(assert) {

	var element = document.createElement('div');
	element.className = 'myel';

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.myel, .notmyel { width: 1px }'
		+ '.notmyel { width: 2px }'
		+ '.myel { height: 3px }'
		+ '@media screen { div.myel { width: 4px } }';

	fixture.appendChild(style);
	fixture.appendChild(element);

	var rules = filterRulesByElementAndProp(style.sheet.cssRules, element, 'width');
	assert.equal(rules.length, 2, 'Two rules');
	assert.equal(rules[0]._selector, '.myel', 'First selector');
	assert.equal(rules[0]._rule.style.width, '1px', 'Property');
	assert.equal(rules[1]._selector, 'div.myel', 'Second selector');
	assert.equal(rules[1]._rule.style.width, '4px', 'Property');

});

/*global elementMatchesSelector*/
QUnit.test('elementMatchesSelector', function(assert) {

	var element = document.createElement('div');
	element.className = ':container(width>=100px)';
	fixture.appendChild(element);

	assert.ok(elementMatchesSelector(element, 'div'), 'Simple selector');
	assert.ok(elementMatchesSelector(element, '.\\:container\\(width\\>\\=100px\\)'), 'Escaped query');
	assert.ok(elementMatchesSelector(element, ':container( width >= 100px )'), 'Unescaped query');
	assert.ok(elementMatchesSelector(element, '\.:container(width>=100px)'), 'Unescaped query with leading dot');

});

/*global sortRulesBySpecificity*/
QUnit.test('sortRulesBySpecificity', function(assert) {
	var unsorted = [
		{_selector: 'tag1'},
		{_selector: 'tag2'},
		{_selector: '.class'},
		{_selector: '#id'},
		{_selector: 'tag tag'},
		{_selector: '.class.class'},
		{_selector: '#id#id'},
	];
	var sorted = [
		{_selector: '#id#id'},
		{_selector: '#id'},
		{_selector: '.class.class'},
		{_selector: '.class'},
		{_selector: 'tag tag'},
		{_selector: 'tag2'},
		{_selector: 'tag1'},
	];
	assert.deepEqual(sortRulesBySpecificity(unsorted), sorted, 'Correct sort order');
});

/*global getSpecificity*/
QUnit.test('getSpecificity', function(assert) {

	var data = [
		['', 0, 'empty'],
		['div', 1, 'tag'],
		['.class', 256, 'class'],
		['#id', 256 * 256, 'ID'],
		['div.class#id', 256 * 256 + 256 + 1, 'tag, class and ID'],
		['::after', 1, 'pseudo element'],
		[':hover', 256, 'pseudo class'],
		['[foo="bar"]', 256, 'attribute'],
		['.\\:container\\(width\\<\\=1px\\)', 256, 'escaped container query'],
		['.:container(width<=1px)', 256, 'unescaped container query'],
	];

	data.forEach(function(item) {
		assert.equal(getSpecificity(item[0]), item[1], item[2][0].toUpperCase() + item[2].substr(1) + ' ("' + item[0] + '")' + ': ' + item[1]);
	});

	var allSelectors = data.reduce(function(all, item) { return all + ' ' + item[0]; }, '').trim();
	var allSpecifity = data.reduce(function(all, item) { return all + item[1]; }, 0);
	assert.equal(getSpecificity(allSelectors), allSpecifity, 'All combined ("' + allSelectors.trim() + '")' + ': ' + allSpecifity);

	data.reverse();
	allSelectors = data.reduce(function(all, item) { return all + ' ' + item[0]; }, '').trim();
	assert.equal(getSpecificity(allSelectors), allSpecifity, 'All combined reverse ("' + allSelectors.trim() + '")' + ': ' + allSpecifity);

});

/*global createCacheMap*/
QUnit.test('createCacheMap', function(assert) {

	var map = createCacheMap();
	var el1 = document.createElement('div');
	var el2 = el1.cloneNode(false);

	assert.strictEqual(map.has(el1), false, 'Empty map');
	assert.strictEqual(map.has(el2), false, 'Empty map');
	assert.strictEqual(map.get(el1), undefined, 'Value undefined');

	map.set(el1, 'el1');
	assert.strictEqual(map.has(el1), true, 'Has element1');
	assert.strictEqual(map.has(el2), false, 'Hasn’t element2');

	map.set(el2, 'el2');
	assert.strictEqual(map.has(el1), true, 'Has element1');
	assert.strictEqual(map.has(el2), true, 'Has element2');
	assert.strictEqual(map.get(el1), 'el1', 'Value element1');
	assert.strictEqual(map.get(el2), 'el2', 'Value element2');

	map.set(el1, 'el1-new');
	assert.strictEqual(map.has(el1), true, 'Has element1');
	assert.strictEqual(map.get(el1), 'el1-new', 'New value element1');

});

/*global addClass, removeClass*/
QUnit.test('addClass, removeClass', function(assert) {

	var element = document.createElement('div');

	addClass(element, 'foo');
	assert.equal(element.className.trim(), 'foo', 'Add class foo');
	addClass(element, 'bar');
	assert.equal(element.className.trim(), 'foo bar', 'Add class bar');
	addClass(element, 'bar');
	assert.equal(element.className.trim(), 'foo bar', 'Add class bar again');
	addClass(element, ':container(width>=100px)');
	assert.equal(element.className.trim(), 'foo bar :container(width>=100px)', 'Add container query class');
	addClass(element, ':container(width>=100px)');
	assert.equal(element.className.trim(), 'foo bar :container(width>=100px)', 'Add container query class again');

	removeClass(element, 'foo');
	assert.equal(element.className.trim(), 'bar :container(width>=100px)', 'Remove class foo');
	removeClass(element, 'bar');
	assert.equal(element.className.trim(), ':container(width>=100px)', 'Remove class bar');
	removeClass(element, ':container(width>=100px)');
	assert.equal(element.className.trim(), '', 'Remove container query class');

});

/*global matchesMedia*/
QUnit.test('matchesMedia', function(assert) {

	assert.strictEqual(matchesMedia('screen'), true, 'Matches screen');
	assert.strictEqual(matchesMedia('not screen'), false, 'Doesn’t match not screen');
	assert.strictEqual(matchesMedia('print'), false, 'Doesn’t match print');
	assert.strictEqual(matchesMedia('not print'), true, 'Matches not print');

	var windowWidth = window.innerWidth || document.documentElement.clientWidth;

	assert.strictEqual(matchesMedia('(min-width: ' + (windowWidth - 50) + 'px)'), true, 'Matches smaller min-width');
	assert.strictEqual(matchesMedia('(min-width: ' + (windowWidth + 50) + 'px)'), false, 'Doesn’t match larger min-width');
	assert.strictEqual(matchesMedia('(max-width: ' + (windowWidth + 50) + 'px)'), true, 'Matches larger max-width');
	assert.strictEqual(matchesMedia('(max-width: ' + (windowWidth - 50) + 'px)'), false, 'Doesn’t match smaller max-width');

});

/*global arrayFrom*/
QUnit.test('arrayFrom', function(assert) {

	assert.deepEqual(arrayFrom({0: 'foo', 1: 'bar', length: 2}), ['foo', 'bar'], 'Simple array like');
	assert.deepEqual(arrayFrom({0: 'foo', 2: 'bar', length: 3}), ['foo', undefined, 'bar'], 'Array like with gap');

});

})();
