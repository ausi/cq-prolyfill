/*global QUnit*/
(function() {
'use strict';

/*global splitSelectors*/
QUnit.test('splitSelectors', function(assert) {
	assert.deepEqual(splitSelectors('foo'), ['foo'], 'Simple selector doesn’t get split');
	assert.deepEqual(splitSelectors('foo,foo\t\n ,\t\n foo'), ['foo', 'foo', 'foo'], 'Simple selectors do get split');
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
		assert.equal(
			getSpecificity(item[0]), item[1], item[2][0].toUpperCase() + item[2].substr(1) + ' ("' + item[0] + '")' + ': ' + item[1]);
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
