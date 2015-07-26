/*global QUnit*/
(function() {
'use strict';

/*global splitSelectors*/
QUnit.test('splitSelectors', function(assert) {
	assert.deepEqual(splitSelectors('foo'), ['foo'], 'Simple selector doesn’t get split');
	assert.deepEqual(splitSelectors('foo,foo\t\n ,\t\n foo'), ['foo', 'foo', 'foo'], 'Simple selectors do get split');
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

	data.forEach(function(item) {
		assert.equal(getComputedLength(item[0], dummy), item[1], item[0] + ' == ' + item[1] + 'px');
	});

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
	allSpecifity = data.reduce(function(all, item) { return all + item[1]; }, 0);
	assert.equal(getSpecificity(allSelectors), allSpecifity, 'All combined reverse ("' + allSelectors.trim() + '")' + ': ' + allSpecifity);

});

})();
