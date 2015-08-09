/*eslint-env node*/
/*eslint-disable strict, no-process-exit */

var connect = require('connect');
var serveStatic = require('serve-static');
var request = require('request');
var SauceTunnel = require('sauce-tunnel');

var browserVersions = [
	/*eslint-disable no-multi-spaces */
	['Windows 10',  'chrome',             '40'    ],
	['Mac 10.10',   'chrome',             'latest'],
	['Linux',       'chrome',             'beta'  ],
	['Windows 10',  'firefox',            '36'    ],
	['Mac 10.10',   'firefox',            'latest'],
	['Linux',       'firefox',            'beta'  ],
	['Mac 10.9',    'safari',             'latest'],
	['Mac 10.10',   'safari',             'latest'],
	['Mac 10.11',   'safari',             'latest'],
	['Windows 7',   'internet explorer',  '9'     ],
	['Windows 8',   'internet explorer',  '10'    ],
	['Windows 8.1', 'internet explorer',  '11'    ],
	['Windows 10',  'internet explorer',  'latest'],
	['Mac 10.10',   'iphone',             '7.0'   ],
	['Mac 10.10',   'iphone',             'latest'],
	['Linux',       'android',            '4.0'   ],
	['Linux',       'android',            'latest'],
	/*eslint-enable no-multi-spaces */
];
var versionsData;

var tunnel = new SauceTunnel(process.env.SAUCE_USERNAME, process.env.SAUCE_ACCESS_KEY, 'tunnel', true);

tunnel.start(function(status) {

	if (status === false){
		throw new Error('Something went wrong with the tunnel');
	}
	console.log('Sauce tunnel started');

	connect().use(serveStatic(__dirname)).listen(8080, function() {
		console.log('Webserver listening');
		loadVersions();
	});
});

function loadVersions() {

	request.get({
		url: 'http://saucelabs.com/rest/v1/info/platforms/webdriver',
		json: true,
	}, function(err, resp, data) {
		if (err) {
			throw new Error(err);
		}
		versionsData = data;
		startTests();
	});
}

function startTests() {

	request.post({
		url: tunnel.baseUrl + '/js-tests',
		json: true,
		body: {
			url: 'http://127.0.0.1:8080/tests/index.html',
			platforms: resolveVersions(browserVersions),
			framework: 'qunit',
			build: process.env.TRAVIS_BUILD_NUMBER ? 'travis-' + process.env.TRAVIS_BUILD_NUMBER : undefined,
			tags: [process.env.TRAVIS_PULL_REQUEST || process.env.TRAVIS_BRANCH || 'local'],
			tunnelIdentifier: tunnel.identifier,
		},
	}, function(err, resp, data) {
		if (err) {
			throw new Error(err);
		}
		checkStatus(data['js tests']);
	});
}

function resolveVersions(platforms) {

	return platforms.map(function(platform) {

		if (platform[2] === 'latest') {

			var versions = [];
			versionsData.forEach(function(browser) {
				if (browser.os === platform[0] && browser.api_name === platform[1]) {
					versions.push(browser.short_version);
				}
			});

			versions.sort(function(a, b) {
				var ab = [a, b].map(function(version) {
					if (version.match(/^\d+(?:\.\d+)*$/)) {
						return version.split('.').reduce(function(sum, current, index) {
							return sum + (parseFloat(current) * Math.pow(100, 4 - index));
						}, 0);
					}
					return 0;
				});
				return ab[1] - ab[0];
			});

			if (!versions[0]) {
				throw new Error('No latest version found for ' + platform[0] + ' ' + platform[1]);
			}
			platform[2] = versions[0];

		}

		return platform;

	});

}

function checkStatus(jsTests) {

	request.post({
		url: tunnel.baseUrl + '/js-tests/status',
		json: true,
		body: {
			'js tests': jsTests,
		},
	}, function(err, resp, data) {

		if (err) {
			throw new Error(err);
		}

		process.stdout.write('.');

		if (data.completed || data['js tests'].filter(function(test) {
			return test.status === 'test error';
		}).length) {

			console.log('tests done');

			var failed = [];
			data['js tests'].forEach(function(test) {
				if ((test.result && test.result.failed) || typeof test.result === 'string') {
					failed.push([
						test.platform.join(' '),
						'failed: ' + (test.result.failed || test.result),
						test.url,
					].join('\n'));
				}
				else if (test.status && !test.result) {
					failed.push([
						test.platform.join(' '),
						'failed: ' + test.status,
						test.url,
					].join('\n'));
				}
			});

			if (failed.length) {
				console.log('Sauce Labs tests failed\n');
				console.log(failed.join('\n\n') + '\n');
				tunnel.stop(function(){
					console.log('Sauce tunnel stopped');
					process.exit(1);
				});
			}
			else {
				console.log('Sauce Labs tests finished');
				console.log(data['js tests'].map(function(test) {
					return test.platform.join(' ');
				}).join('\n'));
				tunnel.stop(function(){
					console.log('Sauce tunnel stopped');
					process.exit(0);
				});
			}

		}
		else {
			setTimeout(checkStatus, 5000, jsTests);
		}

	});

}
