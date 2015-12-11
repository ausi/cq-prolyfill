/*eslint-env node */
var postcss = require('postcss');

module.exports = postcss.plugin('cq-prolyfill', function () {
	'use strict';
	return function (css) {
		css.walkRules(/:container\(/i, function (rule) {
			rule.selectors = rule.selectors.map(function(selector) {
				return selector.replace(/:container\([^)]*\)/gi, function(match) {
					return '.' + match
						.replace(/([a-z])\s+([a-z])/gi, '$1|$2')
						.replace(/\s+/g, '')
						.replace(/^:container\("([^)]*)"\)$/i, ':container($1)')
						.replace(/[[\]!"#$%&'()*+,./:;<=>?@^`{|}~]/g, '\\$&')
						.toLowerCase();
				});
			});
		});
	};
});
