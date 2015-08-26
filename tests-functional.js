/*global QUnit*/
(function() {
'use strict';

var fixture = document.getElementById('qunit-fixture');

QUnit.test('Simple width and height Query', function(assert) {

	var style = document.createElement('style');
	style.type = 'text/css';
	style.innerHTML = '@font-face { font-family: no-query; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: min-width-100; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: min-width-200; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: min-height-100; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: min-height-200; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: max-width-200; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: max-width-100; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: max-height-200; src: local("Times New Roman"), local("Droid Serif") }'
		+ '@font-face { font-family: max-height-100; src: local("Times New Roman"), local("Droid Serif") }'
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

})();
