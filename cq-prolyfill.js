(function(window, document) {
'use strict';

window.containerQueries = {
	reprocess: reprocess,
	reparse: reparse,
	reevaluate: reevaluate,
};

window.addEventListener('resize', reevaluate);
window.addEventListener('load', reprocess);

var SELECTOR_REGEXP = /:container\(\s*(?:min|max)-(?:width|height)\s*:\s*[^)]+\s*\)/gi;
var SELECTOR_ESCAPED_REGEXP = /\.\\:container\\\(\s*((?:min|max)-(?:width|height))\s*\\:\s*([^)]+?)\s*\\\)/gi;
var ESCAPE_REGEXP = /[:()]/g;
var SPACE_REGEXP = / /g;
var LENGTH_REGEXP = /^-?(?:\d*\.)?\d+(?:em|ex|ch|rem|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc)$/i;
var ATTR_REGEXP = /\[.+?\]/g;
var PSEUDO_NOT_REGEXP = /:not\(/g;
var ID_REGEXP = /#[^\[\]\\!"#$%&'()*+,./:;<=>?@^`{|}~-]+/g;
var CLASS_REGEXP = /\.[^\[\]\\!"#$%&'()*+,./:;<=>?@^`{|}~-]+/g;
var PSEUDO_ELEMENT_REGEXP = /::[^\[\]\\!"#$%&'()*+,./:;<=>?@^`{|}~-]+/g;
var PSEUDO_CLASS_REGEXP = /:[^\[\]\\!"#$%&'()*+,./:;<=>?@^`{|}~-]+/g;
var ELEMENT_REGEXP = /[a-z-]+/gi;

var queries = {};
var elementsCache = new Map();

function reprocess() {
	preprocess(function() {
		reparse();
	});
}
function reparse() {
	parseRules();
	reevaluate();
}
function reevaluate() {
	updateClasses();
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
	var container = getContainer(element.parentNode, query.prop);
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
		if (cache.container[prop]) {
			return cache.container[prop];
		}
	}
	else {
		cache = {
			container: {},
		};
		elementsCache.set(element, cache);
	}

	if (element === document.documentElement) {
		cache.container[prop] = element;
	}

	// Skip inline elements
	else if (window.getComputedStyle(element).display === 'inline') {
		cache.container[prop] = getContainer(element.parentNode, prop);
	}

	else if (isFixedSize(element, prop)) {
		cache.container[prop] = element;
	}

	else {
		var parentContainer = getContainer(element.parentNode, prop);
		var chain = [];
		for (var node = element; node !== parentContainer; node = node.parentNode) {
			// Skip inline elements
			if (window.getComputedStyle(node).display !== 'inline') {
				chain.unshift(node);
			}
		}
		for (var i = 0; i < chain.length; i++) {
			if (isIntrinsicSize(chain[i], prop)) {
				break;
			}
		}
		if (i) {
			cache.container[prop] = chain[i - 1];
		}
		else {
			cache.container[prop] = parentContainer;
		}
	}

	return cache.container[prop];

}

function isFixedSize(element, prop) {
	var originalStyle = getOriginalStyle(element, [prop]);
	if (originalStyle[prop] && originalStyle[prop].search(LENGTH_REGEXP) !== -1) {
		return true;
	}
}

function isIntrinsicSize(element, prop) {

	var computedStyle = window.getComputedStyle(element);

	if (computedStyle.display === 'none') {
		return false;
	}

	if (computedStyle.display === 'inline') {
		return true;
	}

	// Non-floating non-absolute block elements (only width)
	if (
		prop === 'width'
		&& ['block', 'list-item', 'flex', 'grid'].indexOf(computedStyle.display) !== -1
		&& computedStyle.float === 'none'
		&& computedStyle.position !== 'absolute'
		&& computedStyle.position !== 'fixed'
	) {
		return false;
	}

	var originalStyle = getOriginalStyle(element, [prop]);

	// Fixed size
	if (originalStyle[prop] && originalStyle[prop].search(LENGTH_REGEXP) !== -1) {
		return false;
	}

	// Percentage size
	if (originalStyle[prop] && originalStyle[prop].substr(-1) === '%') {
		return false;
	}

	// Elements without a defined size
	return true;

}

// TODO: Return the size of the content-box instead of the border-box
function getSize(element, prop) {
	if (prop === 'width') {
		return element.offsetWidth;
	}
	else if (prop === 'height') {
		return element.offsetHeight;
	}
	return 0;
}

// TODO: Respect !important styles
function getOriginalStyle(element, props) {

	var matchedRules = [];
	var sheets = document.styleSheets;
	var rules;
	var result = {};
	var i, j;

	for (i = 0; i < sheets.length; i++) {
		if (sheets[i].disabled) {
			continue;
		}
		try {
			rules = sheets[i].cssRules;
		}
		catch(e) {
			continue;
		}
		matchedRules = matchedRules.concat(filterRulesByElementAndProps(rules, element, props));
	}

	matchedRules = sortRulesBySpecificity(matchedRules);

	// Add style attribute
	matchedRules.unshift({
		rule: {
			style: element.style,
		},
	});

	for (i = 0; i < props.length; i++) {
		for (j = 0; j < matchedRules.length; j++) {
			if (matchedRules[j].rule.style.getPropertyValue(props[i])) {
				result[props[i]] = matchedRules[j].rule.style.getPropertyValue(props[i]);
				break;
			}
		}
	}

	return result;

}

function filterRulesByElementAndProps(rules, element, props) {
	var matchedRules = [];
	for (var i = 0; i < rules.length; i++) {
		if (rules[i].cssRules) {
			matchedRules = matchedRules.concat(filterRulesByElementAndProps(rules[i].cssRules, element, props));
		}
		else if (rules[i].type === 1) { // Style rule
			if (
				styleHasProperty(rules[i].style, props)
				&& (
					!rules[i].parentRule
					|| rules[i].parentRule.type !== 4 // @media rule
					|| window.matchMedia(rules[i].parentRule.media).matches
				)
				&& element.matches(rules[i].selectorText)
			) {
				splitSelectors(rules[i].selectorText).forEach(function(selector) {
					if (element.matches(selector)) {
						matchedRules.push({
							selector: selector,
							rule: rules[i],
						});
					}
				});
			}
		}
	}
	return matchedRules;
}

function styleHasProperty(style, props) {
	for (var i = 0; i < style.length; i++) {
		if (props.indexOf(style.item(i)) !== -1) {
			return true;
		}
	}
	return false;
}

function sortRulesBySpecificity(rules) {
	return rules.map(function(rule, i) {
		return [rule, i];
	}).sort(function(a, b) {
		return (getSpecificity(b[0].selector) - getSpecificity(a[0].selector)) || b[1] - a[1];
	}).map(function(rule) {
		return rule[0];
	});
}

function getSpecificity(selector) {
	// [style, id, class, type]
	var scores = [0, 0, 0, 0];
	selector.replace(SELECTOR_ESCAPED_REGEXP, function() {
		scores[2]++;
		return '';
	});
	selector.replace(ATTR_REGEXP, function() {
		scores[2]++;
		return '';
	});
	selector.replace(PSEUDO_NOT_REGEXP, '');
	selector.replace(ID_REGEXP, function() {
		scores[1]++;
		return '';
	});
	selector.replace(CLASS_REGEXP, function() {
		scores[2]++;
		return '';
	});
	selector.replace(PSEUDO_ELEMENT_REGEXP, function() {
		scores[3]++;
		return '';
	});
	selector.replace(PSEUDO_CLASS_REGEXP, function() {
		scores[2]++;
		return '';
	});
	selector.replace(ELEMENT_REGEXP, function() {
		scores[3]++;
		return '';
	});
	return (
		(scores[0] * 1000 * 1000 * 1000)
		+ (scores[1] * 1000 * 1000)
		+ (scores[2] * 1000)
		+ scores[3]
	);
}

function eachQuery(callback) {
	Object.keys(queries).forEach(function(key) {
		callback(queries[key], key);
	});
}

})(window, document);
