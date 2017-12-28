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
var TEST_FILES_URL_TIME = 'http://127.0.0.1.nip.io:8889/time';
var TEST_FILES_URL_CORS = 'http://127.0.0.1.nip.io:8889/cors/test-files/';
var TEST_FILES_URL_CROSS_ORIGIN = 'http://127.0.0.1.nip.io:8888/test-files/';
var TEST_FILES_PATH = 'test-files/';

/*global reprocess, reevaluate, getOriginalStyle, processed*/
QUnit[/Opera\/9\.80\s.*Version\/12\.16/.test(navigator.userAgent)
	? 'skip'
	: 'test'
]('CORS', function(assert) {

	var done = assert.async();

	var element;

	load('cors.css', false, true, function() {
		assert.equal(getOriginalStyle(element, 'width'), '10%', 'Style Stylesheet');
	load('cors.css', true, true, function() {
		assert.equal(getOriginalStyle(element, 'width'), '10%', 'Style Stylesheet with crossOrigin');
	load('cors-with-cq.css', false, true, function() {
		assert.equal(getOriginalStyle(element, 'width'), '20%', 'Container Query');
	load('cors-with-cq.css', true, true, function() {
		assert.equal(getOriginalStyle(element, 'width'), '20%', 'Container Query with crossOrigin');
	load('cors.css', false, false, function() {
		assert.ok(getOriginalStyle(element, 'width') === undefined || getOriginalStyle(element, 'width') === '10%', 'Non-CORS Style Stylesheet');
		assert.equal(getComputedStyle(element, 'color'), 'rgb(255, 0, 0)', 'Non-CORS Style Stylesheet computed style');
	load('cors.css', true, false, function() {
		assert.ok(getOriginalStyle(element, 'width') === undefined || getOriginalStyle(element, 'width') === '10%', 'Non-CORS Style Stylesheet with crossOrigin');
		if ('crossOrigin' in document.createElement('link')) {
			assert.equal(getComputedStyle(element, 'color'), 'rgb(0, 0, 0)', 'Non-CORS Style Stylesheet with crossOrigin computed style (crossOrigin supported)');
		}
		else {
			assert.equal(getComputedStyle(element, 'color'), 'rgb(255, 0, 0)', 'Non-CORS Style Stylesheet with crossOrigin computed style (crossOrigin not supported)');
		}
	load('cors-with-cq.css', false, false, function() {
		assert.strictEqual(getOriginalStyle(element, 'width'), undefined, 'Non-CORS Container Query');
	load('cors-with-cq.css', true, false, function() {
		assert.strictEqual(getOriginalStyle(element, 'width'), undefined, 'Non-CORS Container Query with crossOrigin');
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
			processed ? reprocess(callback) : reevaluate(true, callback);
		}

	}

});

/*global reprocess, config, startObserving, observer: true*/
QUnit.test('DOM Mutations', function(assert) {

	var element = document.createElement('div');
	element.className = 'mutations-test';
	fixture.appendChild(element);

	var done = assert.async();

	reprocess(function() {

		delete config.skipObserving;
		startObserving();

		assert.equal(getComputedStyle(element, 'display'), 'block', 'Display block');

		var style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = '.mutations-test:container(width > 0) { display: none }';
		fixture.appendChild(style);

		requestAnimationFrame(function() { setTimeout(function() {

			assert.equal(getComputedStyle(element, 'display'), 'none', 'Display none');

			var element2 = document.createElement('div');
			element2.className = 'mutations-test';
			fixture.appendChild(element2);

			var element3 = document.createElement('div');
			element3.className = 'mutations-test';
			fixture.appendChild(element3);
			fixture.removeChild(element3);

			requestAnimationFrame(function() { setTimeout(function() {

				assert.equal(getComputedStyle(element2, 'display'), 'none', 'Display none');

				fixture.appendChild(element3);
				assert.equal(getComputedStyle(element3, 'display'), 'block', 'Display block');

				fixture.removeChild(style);

				requestAnimationFrame(function() { setTimeout(function() {

					assert.equal(getComputedStyle(element, 'display'), 'block', 'Display block');
					assert.equal(getComputedStyle(element2, 'display'), 'block', 'Display block');
					assert.equal(getComputedStyle(element3, 'display'), 'block', 'Display block');

					observer.disconnect();
					observer = undefined;
					config.skipObserving = true;
					done();

				}, 200)});

			}, 200)});

		}, 200)});

	});

});

/*global preprocess, processedSheets, SELECTOR_ESCAPED_REGEXP, SELECTOR_REGEXP*/
QUnit.test('preprocess', function(assert) {

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.first:container( width >= 100.00px ) { display: block }'
		+ '.second:container( height <= 10em ) > child { display: block }'
		+ '.third:container( width <= 100px ), .fourth:container( height >= 100px ) { display: block }';
	fixture.appendChild(style);

	var style2 = document.createElement('style');
	style2.type = 'text/css';
	style2.innerHTML = '.foo { display: block }';
	fixture.appendChild(style2);

	var done = assert.async();

	preprocess(function () {

		var newStyle = style.previousSibling;
		var rules = newStyle.sheet.cssRules;

		assert.equal(style.sheet.disabled, true, 'Old stylesheet disabled');
		assert.equal(newStyle.sheet.disabled, false, 'New stylesheet enabled');
		assert.equal(style2.sheet.disabled, false, 'Normal stylesheet still enabled');
		assert.equal(rules.length, 3, 'Three rules');
		assert.equal(newStyle.innerHTML.match(SELECTOR_ESCAPED_REGEXP).length, 4, 'Four container queries');
		assert.ok(rules[0].selectorText.match(SELECTOR_ESCAPED_REGEXP) || rules[0].selectorText.match(SELECTOR_REGEXP), 'Query matches either the escaped or unescaped RegExp');

		style.parentNode.removeChild(style);
		style2.parentNode.removeChild(style2);

		preprocess(function () {
			assert.notOk(newStyle.parentNode, 'New stylesheet removed from the DOM');
			assert.equal(processedSheets.has(style), false, 'Old stylesheet removed from processedSheets cache map');
			done();
		});

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
				assert.ok(fixture.getElementsByTagName('style').length <= 1, 'Calling multiple times doesn’t duplicate the styles');
				done();
			});
		}

	}

});

/*global escapeSelectors*/
QUnit.test('escapeSelectors', function(assert) {
	assert.equal(escapeSelectors(':container( WIDTH > 100px )'), '.\\:container\\(width\\>100px\\)', 'Simple query');
	assert.equal(escapeSelectors(':container(width > 100px < 200px)'), '.\\:container\\(width\\>100px\\<200px\\)', 'Double comparison');
	assert.equal(escapeSelectors(':container(color-lightness < 10%)'), '.\\:container\\(color-lightness\\<10\\%\\)', 'Filter parameter');
	assert.equal(escapeSelectors(':container( " width <= 100.00px")'), '.\\:container\\(width\\<\\=100\\.00px\\)', 'Query with quotes');
	assert.equal(escapeSelectors(':container(min-width: 100.00px)'), '.\\:container\\(min-width\\:100\\.00px\\)', 'Min prefix');
	assert.equal(escapeSelectors(':container( " MAX-WIDTH : 100.00px")'), '.\\:container\\(max-width\\:100\\.00px\\)', 'Max prefix with quotes');
	assert.equal(escapeSelectors(':container(color: rgba(255, 0, 0, 1))'), '.\\:container\\(color\\:rgba\\(255\\,0\\,0\\,1\\)\\)', 'Color query rgba()');
});

/*global parseRules, queries*/
QUnit.test('parseRules', function(assert) {
	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.foo:active:hover:focus:checked .before:container( WIDTH >= 100.00px ).after>child { display: block }'
		+ ':container(height < 10em) .general-selector { display: block }'
		+ '.combined-selector:container(text-align: right):container(height > 100px) { display: block }'
		+ '.double-comparison:container(200px > width > 100px) { display: block }'
		+ '.filter:container(color-lightness < 10%) { display: block }'
		+ '.max-filter:container(max-background-color-lightness: 10%) { display: block }'
		+ '.color:container(background-color: rgb(255, 0, 0)) { display: block }'
		+ ':nth-of-type(2n+1):container(width > 100px) { display: block }'
		+ '.pseudo-before:container(width > 100px):before { display: block }'
		+ '.pseudo-after:container(width > 100px)::after { display: block }'
		+ '@media screen { .inside-media-query:container(height < 10em) { display: block } }'
		+ '.attribute[data-cq~="max-width:100.0px"] { display: block }'
		+ '.attribute-single[data-cq~=\'color-alpha<=10%\'] { display: block }';
	fixture.appendChild(style);
	var done = assert.async();
	preprocess(function () {

		parseRules();
		assert.equal(Object.keys(queries).length, 14, '14 queries');

		assert.ok(Object.keys(queries)[0].match(/^\.foo (?:\.before|\.after){2}\.\\:container\\\(width\\>\\=100\\\.00px\\\)$/), 'Correct key');
		assert.ok(queries[Object.keys(queries)[0]]._selector.match(/^\.foo (?:\.before|\.after){2}$/), 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[0]]._prop, 'width', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[0]]._types, ['>='], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[0]]._values, ['100.00px'], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[0]]._valueType, 'l', 'Value type');
		assert.equal(queries[Object.keys(queries)[0]]._className, ':container(width>=100.00px)', 'Class name');

		assert.equal(Object.keys(queries)[1], '*.\\:container\\(height\\<10em\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[1]]._selector, '*', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[1]]._prop, 'height', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[1]]._types, ['<'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[1]]._values, ['10em'], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[1]]._valueType, 'l', 'Value type');
		assert.equal(queries[Object.keys(queries)[1]]._className, ':container(height<10em)', 'Class name');

		// Fix CSS class sorting for IE/Edge
		var combinedKeys = [Object.keys(queries)[2], Object.keys(queries)[3]].sort().reverse();

		assert.equal(combinedKeys[0], '.combined-selector.\\:container\\(text-align\\:right\\)', 'Correct key');
		assert.equal(queries[combinedKeys[0]]._selector, '.combined-selector', 'Preceding selector');
		assert.equal(queries[combinedKeys[0]]._prop, 'text-align', 'Property');
		assert.deepEqual(queries[combinedKeys[0]]._types, ['='], 'Mode');
		assert.deepEqual(queries[combinedKeys[0]]._values, ['right'], 'Value');
		assert.deepEqual(queries[combinedKeys[0]]._valueType, 's', 'Value type');
		assert.equal(queries[combinedKeys[0]]._className, ':container(text-align:right)', 'Class name');

		assert.equal(combinedKeys[1], '.combined-selector.\\:container\\(height\\>100px\\)', 'Correct key');
		assert.equal(queries[combinedKeys[1]]._selector, '.combined-selector', 'Preceding selector');
		assert.equal(queries[combinedKeys[1]]._prop, 'height', 'Property');
		assert.deepEqual(queries[combinedKeys[1]]._types, ['>'], 'Mode');
		assert.deepEqual(queries[combinedKeys[1]]._values, ['100px'], 'Value');
		assert.deepEqual(queries[combinedKeys[1]]._valueType, 'l', 'Value type');
		assert.equal(queries[combinedKeys[1]]._className, ':container(height>100px)', 'Class name');

		assert.equal(Object.keys(queries)[4], '.double-comparison.\\:container\\(200px\\>width\\>100px\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[4]]._selector, '.double-comparison', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[4]]._prop, 'width', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[4]]._types, ['>', '<'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[4]]._values, ['100px', '200px'], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[4]]._valueType, 'l', 'Value type');
		assert.equal(queries[Object.keys(queries)[4]]._className, ':container(200px>width>100px)', 'Class name');

		assert.equal(Object.keys(queries)[5], '.filter.\\:container\\(color-lightness\\<10\\%\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[5]]._selector, '.filter', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[5]]._prop, 'color', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[5]]._filter, 'lightness', 'Filter');
		assert.deepEqual(queries[Object.keys(queries)[5]]._types, ['<'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[5]]._values, [10], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[5]]._valueType, 'n', 'Value type');
		assert.equal(queries[Object.keys(queries)[5]]._className, ':container(color-lightness<10%)', 'Class name');

		assert.equal(Object.keys(queries)[6], '.max-filter.\\:container\\(max-background-color-lightness\\:10\\%\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[6]]._selector, '.max-filter', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[6]]._prop, 'background-color', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[6]]._filter, 'lightness', 'Filter');
		assert.deepEqual(queries[Object.keys(queries)[6]]._types, ['<='], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[6]]._values, [10], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[6]]._valueType, 'n', 'Value type');
		assert.equal(queries[Object.keys(queries)[6]]._className, ':container(max-background-color-lightness:10%)', 'Class name');

		//.color:container(background-color: rgb(255, 0, 0))
		assert.equal(Object.keys(queries)[7], '.color.\\:container\\(background-color\\:rgb\\(255\\,0\\,0\\)\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[7]]._selector, '.color', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[7]]._prop, 'background-color', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[7]]._types, ['='], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[7]]._values, ['0,100,50,255'], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[7]]._valueType, 'c', 'Value type');
		assert.equal(queries[Object.keys(queries)[7]]._className, ':container(background-color:rgb(255,0,0))', 'Class name');

		assert.equal(Object.keys(queries)[8], ':nth-of-type(2n+1).\\:container\\(width\\>100px\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[8]]._selector, ':nth-of-type(2n+1)', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[8]]._prop, 'width', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[8]]._types, ['>'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[8]]._values, ['100px'], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[8]]._valueType, 'l', 'Value type');
		assert.equal(queries[Object.keys(queries)[8]]._className, ':container(width>100px)', 'Class name');

		assert.equal(Object.keys(queries)[9], '.pseudo-before.\\:container\\(width\\>100px\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[9]]._selector, '.pseudo-before', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[9]]._prop, 'width', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[9]]._types, ['>'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[9]]._values, ['100px'], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[9]]._valueType, 'l', 'Value type');
		assert.equal(queries[Object.keys(queries)[9]]._className, ':container(width>100px)', 'Class name');

		assert.equal(Object.keys(queries)[10], '.pseudo-after.\\:container\\(width\\>100px\\)', 'Correct key');
		assert.equal(queries[Object.keys(queries)[10]]._selector, '.pseudo-after', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[10]]._prop, 'width', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[10]]._types, ['>'], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[10]]._values, ['100px'], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[10]]._valueType, 'l', 'Value type');
		assert.equal(queries[Object.keys(queries)[10]]._className, ':container(width>100px)', 'Class name');

		assert.equal(Object.keys(queries)[11], '.inside-media-query.\\:container\\(height\\<10em\\)', 'Correct key');

		assert.ok(Object.keys(queries)[12].match(/^\.attribute\[data-cq~=["']max-width:100\.0px["']\]$/), 'Correct key');
		assert.equal(queries[Object.keys(queries)[12]]._selector, '.attribute', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[12]]._prop, 'width', 'Property');
		assert.deepEqual(queries[Object.keys(queries)[12]]._types, ['<='], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[12]]._values, ['100.0px'], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[12]]._valueType, 'l', 'Value type');
		assert.equal(queries[Object.keys(queries)[12]]._attribute, 'max-width:100.0px', 'Attribute name');

		assert.ok(Object.keys(queries)[13].match(/^\.attribute-single\[data-cq~=["']color-alpha<=10%["']\]$/), 'Correct key');
		assert.equal(queries[Object.keys(queries)[13]]._selector, '.attribute-single', 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[13]]._prop, 'color', 'Property');
		assert.equal(queries[Object.keys(queries)[13]]._filter, 'alpha', 'Filter');
		assert.deepEqual(queries[Object.keys(queries)[13]]._types, ['<='], 'Mode');
		assert.deepEqual(queries[Object.keys(queries)[13]]._values, [10], 'Value');
		assert.deepEqual(queries[Object.keys(queries)[13]]._valueType, 'n', 'Value type');
		assert.equal(queries[Object.keys(queries)[13]]._attribute, 'color-alpha<=10%', 'Attribute name');

		done();
	});
});

/*global loadExternal*/
QUnit.test('loadExternal', function(assert) {

	var allDone = assert.async();
	var doneCount = 0;
	var done = function() {
		doneCount++;
		if (doneCount >= 9) {
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

	var firstResponse;
	for (var i = 0; i < 3; i++) {
		loadExternal(TEST_FILES_URL_TIME, function(response1) {
			if (!firstResponse) {
				firstResponse = response1;
			}
			else {
				assert.strictEqual(response1, firstResponse, 'Cached response');
			}
			setTimeout(function() {
				loadExternal(TEST_FILES_URL_TIME, function(response2) {
					assert.strictEqual(response2, firstResponse, 'Cached response');
					done();
				});
			});
		});
	}

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
	assert.deepEqual(splitSelectors('foo:matches(foo, foo), bar'), ['foo:matches(foo, foo)', 'bar'], 'Simple selectors with :matches()');
	assert.deepEqual(splitSelectors('.fo\\,o[attr="val,u\\",e"],bar'), ['.fo\\,o[attr="val,u\\",e"]', 'bar'], 'Escaped commas don’t split a selector');
	assert.deepEqual(splitSelectors('.\\:container\\(font-family\\=f\\,oo\\),bar'), ['.\\:container\\(font-family\\=f\\,oo\\)', 'bar'], 'Container query with comma');
	assert.deepEqual(splitSelectors('.:container(font-family=f,oo),bar'), ['.:container(font-family=f,oo)', 'bar'], 'Unescaped container query with comma');
	assert.deepEqual(splitSelectors(''), [], 'Empty string');
});

/*global buildStyleCacheFromRules, styleCache: true*/
QUnit.test('buildStyleCacheFromRules', function(assert) {

	// Clean cache
	styleCache = {
		width: {},
		height: {},
	};

	var style = document.createElement('style');
	style.textContent = '.width { width: 100% }'
		+ '.height { height: 100% }'
		+ '.no-relevant-prop { color: red }'
		+ '.pseudo-element::foo { width: 100% }'
		+ '.pseudo-element:after { width: 100% }'
		+ '.not-selector:not(foo) { width: 100% }'
		+ 'foo > bar ~ baz element.class#id { width: 100% }'
		+ 'foo > bar ~ baz element.class { width: 100% }'
		+ 'foo > bar ~ baz element { width: 100% }'
		+ '.star-selector * { width: 100% }'
		+ '.implicit-star-selector :hover { width: 100% }'
		+ '@media screen { .inside-media-query { width: 100% } }';

	document.head.appendChild(style);
	var rules = style.sheet.cssRules;

	buildStyleCacheFromRules(rules);

	assert.equal(Object.keys(styleCache.height).length, 1, 'One height rule');
	assert.equal(styleCache.height['.height'].length, 1, 'One rule for `.height`');
	assert.equal(styleCache.height['.height'][0]._rule.style.height, '100%', 'Correct rule value');

	assert.equal(Object.keys(styleCache.width).length, 7, 'Seven width rules');
	assert.equal(styleCache.width['.width'].length, 1, 'One rule for `.width`');
	assert.equal(styleCache.width['.not-selector'].length, 1, 'One rule for `.not-selector`');
	assert.equal(styleCache.width['#id'].length, 1, 'One rule for `#id`');
	assert.equal(styleCache.width['.class'].length, 1, 'One rule for `.class`');
	assert.equal(styleCache.width.element.length, 1, 'One rule for `element`');
	assert.equal(styleCache.width['*'].length, 2, 'Two rules for `*`');
	assert.equal(styleCache.width['.inside-media-query'].length, 1, 'One rule for `.inside-media-query`');

	document.head.removeChild(style);

	// Reset cache
	buildStyleCache();

});

/*global evaluateQuery, containerCache: true, styleCache: true*/
QUnit.test('evaluateQuery', function(assert) {

	// Clean caches
	styleCache = {
		width: {},
		height: {},
	};
	containerCache = createCacheMap();

	var element = document.createElement('div');
	element.style.cssText = 'width: 100px; height: 100px; font-size: 10px; opacity: 0.5; background: red';
	fixture.appendChild(element);

	var data = [
		['>', 99, 100],
		['<', 101, 100],
		['>=', 100, 101],
		['<=', 100, 99],
		['=', 100, 50],
	];
	data.forEach(function(item) {
		assert.strictEqual(evaluateQuery(element, {_prop: 'width', _types: [item[0]], _values: [item[1] + 'px'], _valueType: 'l'}), true, 'Width 100 ' + item[0] + ' ' + item[1]);
		assert.strictEqual(evaluateQuery(element, {_prop: 'width', _types: [item[0]], _values: [item[2] + 'px'], _valueType: 'l'}), false, 'Width 100 not ' + item[0] + ' ' + item[2]);
		assert.strictEqual(evaluateQuery(element, {_prop: 'height', _types: [item[0]], _values: [item[1] + 'px'], _valueType: 'l'}), true, 'Height 100 ' + item[0] + ' ' + item[1]);
		assert.strictEqual(evaluateQuery(element, {_prop: 'height', _types: [item[0]], _values: [item[2] + 'px'], _valueType: 'l'}), false, 'Height 100 not ' + item[0] + ' ' + item[2]);
	});

	data = [
		['width', '=', 'l', '10em', '9.9em'],
		['display', '=', 's', 'block', 'inline'],
		['visibility', '=', 's', 'visible', 'hidden'],
		['opacity', '=', 'n', 0.500, 1],
		['opacity', '>', 'n', 0.49, 0.5],
		['font-size', '=', 'l', '7.50pt', '10em'],
		['background-color', '=', 'c', '0,100,50,255', '0,100,49,255'],
	];
	data.forEach(function(item) {
		assert.strictEqual(evaluateQuery(element, {_prop: item[0], _types: [item[1]], _values: [item[3]], _valueType: item[2]}), true, item[0] + ' ' + item[1] + ' ' + item[3]);
		assert.strictEqual(evaluateQuery(element, {_prop: item[0], _types: [item[1]], _values: [item[4]], _valueType: item[2]}), false, item[0] + ' not ' + item[1] + ' ' + item[4]);
	});

	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'hue', _types: ['='], _values: [parseFloat('0deg')], _valueType: 'n'}), true, 'Red Hue = 0deg');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'hue', _types: ['>'], _values: [parseFloat('10deg')], _valueType: 'n'}), false, 'Red Hue not > 10deg');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'saturation', _types: ['='], _values: [parseFloat('100%')], _valueType: 'n'}), true, 'Red Saturation = 100%');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'saturation', _types: ['<'], _values: [parseFloat('90%')], _valueType: 'n'}), false, 'Red Saturation not < 90%');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'lightness', _types: ['>'], _values: [parseFloat('10%')], _valueType: 'n'}), true, 'Red Lightness > 10%');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'lightness', _types: ['<'], _values: [parseFloat('10%')], _valueType: 'n'}), false, 'Red Lightness not < 10%');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'alpha', _types: ['='], _values: [parseFloat('255')], _valueType: 'n'}), true, 'Red Alpha = 255');
	assert.strictEqual(evaluateQuery(element, {_prop: 'background-color', _filter: 'alpha', _types: ['<'], _values: [parseFloat('254')], _valueType: 'n'}), false, 'Red Alpha not < 254');

	assert.strictEqual(evaluateQuery(element, {_prop: 'display', _types: ['<'], _values: ['10px'], _valueType: 'l'}), false, 'Invalid block < 10px');
	assert.strictEqual(evaluateQuery(element, {_prop: 'display', _types: ['>'], _values: ['10px'], _valueType: 'l'}), false, 'Invalid block > 10px');
	assert.strictEqual(evaluateQuery(element, {_prop: 'invalid', _types: ['<'], _values: ['10px'], _valueType: 'l'}), false, 'Invalid undefined < 10px');
	assert.strictEqual(evaluateQuery(element, {_prop: 'invalid', _types: ['>'], _values: ['10px'], _valueType: 'l'}), false, 'Invalid undefined > 10px');
	assert.strictEqual(evaluateQuery(element, {_prop: 'font-size', _types: ['<'], _values: ['foo'], _valueType: 's'}), false, 'Invalid 10px < foo');
	assert.strictEqual(evaluateQuery(element, {_prop: 'font-size', _types: ['>'], _values: ['foo'], _valueType: 's'}), false, 'Invalid 10px > foo');
	assert.strictEqual(evaluateQuery(element, {_prop: 'font-size', _types: ['<'], _values: [''], _valueType: 's'}), false, 'Invalid 10px < ""');
	assert.strictEqual(evaluateQuery(element, {_prop: 'font-size', _types: ['>'], _values: [''], _valueType: 's'}), false, 'Invalid 10px > ""');
	assert.strictEqual(evaluateQuery(element, {_prop: 'width', _filter: 'invalid', _types: ['>'], _values: ['0px'], _valueType: 'l'}), false, 'Invalid filter');
	assert.strictEqual(evaluateQuery(element, {_prop: 'width', _types: ['='], _values: ['auto'], _valueType: 's'}), false, 'Invalid width = auto');

});

/*global getContainer, styleCache: true, containerCache: true, createCacheMap*/
QUnit.test('getContainer', function(assert) {

	styleCache = {
		width: {},
		height: {},
	};
	containerCache = createCacheMap();

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

	element.style.position = 'relative';
	link.style.position = 'absolute';
	containerCache = createCacheMap(); // Clear cache
	assert.strictEqual(getContainer(link, 'width'), element, '<div> positioned ancestor');

	span.style.position = 'absolute';
	containerCache = createCacheMap(); // Clear cache
	assert.strictEqual(getContainer(link, 'width'), element, '<div> positioned ancestor with non-intrinsic size');

	span.style.width = '100px';
	containerCache = createCacheMap(); // Clear cache
	assert.strictEqual(getContainer(link, 'width'), span, '<span> positioned ancestor with fixed size');

	link.style.position = 'fixed';
	containerCache = createCacheMap(); // Clear cache
	assert.strictEqual(getContainer(link, 'width'), document.documentElement, '<html> fixed ancestor');

	element.style.cssText = '-webkit-transform: translateX(0); -ms-transform: translateX(0); transform: translateX(0);';
	containerCache = createCacheMap(); // Clear cache
	assert.strictEqual(getContainer(link, 'width'), element, '<div> ancestor with transform applied');

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

	element.style.cssText = 'width: 50%; width: calc(100% / 2 + 100px); height: 50%; height: calc(100% / 2 + 100px)';
	assert.equal(isFixedSize(element, 'width'), false, 'Percentage calc expression width');
	assert.equal(isFixedSize(element, 'height'), false, 'Percentage calc expression height');

	element.style.cssText = 'width: 50px; width: calc(100px + 10em / 2); height: 50px; height: calc(100px + 10em / 2)';
	assert.equal(isFixedSize(element, 'width'), true, 'Fixed calc expression width');
	assert.equal(isFixedSize(element, 'height'), true, 'Fixed calc expression height');

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

	element.style.cssText = 'display: inline; float: left; width: 50px; width: calc(100px / 2); height: 50px; height: calc(100px / 2)';
	assert.equal(isIntrinsicSize(element, 'width'), false, 'Calc pixel width');
	assert.equal(isIntrinsicSize(element, 'height'), false, 'Calc pixel height');

	element.style.cssText = 'display: inline; float: left; width: 50%; width: calc(100% / 2); height: 50%; height: calc(100% / 2)';
	assert.equal(isIntrinsicSize(element, 'width'), false, 'Calc percentage width');
	assert.equal(isIntrinsicSize(element, 'height'), false, 'Calc percentage height');

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
	assert.equal(getComputedStyle(element, 'width'), '100px', 'Normal style');
	assert.equal(getComputedStyle(element, 'height'), '96px', 'Converted to pixel');
	assert.equal(getComputedStyle(element, 'float'), 'left', 'Float left');
	assert.equal(getComputedStyle(element, 'cssFloat'), 'left', 'Float left cssFloat');
	assert.equal(getComputedStyle(element, 'display'), 'block', 'Default style');
	element.style.cssText = 'display: inline; float: left; font-size: 10px';
	assert.equal(getComputedStyle(element, 'display'), 'block', 'Correct display value');
	assert.equal(getComputedStyle(element, 'fontSize'), '10px', 'Correct font-size value');
	assert.equal(getComputedStyle(element, 'font-size'), '10px', 'Correct font-size value via getPropertyValue');
});

/*global getOriginalStyle, buildStyleCache*/
QUnit.test('getOriginalStyle', function(assert) {

	var element = document.createElement('div');
	element.className = 'myel';

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.myel { width: 100%; height: auto !important }';

	fixture.appendChild(style);
	fixture.appendChild(element);

	buildStyleCache();

	assert.equal(getOriginalStyle(element, 'width'), '100%', 'Get width from <style>');
	assert.equal(getOriginalStyle(element, 'height'), 'auto', 'Get height from <style>');
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

	assert.deepEqual(parseColor('rgb(255, 0, 0)'), [0, 100, 50, 255], 'Rgb');
	assert.deepEqual(parseColor('rgba(255, 0, 0, 0.6)'), [0, 100, 50, 153], 'Rgba');
	assert.deepEqual(parseColor('transparent'), [0, 0, 0, 0], 'Transparent');
	assert.deepEqual(parseColor('rgba(0, 0, 0, 0)'), [0, 0, 0, 0], 'Transparent rgba');
	assert.deepEqual(parseColor('rgba(255, 0, 0, 0)'), [0, 0, 0, 0], 'Transparent rgba red');
	assert.deepEqual(parseColor(undefined), [0, 0, 0, 0], 'Undefined');

	// Test if parseColor() rounds the same way as the browser does.
	// For comparisons to work, the values need to be exactly the same.
	for (var alpha = 0; alpha <= 1000; alpha++) {
		var color = 'rgba(0, 0, 0, ' + (alpha / 1000) + ')';
		fixture.style.cssText = 'color:' + color;
		if (parseColor(color)[3] !== parseColor(fixture.style.color)[3] || alpha % 250 === 0) {
			assert.deepEqual(parseColor(color), parseColor(fixture.style.color), color + '/' + fixture.style.color);
		}
	}

	fixture.style.cssText = '';

});

/*global rgbaToHsla*/
QUnit.test('rgbaToHsla', function(assert) {
	assert.deepEqual(rgbaToHsla([0, 0, 0, 1]), [0, 0, 0, 1], 'Black');
	assert.deepEqual(rgbaToHsla([255, 0, 0, 1]), [0, 100, 50, 1], 'Red');
	assert.deepEqual(rgbaToHsla([0, 255, 0, 1]), [120, 100, 50, 1], 'Green');
	assert.deepEqual(rgbaToHsla([0, 0, 255, 1]), [240, 100, 50, 1], 'Blue');
	assert.deepEqual(rgbaToHsla([204, 255, 204, 128]), [120, 100, 90, 128], 'Light semitransparent green');
});

/*global filterRulesByElementAndProp, buildStyleCache, styleCache: true*/
QUnit.test('filterRulesByElementAndProp', function(assert) {

	var element = document.createElement('div');
	element.className = 'myel';

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.myel, .notmyel { width: 1px }'
		+ '.notmyel { width: 2px }'
		+ '.myel { height: 3px }'
		+ '@media screen { div.myel { width: 4px } }'
		+ '@media (min-width: 0) { g.myel { width: 5px } }';

	fixture.appendChild(style);
	fixture.appendChild(element);

	buildStyleCache();

	var rules = filterRulesByElementAndProp(styleCache.width, element, 'width');
	assert.equal(rules.length, 2, 'Two rules');
	assert.equal(rules[0]._selector, '.myel', 'First selector');
	assert.equal(rules[0]._rule.style.width, '1px', 'Property');
	assert.equal(rules[1]._selector, 'div.myel', 'Second selector');
	assert.equal(rules[1]._rule.style.width, '4px', 'Property');

	element.className = '';
	element.innerHTML = '<svg><g class="myel"></g></svg>';

	var rules = filterRulesByElementAndProp(styleCache.width, element.querySelector('.myel'), 'width');
	assert.equal(rules.length, 2, 'Two rules');
	assert.equal(rules[0]._selector, '.myel', 'First selector');
	assert.equal(rules[0]._rule.style.width, '1px', 'Property');
	assert.equal(rules[1]._selector, 'g.myel', 'Second selector');
	assert.equal(rules[1]._rule.style.width, '5px', 'Property');

});

/*global elementMatchesSelector*/
QUnit.test('elementMatchesSelector', function(assert) {

	var element = document.createElement('div');
	element.className = ':container(width>=100px)';
	fixture.appendChild(element);

	assert.ok(elementMatchesSelector(element, 'div'), 'Simple selector');
	assert.ok(elementMatchesSelector(element, '.\\:container\\(width\\>\\=100px\\)'), 'Escaped query');
	assert.notOk(elementMatchesSelector(element, ''), 'Empty selector');
	assert.notOk(elementMatchesSelector(element, '#1'), 'Invalid selector');
	assert.notOk(elementMatchesSelector(element, '::-webkit- *'), 'Safari bug with special semivalid selector'); // Issue #26

	element.innerHTML = '<svg><g class=":container(width>=100px)"></g></svg>';
	var svgElement = element.querySelector('g');

	assert.ok(elementMatchesSelector(svgElement, 'g'), 'Simple selector');
	assert.ok(elementMatchesSelector(svgElement, '.\\:container\\(width\\>\\=100px\\)'), 'Escaped query');

});

/*global sortRulesBySpecificity, getSpecificity*/
QUnit.test('sortRulesBySpecificity', function(assert) {
	var unsorted = [
		'tag1',
		'tag2',
		'.class',
		'#id',
		'tag tag',
		'.class.class',
		'#id#id',
	].map(function(selector) {
		return {
			_selector: selector,
			_specificity: getSpecificity(selector),
		};
	});
	var sorted = [
		'#id#id',
		'#id',
		'.class.class',
		'.class',
		'tag tag',
		'tag2',
		'tag1',
	].map(function(selector) {
		return {
			_selector: selector,
			_specificity: getSpecificity(selector),
		};
	});
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
		['foo:not(bar)', 2, 'negation pseudo-class'],
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

	var forEached = [];
	map.forEach(function(value, key) {
		forEached.push([value, key]);
	});
	assert.deepEqual(forEached, [['el1-new', el1], ['el2', el2]]);

	assert.strictEqual(map.delete(el1), true, 'Deleted element1');
	assert.strictEqual(map.has(el1), false, 'Hasn’t element1');
	assert.strictEqual(map.get(el1), undefined, 'Value undefined');
	assert.strictEqual(map.delete(el1), false, 'Didn’t delete element1');

	forEached = [];
	map.forEach(function(value, key) {
		forEached.push([value, key]);
	});
	assert.deepEqual(forEached, [['el2', el2]]);

	assert.strictEqual(map.delete(el2), true, 'Deleted element2');
	assert.strictEqual(map.has(el2), false, 'Hasn’t element2');
	assert.strictEqual(map.get(el2), undefined, 'Value undefined');
	assert.strictEqual(map.delete(el2), false, 'Didn’t delete element2');

	forEached = [];
	map.forEach(function(value, key) {
		forEached.push([value, key]);
	});
	assert.deepEqual(forEached, []);

});

/*global addClass, removeClass, hasClass*/
QUnit.test('addClass, removeClass, hasClass', function(assert) {

	var element = document.createElement('div');
	element.innerHTML = '<svg><g>';
	var svgElement = element.querySelector('g');

	[element, svgElement].forEach(function(element) {

		addClass(element, 'foo');
		assert.equal((element.getAttribute('class') || '').trim(), 'foo', 'Add class foo');
		assert.ok(hasClass(element, 'foo'), 'Has class foo');
		addClass(element, 'bar');
		assert.equal((element.getAttribute('class') || '').trim(), 'foo bar', 'Add class bar');
		assert.ok(hasClass(element, 'foo') && hasClass(element, 'bar'), 'Has class foo and bar');
		addClass(element, 'bar');
		assert.equal((element.getAttribute('class') || '').trim(), 'foo bar', 'Add class bar again');
		addClass(element, ':container(width>=100px)');
		assert.equal((element.getAttribute('class') || '').trim(), 'foo bar :container(width>=100px)', 'Add container query class');
		assert.ok(hasClass(element, ':container(width>=100px)'), 'Has container query class');
		addClass(element, ':container(width>=100px)');
		assert.equal((element.getAttribute('class') || '').trim(), 'foo bar :container(width>=100px)', 'Add container query class again');

		removeClass(element, 'foo');
		assert.equal((element.getAttribute('class') || '').trim(), 'bar :container(width>=100px)', 'Remove class foo');
		assert.notOk(hasClass(element, 'foo'), 'Has not class foo');
		removeClass(element, 'bar');
		assert.equal((element.getAttribute('class') || '').trim(), ':container(width>=100px)', 'Remove class bar');
		assert.notOk(hasClass(element, 'bar'), 'Has not class bar');
		removeClass(element, ':container(width>=100px)');
		assert.equal((element.getAttribute('class') || '').trim(), '', 'Remove container query class');
		assert.notOk(hasClass(element, ':container(width>=100px)'), 'Has not container query class');

	});

});

/*global matchesMedia*/
QUnit.test('matchesMedia', function(assert) {

	assert.strictEqual(matchMedia('screen').matches, true, 'Matches screen');
	assert.strictEqual(matchMedia('not screen').matches, false, 'Doesn’t match not screen');
	assert.strictEqual(matchMedia('print').matches, false, 'Doesn’t match print');
	assert.strictEqual(matchMedia('not print').matches, true, 'Matches not print');

	var windowWidth = window.innerWidth || document.documentElement.clientWidth;

	assert.strictEqual(matchMedia('(min-width: ' + (windowWidth - 50) + 'px)').matches, true, 'Matches smaller min-width');
	assert.strictEqual(matchMedia('(min-width: ' + (windowWidth + 50) + 'px)').matches, false, 'Doesn’t match larger min-width');
	assert.strictEqual(matchMedia('(max-width: ' + (windowWidth + 50) + 'px)').matches, true, 'Matches larger max-width');
	assert.strictEqual(matchMedia('(max-width: ' + (windowWidth - 50) + 'px)').matches, false, 'Doesn’t match smaller max-width');

});

/*global arrayFrom*/
QUnit.test('arrayFrom', function(assert) {

	assert.deepEqual(arrayFrom({0: 'foo', 1: 'bar', length: 2}), ['foo', 'bar'], 'Simple array like');
	assert.deepEqual(arrayFrom({0: 'foo', 2: 'bar', length: 3}), ['foo', undefined, 'bar'], 'Array like with gap');

});

})();
