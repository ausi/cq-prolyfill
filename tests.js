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
var TEST_FILES_URL = 'http://cdn.rawgit.com/ausi/cq-prolyfill/78569ef/test-files/';
var TEST_FILES_PATH = 'test-files/';

/*global reprocess, getOriginalStyle*/
QUnit.test('CORS', function(assert) {

	var done = assert.async();

	var element;

	load('cors.css', false, function() {
		assert.equal(getOriginalStyle(element, ['color']).color, 'red', 'Style Stylesheet');
	load('cors.css', true, function() {
		assert.equal(getOriginalStyle(element, ['color']).color, 'red', 'Style Stylesheet with crossOrigin');
	load('cors-with-cq.css', false, function() {
		assert.equal(getOriginalStyle(element, ['color']).color, 'blue', 'Container Query');
	load('cors-with-cq.css', true, function() {
		assert.equal(getOriginalStyle(element, ['color']).color, 'blue', 'Container Query with crossOrigin');
	done(); }); }); }); });

	function load(file, crossOrigin, callback) {

		fixture.innerHTML = '';

		var link = document.createElement('link');
		link.rel = 'stylesheet';
		if (crossOrigin) {
			link.crossOrigin = 'anonymous';
		}
		link.onload = link.onerror = onLoad;
		link.href = TEST_FILES_URL + file;
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

/*global parseRules, queries*/
QUnit.test('parseRules', function(assert) {
	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.foo:active:hover:focus:checked .before:container( WIDTH >= 100.00px ).after>child { display: block }';
	fixture.appendChild(style);
	var done = assert.async();
	preprocess(function () {
		parseRules();
		assert.equal(Object.keys(queries).length, 1, 'One query');
		assert.ok(Object.keys(queries)[0].match(/^\.foo (?:\.before|\.after){2}\.\\:container\\\(width\\>\\=100\\\.00px\\\)$/), 'Correct key');
		assert.ok(queries[Object.keys(queries)[0]]._selector.match(/^\.foo (?:\.before|\.after){2}$/), 'Preceding selector');
		assert.equal(queries[Object.keys(queries)[0]]._prop, 'width', 'Property');
		assert.equal(queries[Object.keys(queries)[0]]._type, '>=', 'Mode');
		assert.equal(queries[Object.keys(queries)[0]]._value, '100.00px', 'Value');
		assert.equal(queries[Object.keys(queries)[0]]._className, ':container(width>=100.00px)', 'Class name');
		done();
	});
});

/*global loadExternal*/
QUnit.test('loadExternal', function(assert) {

	var allDone = assert.async();
	var doneCount = 0;
	var done = function() {
		doneCount++;
		if (doneCount >= 4) {
			allDone();
		}
	};

	loadExternal(TEST_FILES_PATH + 'test.txt', function(response) {
		assert.strictEqual(response, 'test\n', 'Regular request');
		done();
	});

	loadExternal(TEST_FILES_URL + 'test.txt', function(response) {
		assert.strictEqual(response, 'test\n', 'CORS request');
		done();
	});

	loadExternal(TEST_FILES_PATH + '404', function(response) {
		assert.strictEqual(response, '', 'Regular 404 request');
		done();
	});

	loadExternal(TEST_FILES_URL + '404', function(response) {
		assert.strictEqual(response, '', 'CORS 404 request');
		done();
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
});

/*global splitSelectors*/
QUnit.test('splitSelectors', function(assert) {
	assert.deepEqual(splitSelectors('foo'), ['foo'], 'Simple selector doesn’t get split');
	assert.deepEqual(splitSelectors('foo,foo\t\n ,\t\n foo'), ['foo', 'foo', 'foo'], 'Simple selectors do get split');
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
	element.style.cssText = 'display: inline; float: left';
	assert.equal(getComputedStyle(element).display, 'block', 'Correct display value');
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

	assert.equal(getOriginalStyle(element, ['width']).width, '100%', 'Get width from <style>');
	assert.equal(getOriginalStyle(element, ['height']).height, 'auto', 'Get height from <style>');
	assert.equal(getOriginalStyle(element, ['color']).color, undefined, 'Get undefined property');
	element.style.width = '100px';
	assert.equal(getOriginalStyle(element, ['width']).width, '100px', 'Get width from style attribute');
	element.style.width = '';
	assert.equal(getOriginalStyle(element, ['width']).width, '100%', 'Get width from <style>');
	element.style.height = '100px';
	assert.equal(getOriginalStyle(element, ['height']).height, 'auto', 'Get height from <style> !important');
	element.style.setProperty('height', '100px', 'important');
	assert.equal(getOriginalStyle(element, ['height']).height, '100px', 'Get height from style attribute !important');

});

/*global filterRulesByElementAndProps*/
QUnit.test('filterRulesByElementAndProps', function(assert) {

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

	var rules = filterRulesByElementAndProps(style.sheet.cssRules, element, ['width']);
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

/*global styleHasProperty*/
QUnit.test('styleHasProperty', function(assert) {
	var style = document.createElement('div').style;
	style.width = '10px';
	assert.ok(styleHasProperty(style, ['width']), 'Single property');
	assert.ok(styleHasProperty(style, ['height', 'width']), 'One of two');
	assert.ok(!styleHasProperty(style, ['height']), 'None');
});

/*global sortRulesBySpecificity*/
QUnit.test('sortRulesBySpecificity', function(assert) {
	var unsorted = [
		{_selector: 'tag'},
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
		{_selector: 'tag'},
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
