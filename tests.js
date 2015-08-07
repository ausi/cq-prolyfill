/*global QUnit*/
(function() {
'use strict';

/*global reprocess, reevaluate*/
QUnit.test('Simple width and height Query', function(assert) {

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.minW, .maxW, .minH, .maxH { font-family: no-query }'
		+ '.minW:container( min-width: 100px ) { font-family: min-width-100 }'
		+ '.minW:container( min-width: 200px ) { font-family: min-width-200 }'
		+ '.minH:container( min-height: 100px ) { font-family: min-height-100 }'
		+ '.minH:container( min-height: 200px ) { font-family: min-height-200 }'
		+ '.maxW:container( max-width: 200px ) { font-family: max-width-200 }'
		+ '.maxW:container( max-width: 100px ) { font-family: max-width-100 }'
		+ '.maxH:container( max-height: 200px ) { font-family: max-height-200 }'
		+ '.maxH:container( max-height: 100px ) { font-family: max-height-100 }';
	document.head.appendChild(style);

	var element = document.createElement('div');
	element.innerHTML = '<div style="padding: 5px; height: 100%; box-sizing: border-box"><span><div style="float: left"><span>'
		+ '<div class="maxW"></div>'
		+ '<div class="minW"></div>'
		+ '<div class="maxH"></div>'
		+ '<div class="minH"></div>';
	document.body.appendChild(element);
	var minW = element.querySelector('.minW');
	var maxW = element.querySelector('.maxW');
	var minH = element.querySelector('.minH');
	var maxH = element.querySelector('.maxH');

	var done = assert.async();
	reprocess(function () {

		var font = function(node) {
			return window.getComputedStyle(node).fontFamily;
		};

		element.style.cssText = 'width: 109px; height: 109px';
		reevaluate();
		assert.equal(font(minW), 'no-query', 'min-width at 109px');
		assert.equal(font(minH), 'no-query', 'min-height at 109px');

		element.style.cssText = 'width: 110px; height: 110px';
		reevaluate();
		assert.equal(font(minW), 'min-width-100', 'min-width at 110px');
		assert.equal(font(minH), 'min-height-100', 'min-height at 110px');
		assert.equal(font(maxW), 'max-width-100', 'max-width at 110px');
		assert.equal(font(maxH), 'max-height-100', 'max-height at 110px');

		element.style.cssText = 'width: 111px; height: 111px';
		reevaluate();
		assert.equal(font(maxW), 'max-width-200', 'max-width at 111px');
		assert.equal(font(maxH), 'max-height-200', 'max-height at 111px');

		element.style.cssText = 'width: 209px; height: 209px';
		reevaluate();
		assert.equal(font(minW), 'min-width-100', 'min-width at 209px');
		assert.equal(font(minH), 'min-height-100', 'min-height at 209px');

		element.style.cssText = 'width: 210px; height: 210px';
		reevaluate();
		assert.equal(font(maxW), 'max-width-200', 'max-width at 210px');
		assert.equal(font(maxH), 'max-height-200', 'max-height at 210px');
		assert.equal(font(minW), 'min-width-200', 'min-width at 210px');
		assert.equal(font(minH), 'min-height-200', 'min-height at 210px');

		element.style.cssText = 'width: 211px; height: 211px';
		reevaluate();
		assert.equal(font(maxW), 'no-query', 'max-width at 211px');
		assert.equal(font(maxH), 'no-query', 'max-height at 211px');


		document.head.removeChild(style.previousSibling);
		document.head.removeChild(style);
		document.body.removeChild(element);
		done();

	});
});

/*global preprocess, SELECTOR_ESCAPED_REGEXP*/
QUnit.test('preprocess', function(assert) {
	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.first:container( min-width: 100px ) { display: block }'
		+ '.second:container( max-height: 10em ) > child { display: block }'
		+ '.third:container( max-width: 100px ), .fourth:container( min-height: 100px ) { display: block }';
	document.head.appendChild(style);
	var done = assert.async();
	preprocess(function () {
		var newStyle = style.previousSibling;
		var rules = newStyle.sheet.cssRules;
		assert.equal(style.sheet.disabled, true, 'Old stylesheet disabled');
		assert.equal(newStyle.sheet.disabled, false, 'New stylesheet enabled');
		assert.equal(rules.length, 3, 'Three rules');
		assert.equal(newStyle.innerHTML.match(SELECTOR_ESCAPED_REGEXP).length, 4, 'Four container queries');
		assert.equal(rules[0].selectorText, '.first.\\:container\\(min-width\\:100px\\)', 'Escaped container query');
		document.head.removeChild(style);
		document.head.removeChild(newStyle);
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

/*global getContainer, containerCache: true*/
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
	containerCache = new Map(); // Clear cache
	assert.strictEqual(getContainer(link, 'width'), span, '<span> display block for width');

	element.style.height = '100px';
	containerCache = new Map(); // Clear cache
	assert.strictEqual(getContainer(link, 'height'), element, '<div> fixed height');

	span.style.cssText = 'display: block; height: 50%';
	containerCache = new Map(); // Clear cache
	assert.strictEqual(getContainer(link, 'height'), span, '<span> display block percentage height');
	assert.ok(containerCache.has(link));

	document.body.removeChild(element);

});

/*global isFixedSize*/
QUnit.test('isFixedSize', function(assert) {

	var element = document.createElement('div');
	document.body.appendChild(element);

	assert.equal(isFixedSize(element, 'width'), false, 'Standard <div> width');
	assert.equal(isFixedSize(element, 'height'), false, 'Standard <div> height');

	element.style.cssText = 'width: 100%; height: 100%';
	assert.equal(isFixedSize(element, 'width'), false, 'Percentage width');
	assert.equal(isFixedSize(element, 'height'), false, 'Percentage height');

	element.style.cssText = 'width: 100px; height: 100px';
	assert.equal(isFixedSize(element, 'width'), true, 'Fixed width');
	assert.equal(isFixedSize(element, 'height'), true, 'Fixed height');

	document.body.removeChild(element);

});

/*global isIntrinsicSize*/
QUnit.test('isIntrinsicSize', function(assert) {

	var element = document.createElement('div');
	document.body.appendChild(element);

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

	document.body.removeChild(element);

});

/*global getSize*/
QUnit.test('getSize', function(assert) {
	var element = document.createElement('div');
	element.style.width = '100px';
	element.style.height = '100px';
	element.style.boxSizing = 'border-box';
	element.style.padding = '1pc';
	element.style.border = '10px solid black';
	document.body.appendChild(element);
	assert.equal(getSize(element, 'width'), 48, 'Width');
	assert.equal(getSize(element, 'height'), 48, 'Height');
	document.body.removeChild(element);
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
	document.body.appendChild(dummy);

	data.forEach(function(item) {
		assert.equal(getComputedLength(item[0], dummy), item[1], item[0] + ' == ' + item[1] + 'px');
	});

	document.body.removeChild(dummy);

});

/*global getComputedStyle*/
QUnit.test('getComputedStyle', function(assert) {
	var element = document.createElement('div');
	element.style.width = '100px';
	element.style.height = '1in';
	element.style.cssFloat = 'left';
	document.body.appendChild(element);
	assert.equal(getComputedStyle(element).width, '100px', 'Normal style');
	assert.equal(getComputedStyle(element).height, '96px', 'Converted to pixel');
	assert.equal(getComputedStyle(element).cssFloat, 'left', 'Float left');
	assert.equal(getComputedStyle(element).display, 'block', 'Default style');
	element.style.cssText = 'display: inline; float: left';
	assert.equal(getComputedStyle(element).display, 'block', 'Correct display value');
	document.body.removeChild(element);
});

/*global getOriginalStyle*/
QUnit.test('getOriginalStyle', function(assert) {

	var element = document.createElement('div');
	element.className = 'myel';

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '.myel { width: 100%; height: auto !important }';

	document.head.appendChild(style);
	document.body.appendChild(element);

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

	document.head.removeChild(style);
	document.body.removeChild(element);

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

	document.head.appendChild(style);
	document.body.appendChild(element);

	var rules = filterRulesByElementAndProps(style.sheet.cssRules, element, ['width']);
	assert.equal(rules.length, 2, 'Two rules');
	assert.equal(rules[0].selector, '.myel', 'First selector');
	assert.equal(rules[0].rule.style.width, '1px', 'Property');
	assert.equal(rules[1].selector, 'div.myel', 'Second selector');
	assert.equal(rules[1].rule.style.width, '4px', 'Property');

	document.head.removeChild(style);
	document.body.removeChild(element);

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
		{selector: 'tag'},
		{selector: '.class'},
		{selector: '#id'},
		{selector: 'tag tag'},
		{selector: '.class.class'},
		{selector: '#id#id'},
	];
	var sorted = [
		{selector: '#id#id'},
		{selector: '#id'},
		{selector: '.class.class'},
		{selector: '.class'},
		{selector: 'tag tag'},
		{selector: 'tag'},
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
		['.\\:container\\(max-width\\:1px\\)', 256, 'escaped container query'],
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

})();
