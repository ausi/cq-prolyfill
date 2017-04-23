/*
 * Copyright Martin Auswöger
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

(function(
	window,
	document,
	/*eslint-disable no-shadow-restricted-names*/
	undefined
	/*eslint-enable no-shadow-restricted-names*/
) {
'use strict';

(function (factory) {
	/*global define*/
	/* istanbul ignore next: don’t cover module definition */
	if (typeof define === 'function' && define.amd) {
		define([], function() {
			return factory;
		});
	}
	/*global module*/
	else if (typeof module === 'object' && module.exports) {
		module.exports = factory;
	}
	else {
		/*eslint-disable dot-notation*/
		window['cqApi'] = factory(window['cqConfig']);
		/*eslint-enable dot-notation*/
	}
}(function(config) {

config = config || {};

// Public API
/*eslint-disable dot-notation*/
var api = {
	'reprocess': reprocess,
	'reparse': reparse,
	'reevaluate': reevaluate,
	'config': config,
};
/*eslint-enable dot-notation*/

var observer;

startObserving();

var REGEXP_ESCAPE_REGEXP = /[.?*+^$[\]\\(){}|-]/g;
var SELECTOR_REGEXP = /\.?:container\(\s*"?\s*[a-z-]+(?:(?:\s+|\|)[a-z-]+)?\s*(?:[<>!=]=?)\s*[^)]+\s*\)/gi;
var SELECTOR_ESCAPED_REGEXP = /\.\\:container\\\(([a-z-]+)(\\\|[a-z-]+)?(\\[<>!=](?:\\=)?)([^)]+?)(?:(\\[<>!=](?:\\=)?)([^)]+?))?\\\)/gi;
var ESCAPE_REGEXP = /[.:()<>!=%]/g;
var SPACE_REGEXP = / /g;
var LENGTH_REGEXP = /^(-?(?:\d*\.)?\d+)(em|ex|ch|rem|vh|vw|vmin|vmax|px|mm|cm|in|pt|pc)$/i;
var NUMBER_REGEXP = /^-?(?:\d*\.)?\d+$/i;
var URL_VALUE_REGEXP = /url\(\s*(?:(["'])(.*?)\1|([^)\s]*))\s*\)/gi;
var ATTR_REGEXP = /\[.+?\]/g;
var PSEUDO_NOT_REGEXP = /:not\(/g;
var ID_REGEXP = /#[^\s\[\\#+,.:>~]+/g;
var CLASS_REGEXP = /\.[^\s\[\\#+,.:>~]+/g;
var PSEUDO_ELEMENT_REGEXP = /::[^\s\[\\#+,.:>~]+/g;
var PSEUDO_CLASS_REGEXP = /:[^\s\[\\#+,.:>~]+/g;
var ELEMENT_REGEXP = /[a-z-]+/gi;
var FIXED_UNIT_MAP = {
	'px': 1,
	'pt': 16 / 12,
	'pc': 16,
	'in': 96,
	'cm': 96 / 2.54,
	'mm': 96 / 25.4,
};

var queries;
var containerCache;
var styleCache;
var processedSheets = createCacheMap();
var requestCache = {};
var domMutations = [];
var processed = false;
var parsed = false;
var documentElement = document.documentElement;
var styleSheets = document.styleSheets;
var createElement = document.createElement.bind(document);

/**
 * @param {function()} callback
 */
function reprocess(callback) {
	preprocess(function() {
		processed = true;
		reparse(callback);
	});
}

/**
 * @param {function()} callback
 */
function reparse(callback) {
	if (!processed) {
		return reprocess(callback);
	}
	parseRules();
	buildStyleCache();
	parsed = true;
	reevaluate(true, callback);
}

/**
 * @param {boolean}         clearContainerCache
 * @param {function()}      callback
 * @param {Array.<Element>} contexts
 */
function reevaluate(clearContainerCache, callback, contexts) {
	if (!parsed) {
		return reparse(callback);
	}
	updateClasses(clearContainerCache, contexts);
	if (callback) {
		callback();
	}
}

/**
 * Starts observing DOM events and mutations
 */
function startObserving() {

	if (config.skipObserving) {
		return;
	}

	// Reevaluate now
	setTimeout(reevaluate);

	window.addEventListener('DOMContentLoaded', reprocess.bind(undefined, undefined));
	window.addEventListener('load', reprocess.bind(undefined, undefined));
	window.addEventListener('resize', reevaluate.bind(undefined, true, undefined, undefined));

	var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
	if (MutationObserver) {
		observer = new MutationObserver(checkMutations);
		observer.observe(document.documentElement, {
			childList: true,
			subtree: true,
		});
	}
	else {
		window.addEventListener('DOMNodeInserted', onDomMutate);
		window.addEventListener('DOMNodeRemoved', onDomMutate);
	}

}

/**
 * Check DOM mutations and reprocess or reevaluate
 *
 * @param  {Array.<MutationRecord>} mutations
 */
function checkMutations(mutations) {

	var addedNodes = [];
	var stylesChanged = false;

	var replacedSheets = [];
	processedSheets.forEach(function(newNode) {
		replacedSheets.push(newNode);
	});

	arrayFrom(mutations).forEach(function(mutation) {

		addedNodes.push.apply(addedNodes, arrayFrom(mutation.addedNodes).filter(function(node) {
			return node.nodeType === 1;
		}));

		arrayFrom(mutation.removedNodes).forEach(function(node) {
			var index = addedNodes.indexOf(node);
			if (index !== -1) {
				addedNodes.splice(index, 1);
			}
			else if (
				(node.tagName === 'LINK' || node.tagName === 'STYLE')
				&& replacedSheets.indexOf(node) === -1
			) {
				stylesChanged = true;
			}
		});

	});

	addedNodes.forEach(function(node) {
		if (node.sheet && replacedSheets.indexOf(node) === -1) {
			stylesChanged = true;
		}
	});

	if (stylesChanged) {
		reprocess();
	}
	else if (addedNodes.length) {
		reevaluate(false, undefined, addedNodes);
	}

}

/**
 * Event handler for DOMNodeInserted and DOMNodeRemoved
 *
 * @param  {MutationEvent} event
 */
function onDomMutate(event) {

	var mutation = {
		addedNodes: [],
		removedNodes: [],
	};
	mutation[
		(event.type === 'DOMNodeInserted' ? 'added' : 'removed') + 'Nodes'
	] = [event.target];

	domMutations.push(mutation);

	// Delay the call to checkMutations()
	setTimeout(function() {
		checkMutations(domMutations);
		domMutations = [];
	});

}

/**
 * Step 1: Preprocess all active stylesheets in the document
 *
 * Look for stylesheets that contain container queries and escape them to be
 * readable by the browser, e.g. convert `:container(width >= 10px)` to
 * `\:container\(width\>\=10px\)`
 *
 * @param {function()} callback
 */
function preprocess(callback) {

	var sheets = arrayFrom(styleSheets);

	// Check removed stylesheets
	processedSheets.forEach(function(newNode, node) {
		if (sheets.indexOf(node.sheet) === -1 && sheets.indexOf(newNode.sheet) !== -1 && newNode.parentNode) {
			sheets.splice(sheets.indexOf(newNode.sheet), 1);
			newNode.parentNode.removeChild(newNode);
		}
	});

	var done = -1;
	function step() {
		done++;
		if (done === sheets.length) {
			callback();
		}
	}
	sheets.forEach(function(sheet) {
		preprocessSheet(sheet, step);
	});
	step();

}

/**
 * @param {CSSStyleSheet} sheet
 * @param {function()}    callback
 */
function preprocessSheet(sheet, callback) {
	if (sheet.disabled) {
		callback();
		return;
	}
	if (config.postcss) {
		var rulesLength = -1;
		try {
			rulesLength = sheet.cssRules.length;
		}
		catch(e) {
			// Do nothing
		}
		// Check if cssRules is accessible
		if (rulesLength !== -1) {
			callback();
			return;
		}
	}
	var ownerNode = sheet.ownerNode;
	var tag = ownerNode && ownerNode.tagName;
	if (tag === 'LINK' && !processedSheets.has(ownerNode)) {
		loadExternal(ownerNode.href, function(cssText) {
			// Check again because loadExternal is async
			if (sheet.disabled || !cssText) {
				callback();
				return;
			}
			preprocessStyle(ownerNode, fixRelativeUrls(cssText, ownerNode.href));
			callback();
		});
	}
	else if (tag === 'STYLE') {
		preprocessStyle(ownerNode, ownerNode.innerHTML);
		callback();
	}
	else {
		callback();
	}
}

/**
 * Load external file via AJAX
 *
 * @param {string}           href
 * @param {function(string)} callback Gets called with the response text on
 *                                    success or empty string on failure
 */
function loadExternal(href, callback) {
	var cacheEntryType = typeof requestCache[href];
	if (cacheEntryType === 'string') {
		callback(requestCache[href]);
		return;
	}
	else if (cacheEntryType === 'object') {
		requestCache[href].push(callback);
		return;
	}
	requestCache[href] = [callback]
	var isDone = false;
	var done = function(response) {
		if (!isDone) {
			response = response || '';
			requestCache[href].forEach(function(cachedCallback) {
				setTimeout(function() {
					cachedCallback(response);
				});
			});
			requestCache[href] = response;
		}
		isDone = true;
	};
	var xhr = new XMLHttpRequest();
	xhr.onreadystatechange = function() {
		if (xhr.readyState !== 4) {
			return;
		}
		done(xhr.status === 200 && xhr.responseText);
	};
	try {
		xhr.open('GET', href);
		xhr.send();
	}
	catch(e) {
		if (window.XDomainRequest) {
			xhr = new XDomainRequest();
			xhr.onprogress =
				/* istanbul ignore next: fix for a rare IE9 bug */
				function() {};
			xhr.onload = xhr.onerror = xhr.ontimeout = function() {
				done(xhr.responseText);
			};
			try {
				xhr.open('GET', href);
				xhr.send();
			}
			catch(e2) {
				done();
			}
		}
		else {
			done();
		}
	}
}

/**
 * Replace relative CSS URLs with their absolute counterpart
 *
 * @param  {string} cssText
 * @param  {string} href    URL of the stylesheet
 * @return {string}
 */
function fixRelativeUrls(cssText, href) {
	var base = resolveRelativeUrl(href, document.baseURI);
	return cssText.replace(URL_VALUE_REGEXP, function(match, quote, url1, url2) {
		var url = url1 || url2;
		if (!url) {
			return match;
		}
		return 'url(' + (quote || '"') + resolveRelativeUrl(url, base) + (quote || '"') + ')';
	});
}

/**
 * @param  {string} url
 * @param  {string} base
 * @return {string}
 */
function resolveRelativeUrl(url, base) {
	var absoluteUrl;
	try {
		absoluteUrl = new URL(url, base).href;
	}
	catch(e) {
		absoluteUrl = false;
	}
	if (!absoluteUrl) {
		var baseElement = createElement('base');
		baseElement.href = base;
		document.head.insertBefore(baseElement, document.head.firstChild);
		var link = createElement('a');
		link.href = url;
		absoluteUrl = link.href;
		// Catch error in iOS 7.0
		try {
			// Fix for a bug in Opera 12
			delete baseElement.href;
		}
		catch(e) {
			// Do nothing
		}
		document.head.removeChild(baseElement);
	}
	return absoluteUrl;
}

/**
 * @param {Node}   node    Stylesheet ownerNode
 * @param {string} cssText
 */
function preprocessStyle(node, cssText) {
	processedSheets.set(node, false);
	var escapedText = escapeSelectors(cssText);
	var rulesLength = -1;
	if (escapedText === cssText) {
		try {
			rulesLength = node.sheet.cssRules.length;
		}
		catch(e) {
			rulesLength = -1;
		}
		// Check if cssRules is accessible
		if (rulesLength !== -1) {
			return;
		}
	}
	var style = createElement('style');
	style.textContent = escapedText;
	style.media = node.media || 'all';
	node.parentNode.insertBefore(style, node);
	node.sheet.disabled = true;
	processedSheets.set(node, style);
}

/**
 * @param  {string} cssText
 * @return {string}
 */
function escapeSelectors(cssText) {
	return cssText.replace(SELECTOR_REGEXP, function(selector) {
		return '.' + selector.substr(selector[0] === '.' ? 1 : 0)
			.replace(/([a-z])(?:\s+|\|)([a-z])/gi, '$1\\|$2')
			.replace(SPACE_REGEXP, '')
			.replace(/"/g, '')
			.replace(ESCAPE_REGEXP, '\\$&')
			.toLowerCase();
	});
}

/**
 * Step 2: Parse all processed container query rules and store them in `queries`
 * indexed by the preceding selector
 */
function parseRules() {
	queries = {};
	var rules;
	for (var i = 0; i < styleSheets.length; i++) {
		if (styleSheets[i].disabled) {
			continue;
		}
		try {
			rules = styleSheets[i].cssRules;
			if (!rules || !rules.length) {
				continue;
			}
		}
		catch(e) {
			continue;
		}
		for (var j = 0; j < rules.length; j++) {
			parseRule(rules[j]);
		}
	}
}

/**
 * @param {CSSRule} rule
 */
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
		selector = escapeSelectors(selector);
		selector.replace(SELECTOR_ESCAPED_REGEXP, function(match, prop, filter, type1, value1, type2, value2, offset) {
			var precedingSelector =
				(
					selector.substr(0, offset)
					+ selector.substr(offset + match.length).replace(/^((?:\([^)]*\)|[^\s>+~])*).*$/, '$1')
				)
				.replace(SELECTOR_ESCAPED_REGEXP, '')
				.replace(PSEUDO_ELEMENT_REGEXP, '')
				.replace(/:(?:active|hover|focus|checked|before|after)/gi, '');
			if (!precedingSelector.substr(-1).trim()) {
				precedingSelector += '*';
			}
			var values = [unescape(value1), unescape(value2)].filter(Boolean);
			var valueType =
				(filter || values[0].match(NUMBER_REGEXP)) ? 'n' :
				values[0].match(LENGTH_REGEXP) ? 'l' :
				's';
			if (valueType === 'n') {
				values = values.map(parseFloat);
			}
			queries[precedingSelector + match] = {
				_selector: precedingSelector,
				_prop: unescape(prop),
				_filter: filter && filter.substr(2),
				_types: [unescape(type1), unescape(type2)].filter(Boolean),
				_values: values,
				_valueType: valueType,
				_className: unescape(match.substr(1)),
			};
		});
	});
}

/**
 * Unescape backslash escaped string
 *
 * @param  {string} string
 * @return {string}
 */
function unescape(string) {
	return string && string.replace(/\\(.)/g, '$1');
}

/**
 * Split multiple selectors by `,`
 *
 * @param  {string} selectors
 * @return {Array.<string>}
 */
function splitSelectors(selectors) {
	return (selectors.match(/(?:\\.|"(?:\\.|[^"])*"|\([^)]*\)|[^,])+/g) || [])
		.map(function(selector) {
			return selector.trim();
		});
}

/**
 * Builds the styleCache needed by getOriginalStyle
 */
function buildStyleCache() {
	styleCache = {
		width: {},
		height: {},
	};
	var rules;
	for (var i = 0; i < styleSheets.length; i++) {
		if (styleSheets[i].disabled) {
			continue;
		}
		try {
			rules = styleSheets[i].cssRules;
			if (!rules || !rules.length) {
				continue;
			}
		}
		catch(e) {
			continue;
		}
		buildStyleCacheFromRules(rules);
	}
}

/**
 * @param {CSSRuleList} rules
 */
function buildStyleCacheFromRules(rules) {
	for (var i = 0; i < rules.length; i++) {
		if (rules[i].type === 1) { // Style rule
			if (
				rules[i].style.getPropertyValue('width')
				|| rules[i].style.getPropertyValue('height')
			) {
				splitSelectors(escapeSelectors(rules[i].selectorText)).forEach(function(selector) {
					var rule = {
						_selector: selector,
						_rule: rules[i],
						_specificity: getSpecificity(selector),
					};
					var rightMostSelector = selector
						.replace(/:[a-z-]+\([^)]*\)/i, '')
						.replace(/^.*[^\\][\s>+~]\s*/, '');
					if (
						rightMostSelector.match(PSEUDO_ELEMENT_REGEXP)
						|| rightMostSelector.match(/:(?:before|after)/i)
					) {
						return;
					}
					rightMostSelector = rightMostSelector
						.replace(PSEUDO_CLASS_REGEXP, '')
						.trim();
					['width', 'height'].forEach(function(prop) {
						if (!rules[i].style.getPropertyValue(prop)) {
							return;
						}
						var match = rightMostSelector.match(ID_REGEXP);
						if (!match) {
							match = rightMostSelector.match(CLASS_REGEXP);
						}
						if (!match) {
							match = rightMostSelector.match(ELEMENT_REGEXP);
							if (match) {
								match = [match[0].toLowerCase()];
							}
						}
						if (!match) {
							match = '*';
						}
						if (!styleCache[prop][match[0]]) {
							styleCache[prop][match[0]] = [];
						}
						styleCache[prop][match[0]].push(rule);
					});
				});
			}
		}
		else if (rules[i].cssRules) {
			buildStyleCacheFromRules(rules[i].cssRules);
		}
	}
}

/**
 * Step 3: Loop through the `queries` and add or remove the CSS classes of all
 * matching elements
 *
 * @param {boolean}         clearContainerCache
 * @param {Array.<Element>} contexts
 */
function updateClasses(clearContainerCache, contexts) {

	if (clearContainerCache || !containerCache) {
		containerCache = createCacheMap();
	}

	if (!Object.keys(queries).length) {
		return;
	}

	var elementsTree = buildElementsTree(contexts);

	while(updateClassesRead(elementsTree)) {
		updateClassesWrite(elementsTree);
	}
	updateClassesWrite(elementsTree);

}

/**
 * Update classes read step
 *
 * @param  {Array.<{_element: Element, _children: array, _queries: array, _changes: array, _done: boolean}>} treeNodes
 * @param  {boolean}                                                                                         dontMarkAsDone
 * @return {boolean} True if changes were found
 */
function updateClassesRead(treeNodes, dontMarkAsDone) {
	var hasChanges = false;
	var i, node, j, query;
	for (i = 0; i < treeNodes.length; i++) {
		node = treeNodes[i];
		if (!node._done) {
			for (j = 0; j < node._queries.length; j++) {
				query = node._queries[j];
				var queryMatches = evaluateQuery(node._element.parentNode, query);
				if (queryMatches !== hasClass(node._element, query._className)) {
					node._changes.push([queryMatches, query]);
				}
			}
			node._done = !dontMarkAsDone;
		}
		hasChanges = updateClassesRead(node._children, dontMarkAsDone || node._changes.length)
			|| node._changes.length
			|| hasChanges;
	}
	return hasChanges;
}

/**
 * Update classes write step
 *
 * @param  {Array.<{_element: Element, _children: array, _queries: array, _changes: array, _done: boolean}>} treeNodes
 */
function updateClassesWrite(treeNodes) {
	var node, j;
	for (var i = 0; i < treeNodes.length; i++) {
		node = treeNodes[i];
		for (j = 0; j < node._changes.length; j++) {
			(node._changes[j][0] ? addClass : removeClass)(node._element, node._changes[j][1]._className);
		}
		node._changes = [];
		updateClassesWrite(node._children);
	}
}

/**
 * Build tree of all query elements
 *
 * @param  {Array.<Element>} contexts
 * @return {Array.<{_element: Element, _children: array, _queries: array, _changes: array, _done: boolean}>}
 */
function buildElementsTree(contexts) {

	contexts = contexts || [document];

	var queriesArray = Object.keys(queries).map(function(key) {
		return queries[key];
	});

	var selector = queriesArray.map(function(query) {
		return query._selector;
	}).join(',');

	var elements = [];
	contexts.forEach(function(context) {
		for (var node = context.parentNode; node; node = node.parentNode) {
			// Skip nested contexts
			if (contexts.indexOf(node) !== -1) {
				return;
			}
		}
		if (context !== document && elementMatchesSelector(context, selector)) {
			elements.push(context);
		}
		elements.push.apply(elements, arrayFrom(context.querySelectorAll(selector)));
	});

	var tree = [];
	var treeCache = createCacheMap();

	elements.forEach(function(element) {

		if (element === documentElement) {
			return;
		}

		var treeNode = {
			_element: element,
			_children: [],
			_queries: [],
			_changes: [],
			_done: false,
		};

		var children = tree;
		for (var node = element.parentNode; node; node = node.parentNode) {
			if (treeCache.get(node)) {
				children = treeCache.get(node)._children;
				break;
			}
		}

		treeCache.set(element, treeNode);

		children.push(treeNode);

		queriesArray.forEach(function(query) {
			if (elementMatchesSelector(element, query._selector)) {
				treeNode._queries.push(query);
			}
		});

	});

	return tree;

}

/**
 * True if the query matches otherwise false
 *
 * @param  {Element} parent
 * @param  {object}  query
 * @return {boolean}
 */
function evaluateQuery(parent, query) {

	var container = getContainer(parent, query._prop);
	var qValues = query._values.slice(0);
	var i;

	var cValue;
	if (query._prop === 'width' || query._prop === 'height') {
		cValue = getSize(container, query._prop);
	}
	else {
		cValue = getComputedStyle(container).getPropertyValue(query._prop);
	}

	if (query._filter) {
		var color = parseColor(cValue);
		if (query._filter[0] === 'h') {
			cValue = color[0];
		}
		else if (query._filter[0] === 's') {
			cValue = color[1];
		}
		else if (query._filter[0] === 'l') {
			cValue = color[2];
		}
		else if (query._filter[0] === 'a') {
			cValue = color[3];
		}
		else {
			return false;
		}
	}
	else if (query._valueType === 'l') {
		for (i = 0; i < qValues.length; i++) {
			qValues[i] = getComputedLength(qValues[i], parent);
		}
		if (typeof cValue === 'string') {
			cValue = getComputedLength(cValue, parent);
		}
	}
	else if (query._valueType === 'n') {
		cValue = parseFloat(cValue);
	}
	else if (typeof cValue === 'string') {
		cValue = cValue.trim();
	}

	if ((
		query._types[0][0] === '>'
		|| query._types[0][0] === '<'
	) && (
		typeof cValue !== 'number'
		|| typeof qValues[0] !== 'number'
	)) {
		return false;
	}

	for (i = 0; i < qValues.length; i++) {
		if (!(
			(query._types[i] === '>=' && cValue >= qValues[i])
			|| (query._types[i] === '<=' && cValue <= qValues[i])
			|| (query._types[i] === '>' && cValue > qValues[i])
			|| (query._types[i] === '<' && cValue < qValues[i])
			|| (query._types[i] === '=' && cValue === qValues[i])
			|| (query._types[i] === '!=' && cValue !== qValues[i])
		)) {
			return false;
		}
	}

	return true;

}

/**
 * Get the nearest qualified container element starting by the element itself
 *
 * @param  {Element} element
 * @param  {string}  prop    CSS property
 * @return {Element}
 */
function getContainer(element, prop) {

	var cache;
	if (containerCache.has(element)) {
		cache = containerCache.get(element);
		if (cache[prop]) {
			return cache[prop];
		}
	}
	else {
		cache = {};
		containerCache.set(element, cache);
	}

	if (element === documentElement) {
		cache[prop] = element;
	}

	else if (prop !== 'width' && prop !== 'height') {
		// Skip transparent background colors
		if (prop === 'background-color' && !parseColor(getComputedStyle(element).getPropertyValue(prop))[3]) {
			cache[prop] = getContainer(element.parentNode, prop);
		}
		else {
			cache[prop] = element;
		}
	}

	// Skip inline elements
	else if (getComputedStyle(element).display === 'inline') {
		cache[prop] = getContainer(element.parentNode, prop);
	}

	else if (isFixedSize(element, prop)) {
		cache[prop] = element;
	}

	else {
		var parentContainer = getContainer(element.parentNode, prop);
		var parentNode = element.parentNode;
		while (getComputedStyle(parentNode).display === 'inline') {
			parentNode = parentNode.parentNode;
		}
		if (parentNode === parentContainer && !isIntrinsicSize(element, prop)) {
			cache[prop] = element;
		}
		else {
			cache[prop] = parentContainer;
		}
	}

	return cache[prop];

}

/**
 * Is the size of the element a fixed length e.g. `1px`?
 *
 * @param  {Element} element
 * @param  {string}  prop    `width` or `height`
 * @return {boolean}
 */
function isFixedSize(element, prop) {
	var originalStyle = getOriginalStyle(element, prop);
	if (originalStyle && (
		originalStyle.match(LENGTH_REGEXP)
		|| originalStyle.match(/^calc\([^%]*\)$/i)
	)) {
		return true;
	}
	return false;
}

/**
 * Is the size of the element depending on its descendants?
 *
 * @param  {Element} element
 * @param  {string}  prop    `width` or `height`
 * @return {boolean}
 */
function isIntrinsicSize(element, prop) {

	var computedStyle = getComputedStyle(element);

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
		&& computedStyle.cssFloat === 'none'
		&& computedStyle.position !== 'absolute'
		&& computedStyle.position !== 'fixed'
	) {
		return false;
	}

	var originalStyle = getOriginalStyle(element, prop);

	// Fixed size
	if (originalStyle && originalStyle.match(LENGTH_REGEXP)) {
		return false;
	}

	// Percentage size
	if (originalStyle && originalStyle.substr(-1) === '%') {
		return false;
	}

	// Calc expression
	if (originalStyle && originalStyle.substr(0, 5) === 'calc(') {
		return false;
	}

	// Elements without a defined size
	return true;

}

/**
 * Get the computed content-box size
 *
 * @param  {Element} element
 * @param  {string}  prop    `width` or `height`
 * @return {number}
 */
function getSize(element, prop) {
	var style = getComputedStyle(element);
	if (prop === 'width') {
		return element.offsetWidth
			- parseFloat(style.borderLeftWidth)
			- parseFloat(style.paddingLeft)
			- parseFloat(style.borderRightWidth)
			- parseFloat(style.paddingRight);
	}
	else {
		return element.offsetHeight
			- parseFloat(style.borderTopWidth)
			- parseFloat(style.paddingTop)
			- parseFloat(style.borderBottomWidth)
			- parseFloat(style.paddingBottom);
	}
}

/**
 * Get the computed length in pixel of a CSS length value
 *
 * @param  {string}  value
 * @param  {Element} element
 * @return {number}
 */
function getComputedLength(value, element) {
	var length = value.match(LENGTH_REGEXP);
	if (!length) {
		return parseFloat(value);
	}
	value = parseFloat(length[1]);
	var unit = length[2].toLowerCase();
	if (FIXED_UNIT_MAP[unit]) {
		return value * FIXED_UNIT_MAP[unit];
	}
	if (unit === 'vw') {
		return value * window.innerWidth / 100;
	}
	if (unit === 'vh') {
		return value * window.innerHeight / 100;
	}
	if (unit === 'vmin') {
		return value * Math.min(window.innerWidth, window.innerHeight) / 100;
	}
	if (unit === 'vmax') {
		return value * Math.max(window.innerWidth, window.innerHeight) / 100;
	}
	// em units
	if (unit === 'rem') {
		element = documentElement;
	}
	if (unit === 'ex') {
		value /= 2;
	}
	return parseFloat(getComputedStyle(element).fontSize) * value;
}

/**
 * @param  {Element} element
 * @return {CSSStyleDeclaration}
 */
function getComputedStyle(element) {

	var style = window.getComputedStyle(element);

	// Fix display inline in some browsers
	if (style.display === 'inline' && (
		style.position === 'absolute'
		|| style.position === 'fixed'
		|| style.cssFloat !== 'none'
	)) {
		var newStyle = {};
		for (var prop in style) {
			if (typeof style[prop] === 'string') {
				newStyle[prop] = style[prop];
			}
		}
		style = newStyle;
		style.display = 'block';
		style.getPropertyValue = function(property) {
			return this[property.replace(/-+(.)/g, function(match, char) {
				return char.toUpperCase();
			})];
		};
	}

	return style;

}

/**
 * Get the original style of an element as it was specified in CSS
 *
 * @param  {Element} element
 * @param  {string}  prop    Property to return, e.g. `width` or `height`
 * @return {string}
 */
function getOriginalStyle(element, prop) {

	var matchedRules = [];
	var value;
	var j;

	matchedRules = sortRulesBySpecificity(
		filterRulesByElementAndProp(styleCache[prop], element, prop)
	);

	// Add style attribute
	matchedRules.unshift({
		_rule: {
			style: element.style,
		},
	});

	// Loop through all important styles
	for (j = 0; j < matchedRules.length; j++) {
		if (
			(value = matchedRules[j]._rule.style.getPropertyValue(prop))
			&& matchedRules[j]._rule.style.getPropertyPriority(prop) === 'important'
		) {
			return value;
		}
	}

	// Loop through all non-important styles
	for (j = 0; j < matchedRules.length; j++) {
		if (
			(value = matchedRules[j]._rule.style.getPropertyValue(prop))
			&& matchedRules[j]._rule.style.getPropertyPriority(prop) !== 'important'
		) {
			return value;
		}
	}

	return undefined;

}

/**
 * Parse CSS color and return as HSLA array
 *
 * @param  {string} color
 * @return {Array.<number>}
 */
function parseColor(color) {
	if (!color || !color.split || !color.split('(')[1]) {
		return [0, 0, 0, 0];
	}
	color = color.split('(')[1].split(',').map(parseFloat);
	if (color[3] === undefined) {
		color[3] = 1;
	}
	return rgbaToHsla(color);
}

/**
 * @param  {Array.<number>} color
 * @return {Array.<number>}
 */
function rgbaToHsla(color) {

	var red = color[0] / 255;
	var green = color[1] / 255;
	var blue = color[2] / 255;

	var max = Math.max(red, green, blue);
	var min = Math.min(red, green, blue);

	var hue;
	var saturation;
	var lightness = (max + min) / 2;

	hue = saturation = 0;

	if (max !== min) {
		var delta = max - min;
		saturation = delta / (lightness > 0.5 ? 2 - max - min : max + min);
		if (max === red) {
			hue = (green - blue) / delta + ((green < blue) * 6);
		}
		else if (max === green) {
			hue = (blue - red) / delta + 2;
		}
		else {
			hue = (red - green) / delta + 4;
		}
		hue /= 6;
	}

	return [hue * 360, saturation * 100, lightness * 100, color[3]];
}

/**
 * Filter rules by matching the element and at least one property
 *
 * @param  {{<string>: Array.<{_selector: string, _rule: CSSRule}>}} rules
 * @param  {Element}                                                 element
 * @param  {string}                                                  prop
 * @return {Array.<{_selector: string, _rule: CSSRule}>}
 */
function filterRulesByElementAndProp(rules, element, prop) {
	var foundRules = [];
	if (element.id) {
		foundRules = foundRules.concat(rules['#' + element.id] || []);
	}
	getClassName(element).split(/\s+/).forEach(function(className) {
		foundRules = foundRules.concat(rules['.' + className] || []);
	});
	foundRules = foundRules
		.concat(rules[element.tagName.toLowerCase()] || [])
		.concat(rules['*'] || []);
	return foundRules.filter(function(rule) {
		return rule._rule.style.getPropertyValue(prop)
			&& (
				!rule._rule.parentRule
				|| rule._rule.parentRule.type !== 4 // @media rule
				|| matchesMedia(rule._rule.parentRule.media.mediaText)
			)
			&& elementMatchesSelector(element, rule._selector);
	});
}

var elementMatchesSelectorMethod = (function(element) {
	return element.matches
		|| element.mozMatchesSelector
		|| element.msMatchesSelector
		|| element.oMatchesSelector
		|| element.webkitMatchesSelector;
})(document.createElement('div'));

/**
 * @param  {Element} element
 * @param  {string}  selector
 * @return {boolean}
 */
function elementMatchesSelector(element, selector) {
	try {
		return !!elementMatchesSelectorMethod.call(element, selector);
	}
	catch(e) {
		return false;
	}
}

/**
 * @param  {Array.<{_specificity: number}>} rules
 * @return {Array.<{_specificity: number}>}
 */
function sortRulesBySpecificity(rules) {
	return rules.map(function(rule, i) {
		return [rule, i];
	}).sort(function(a, b) {
		return (b[0]._specificity - a[0]._specificity) || b[1] - a[1];
	}).map(function(rule) {
		return rule[0];
	});
}

/**
 * @param  {string} selector
 * @return {number}
 */
function getSpecificity(selector) {

	var idScore = 0;
	var classScore = 0;
	var typeScore = 0;

	selector
		.replace(SELECTOR_ESCAPED_REGEXP, function() {
			classScore++;
			return '';
		})
		.replace(SELECTOR_REGEXP, function() {
			classScore++;
			return '';
		})
		.replace(ATTR_REGEXP, function() {
			classScore++;
			return '';
		})
		.replace(PSEUDO_NOT_REGEXP, ' ')
		.replace(ID_REGEXP, function() {
			idScore++;
			return '';
		})
		.replace(CLASS_REGEXP, function() {
			classScore++;
			return '';
		})
		.replace(PSEUDO_ELEMENT_REGEXP, function() {
			typeScore++;
			return '';
		})
		.replace(PSEUDO_CLASS_REGEXP, function() {
			classScore++;
			return '';
		})
		.replace(ELEMENT_REGEXP, function() {
			typeScore++;
			return '';
		});

	return (
		(idScore * 256 * 256)
		+ (classScore * 256)
		+ typeScore
	);

}

/**
 * Create a new Map or a simple shim of it in non-supporting browsers
 *
 * @return {Map}
 */
function createCacheMap() {

	if (typeof Map === 'function') {
		return new Map();
	}

	var keys = [];
	var values = [];

	function getIndex(key) {
		return keys.indexOf(key);
	}

	function get(key) {
		return values[getIndex(key)];
	}

	function has(key) {
		return getIndex(key) !== -1;
	}

	function set(key, value) {
		var index = getIndex(key);
		if (index === -1) {
			index = keys.push(key) - 1;
		}
		values[index] = value;
	}

	function deleteFunc(key) {
		var index = getIndex(key);
		if (index === -1) {
			return false;
		}
		delete keys[index];
		delete values[index];
		return true;
	}

	function forEach(callback) {
		keys.forEach(function(key, index) {
			if (key !== undefined) {
				callback(values[index], key);
			}
		});
	}

	return {
		set: set,
		get: get,
		has: has,
		delete: deleteFunc,
		forEach: forEach,
	};
}

/**
 * @param  {Element} element
 * @return {string}
 */
function getClassName(element) {
	return element.getAttribute('class') || '';
}

/**
 * @param {Element} element
 * @param {string}  className
 */
function setClassName(element, className) {
	element.setAttribute('class', className);
}

/**
 * @param {Element} element
 * @param {string}  className
 */
function hasClass(element, className) {
	if (element.classList) {
		return element.classList.contains(className);
	}
	return !!getClassName(element).match(new RegExp(
		'(?:^|\\s+)'
		+ className.replace(REGEXP_ESCAPE_REGEXP, '\\$&')
		+ '($|\\s+)'
	));
}

/**
 * @param {Element} element
 * @param {string}  className
 */
function addClass(element, className) {
	if (element.classList) {
		element.classList.add(className);
	}
	else if (!hasClass(element, className)) {
		setClassName(element, getClassName(element) + ' ' + className)
	}
}

/**
 * @param {Element} element
 * @param {string}  className
 */
function removeClass(element, className) {
	if (element.classList) {
		element.classList.remove(className);
	}
	else {
		setClassName(element, getClassName(element).replace(
			new RegExp(
				'(?:^|\\s+)'
				+ className.replace(REGEXP_ESCAPE_REGEXP, '\\$&')
				+ '($|\\s+)'
			),
			'$1'
		));
	}
}

/**
 * @param  {string} media
 * @return {boolean}
 */
function matchesMedia(media) {
	if (window.matchMedia) {
		return window.matchMedia(media).matches;
	}
	return (window.styleMedia || window.media).matchMedium(media);
}

/**
 * Array.from or a simple shim for non-supporting browsers
 *
 * @param  {{length: number}} arrayLike
 * @return {array}
 */
function arrayFrom(arrayLike) {
	if (Array.from) {
		return Array.from(arrayLike);
	}
	var array = [];
	for (var i = 0; i < arrayLike.length; i++) {
		array[i] = arrayLike[i];
	}
	return array;
}

return api;

}));

})(window, document);
