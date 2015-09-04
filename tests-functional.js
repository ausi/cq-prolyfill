/*global QUnit*/
(function() {
'use strict';

var fixture = document.getElementById('qunit-fixture');

QUnit.test('Simple width and height Query', function(assert) {

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '@font-face { font-family: invalid-query; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: no-query; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: min-width-100; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: min-width-200; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: min-height-100; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: min-height-200; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: max-width-200; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: max-width-100; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: max-height-200; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: max-height-100; src: local("Times New Roman"), local("Droid Serif") }'
		+ 'html:container( width >= 1px ) { font-family: invalid-query }'
		+ '.minW, .maxW, .minH, .maxH { font-family: no-query }'
		+ '.minW:container( width >= 100px ) { font-family: min-width-100 }'
		+ '.minW:container( width >= 200px ) { font-family: min-width-200 }'
		+ '.minH:container( height >= 100px ) { font-family: min-height-100 }'
		+ '.minH:container( height >= 200px ) { font-family: min-height-200 }'
		+ '.maxW:container( width <= 200px ) { font-family: max-width-200 }'
		+ '.maxW:container( width <= 100px ) { font-family: max-width-100 }'
		+ '.maxH:container( height <= 200px ) { font-family: max-height-200 }'
		+ '.maxH:container( height <= 100px ) { font-family: max-height-100 }';
	fixture.appendChild(style);

	var element = document.createElement('div');
	element.innerHTML = '<div style="padding: 5px; height: 100%; box-sizing: border-box"><span><div style="float: left"><span>'
		+ '<div class="maxW"></div>'
		+ '<div class="minW"></div>'
		+ '<div class="maxH"></div>'
		+ '<div class="minH"></div>';
	fixture.appendChild(element);
	var minW = element.querySelector('.minW');
	var maxW = element.querySelector('.maxW');
	var minH = element.querySelector('.minH');
	var maxH = element.querySelector('.maxH');

	var reevaluate = window.containerQueries.reevaluate;

	var done = assert.async();
	window.containerQueries.reprocess(function () {

		var font = function(node) {
			return window.getComputedStyle(node).fontFamily;
		};

		reevaluate();
		assert.notEqual(font(document.documentElement), 'invalid-query', 'Invalid HTML container query');

		element.style.cssText = 'width: 109px; height: 109px';
		reevaluate();
		assert.equal(font(minW), 'no-query', 'min-width at 99px');
		assert.equal(font(minH), 'no-query', 'min-height at 99px');

		element.style.cssText = 'width: 110px; height: 110px';
		reevaluate();
		assert.equal(font(minW), 'min-width-100', 'min-width at 100px');
		assert.equal(font(minH), 'min-height-100', 'min-height at 100px');
		assert.equal(font(maxW), 'max-width-100', 'max-width at 100px');
		assert.equal(font(maxH), 'max-height-100', 'max-height at 100px');

		element.style.cssText = 'width: 111px; height: 111px';
		reevaluate();
		assert.equal(font(maxW), 'max-width-200', 'max-width at 101px');
		assert.equal(font(maxH), 'max-height-200', 'max-height at 101px');

		element.style.cssText = 'width: 209px; height: 209px';
		reevaluate();
		assert.equal(font(minW), 'min-width-100', 'min-width at 199px');
		assert.equal(font(minH), 'min-height-100', 'min-height at 199px');

		element.style.cssText = 'width: 210px; height: 210px';
		reevaluate();
		assert.equal(font(maxW), 'max-width-200', 'max-width at 200px');
		assert.equal(font(maxH), 'max-height-200', 'max-height at 200px');
		assert.equal(font(minW), 'min-width-200', 'min-width at 200px');
		assert.equal(font(minH), 'min-height-200', 'min-height at 200px');

		element.style.cssText = 'width: 211px; height: 211px';
		reevaluate();
		assert.equal(font(maxW), 'no-query', 'max-width at 201px');
		assert.equal(font(maxH), 'no-query', 'max-height at 201px');

		done();

	});
});

QUnit.test('Combined Queries', function(assert) {

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '@font-face { font-family: query; src: local("Times New Roman"), local("Droid Serif") }'
		+ '.test:container(width > 100px):container(width < 200px):container(height > 100px):container(height < 200px) { font-family: query }';
	fixture.appendChild(style);

	var element = document.createElement('div');
	element.innerHTML = '<div class="test">';
	fixture.appendChild(element);
	var test = element.firstChild;

	var reevaluate = window.containerQueries.reevaluate;

	var done = assert.async();
	window.containerQueries.reprocess(function () {

		var font = function(node) {
			return window.getComputedStyle(node).fontFamily;
		};

		element.style.cssText = 'width: 100px; height: 100px';
		reevaluate();
		assert.notEqual(font(test), 'query', 'width 100, height 100');

		element.style.cssText = 'width: 101px; height: 100px';
		reevaluate();
		assert.notEqual(font(test), 'query', 'width 101, height 100');

		element.style.cssText = 'width: 100px; height: 101px';
		reevaluate();
		assert.notEqual(font(test), 'query', 'width 100, height 101');

		element.style.cssText = 'width: 101px; height: 101px';
		reevaluate();
		assert.equal(font(test), 'query', 'width 101, height 101');

		element.style.cssText = 'width: 199px; height: 199px';
		reevaluate();
		assert.equal(font(test), 'query', 'width 199, height 199');

		element.style.cssText = 'width: 200px; height: 199px';
		reevaluate();
		assert.notEqual(font(test), 'query', 'width 200, height 199');

		element.style.cssText = 'width: 199px; height: 200px';
		reevaluate();
		assert.notEqual(font(test), 'query', 'width 199, height 200');

		element.style.cssText = 'width: 200px; height: 200px';
		reevaluate();
		assert.notEqual(font(test), 'query', 'width 200, height 200');

		done();

	});
});

QUnit.test('Double comparison Query', function(assert) {

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '@font-face { font-family: query; src: local("Times New Roman"), local("Droid Serif") }'
		+ '.test:container(width > 100px < 200px) { font-family: query }';
	fixture.appendChild(style);

	var element = document.createElement('div');
	element.innerHTML = '<div class="test">';
	fixture.appendChild(element);
	var test = element.firstChild;

	var reevaluate = window.containerQueries.reevaluate;

	var done = assert.async();
	window.containerQueries.reprocess(function () {

		var font = function(node) {
			return window.getComputedStyle(node).fontFamily;
		};

		element.style.cssText = 'width: 100px';
		reevaluate();
		assert.notEqual(font(test), 'query', 'width 100');

		element.style.cssText = 'width: 101px';
		reevaluate();
		assert.equal(font(test), 'query', 'width 101');

		element.style.cssText = 'width: 199px';
		reevaluate();
		assert.equal(font(test), 'query', 'width 199');

		element.style.cssText = 'width: 200px';
		reevaluate();
		assert.notEqual(font(test), 'query', 'width 200');

		done();

	});
});

QUnit.test('Visibility Query', function(assert) {

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '@font-face { font-family: visible; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: hidden; src: local("Times New Roman"), local("Droid Serif") }'
		+ '.test:container(visibility = visible) { font-family: visible }'
		+ '.test:container(visibility = hidden) { font-family: hidden }';
	fixture.appendChild(style);

	var element = document.createElement('div');
	element.innerHTML = '<div class="test">';
	fixture.appendChild(element);
	var test = element.firstChild;

	var reevaluate = window.containerQueries.reevaluate;

	var done = assert.async();
	window.containerQueries.reprocess(function () {

		var font = function(node) {
			return window.getComputedStyle(node).fontFamily;
		};

		assert.equal(font(test), 'visible', 'Default style visible');

		element.style.cssText = 'visibility: visible';
		reevaluate();
		assert.equal(font(test), 'visible', 'Style visible');

		element.style.cssText = 'visibility: hidden';
		reevaluate();
		assert.equal(font(test), 'hidden', 'Style hidden');

		element.style.cssText = 'visibility: invalid';
		reevaluate();
		assert.equal(font(test), 'visible', 'Style invalid');

		done();

	});

});

QUnit[window.CSS && CSS.supports && CSS.supports('--foo', 0)
	? 'test'
	: 'skip'
]('CSS variable Query (only for supported browsers)', function(assert) {

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '@font-face { font-family: equal; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: less-than; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: greater-than; src: local("Times New Roman"), local("Droid Serif") }'
		+ '.test:container(--foo = bar) { font-family: equal }'
		+ '.test:container(--foo < 10em) { font-family: less-than }'
		+ '.test:container(--foo > 10em) { font-family: greater-than }';
	fixture.appendChild(style);

	var element = document.createElement('div');
	element.innerHTML = '<div class="test">';
	fixture.appendChild(element);
	var test = element.firstChild;

	var reevaluate = window.containerQueries.reevaluate;

	var done = assert.async();
	window.containerQueries.reprocess(function () {

		var font = function(node) {
			return window.getComputedStyle(node).fontFamily;
		};

		element.style.cssText = '--foo: bar';
		reevaluate();
		assert.equal(font(test), 'equal', 'Equal');

		element.style.cssText = '--foo: 9.9em';
		reevaluate();
		assert.equal(font(test), 'less-than', 'Less than');

		element.style.cssText = '--foo: 101px; font-size: 10px';
		reevaluate();
		assert.equal(font(test), 'greater-than', 'Greater than');

		done();

	});

});

})();
