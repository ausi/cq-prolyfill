(function(window, document) {
'use strict';

window.containerQueries = {
	reevaluate: reevaluate,
};

window.addEventListener('resize', reevaluate);
window.addEventListener('load', reevaluate);

var SELECTOR_REGEXP = /:container\(\s*(?:min|max)-(?:width|height)\s*:\s*[^)]+\s*\)/gi;
var SELECTOR_ESCAPED_REGEXP = /\.\\:container\\\(\s*((?:min|max)-(?:width|height))\s*\\:\s*([^)]+?)\s*\\\)/gi;
var ESCAPE_REGEXP = /[:()]/g;
var SPACE_REGEXP = / /g;

var queries = {};
var elementsCache = new Map();

function reevaluate() {
	preprocess(function() {
		parseRules();
		updateClasses();
	});
}

function preprocess(callback) {
	var sheets = document.styleSheets;
	var done = 0;
	for (var i = 0, length = sheets.length; i < length; i++) {
		preprocessSheet(sheets[i], function() {
			done++;
			if (done === length) {
				callback();
			}
		});
	}
}

function preprocessSheet(sheet, callback) {
	if (sheet.disabled) {
		callback();
		return;
	}
	var tag = sheet.ownerNode && sheet.ownerNode.tagName;
	if (tag === 'LINK') {
		loadExternal(sheet.ownerNode.href, function(cssText) {
			// TODO: fix relative URLs, see https://github.com/LeaVerou/prefixfree/blob/765c6a1/prefixfree.js#L46
			preprocessStyle(sheet.ownerNode, cssText, callback);
		});
	}
	else if (tag === 'STYLE') {
		preprocessStyle(sheet.ownerNode, sheet.ownerNode.innerHTML, callback);
	}
	else {
		callback();
	}
}

function loadExternal(href, callback) {
	var xhr = new window.XMLHttpRequest();
	xhr.open('GET', href);
	xhr.onreadystatechange = function() {
		if (xhr.readyState !== 4) {
			return;
		}
		callback(xhr.status === 200 ? xhr.responseText : '');
	};
	xhr.send();
}

function preprocessStyle(node, cssText, callback) {
	var found = false;
	cssText = cssText.replace(SELECTOR_REGEXP, function(selector) {
		found = true;
		return '.' + selector.replace(SPACE_REGEXP, '').replace(ESCAPE_REGEXP, '\\$&');
	});
	if (!found) {
		callback();
		return;
	}
	var style = document.createElement('style');
	style.textContent = cssText;
	style.media = node.media;
	node.parentNode.insertBefore(style, node);
	node.disabled = true;
	callback();
}

function parseRules() {
	var sheets = document.styleSheets;
	var rules;
	for (var i = 0; i < sheets.length; i++) {
		if (sheets[i].disabled) {
			continue;
		}
		try {
			rules = sheets[i].cssRules;
		}
		catch(e) {
			continue;
		}
		for (var j = 0; j < rules.length; j++) {
			parseRule(rules[j]);
		}
	}
}

function parseRule(rule) {
	if (rule.cssRules) {
		for (var i = 0; i < rule.cssRules.length; i++) {
			parseRule(rule.cssRules[i]);
		}
		return;
	}
	if (rule.type !== 1) {
		return;
	}
	splitSelectors(rule.selectorText).forEach(function(selector) {
		if (selector.search(SELECTOR_ESCAPED_REGEXP) !== -1) {
			selector.replace(SELECTOR_ESCAPED_REGEXP, function(match, type, value, offset) {
				var precedingSelector = selector.substr(0, offset);
				if (!precedingSelector.substr(-1).trim()) {
					precedingSelector += '*';
				}
				queries[precedingSelector + match.toLowerCase()] = {
					selector: precedingSelector,
					prop: type.split('-')[1].toLowerCase(),
					type: type.split('-')[0].toLowerCase(),
					value: value,
					className: match.toLowerCase().substr(1).replace(/\\(.)/g, '$1'),
				};
			})
		}
	});
}

function splitSelectors(selectors) {
	// TODO: Fix complex selectors like fo\,o[attr="val,u\"e"]
	return selectors.split(/\s*,\s*/);
}

function updateClasses() {
	elementsCache = new Map();
	eachQuery(function(query) {
		var elements = document.querySelectorAll(query.selector);
		for (var i = 0; i < elements.length; i++) {
			updateClass(elements[i], query);
		}
	});
}

function updateClass(element, query) {
	var container = getContainer(element, query.prop);
	var size = getSize(container, query.prop);
	var value = parseFloat(query.value);
	if (
		(query.type === 'min' && size >= value)
		|| (query.type === 'max' && size <= value)
	) {
		element.classList.add(query.className);
	}
	else {
		element.classList.remove(query.className);
	}
}

function getContainer(element, prop) {
	var cache;
	if (elementsCache.has(element)) {
		cache = elementsCache.get(element);
		if (cache.parents[prop]) {
			return cache.parents[prop];
		}
	}
	else {
		cache = {
			parents: {},
		};
		elementsCache.set(element, cache);
	}

	if (element.parentNode === document.documentElement) {
		cache.parents[prop] = element.parentNode;
	}
	// TODO: Add the right check
	else if (window.getComputedStyle(element.parentNode).display === 'block') {
		cache.parents[prop] = element.parentNode;
	}
	else {
		cache.parents[prop] = getContainer(element.parentNode, prop);
	}
	return cache.parents[prop];
}

function getSize(element, prop) {
	if (prop === 'width') {
		return element.offsetWidth;
	}
	else if (prop === 'height') {
		return element.offsetHeight;
	}
	return 0;
}

function eachQuery(callback) {
	Object.keys(queries).forEach(function(key) {
		callback(queries[key], key);
	});
}

})(window, document);
