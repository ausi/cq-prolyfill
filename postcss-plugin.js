/*eslint-env node */
var postcss = require('postcss');

module.exports = postcss.plugin('cq-prolyfill', function () {
	'use strict';
	return function (css) {
		css.walkRules(/:container\s*\(/i, function (rule) {
			rule.selectors = rule.selectors.map(function(selector) {
				return selector.replace(/:container\s*\((?:[^()]+|\([^()]*\))+\)/gi, function(match) {
					return '.' + match
						.replace(/\s+/g, '')
						.replace(/^:container\("((?:[^()]+|\([^()]*\))+)"\)$/i, ':container($1)')
						.replace(/[[\]!"#$%&'()*+,./:;<=>?@^`{|}~]/g, '\\$&')
						.toLowerCase();
				});
			});
		});
	};
});
