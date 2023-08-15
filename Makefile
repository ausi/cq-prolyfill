MODULES = node_modules
BIN = $(MODULES)/.bin
UGLIFY = $(BIN)/uglifyjs
UGLIFY_OPTS = --compress=unsafe,pure_getters --mangle --mangle-props --mangle-regex="/^_/" --screw-ie8
ESLINT = $(BIN)/eslint
ISTANBUL = $(BIN)/istanbul
#ZOPFLI = $(BIN)/zopfli
SOURCE = cq-prolyfill.js
TARGET = $(SOURCE:%.js=%.min.js)
TARGET_GZ = $(SOURCE:%.js=%.min.js.gz)
TARGET_TMP = $(SOURCE:%.js=%.tmp.min.js)
TESTS = tests.js
TESTS_FUNCTIONAL = tests-functional.js
QUNIT = $(MODULES)/qunitjs/qunit
QUNIT_JS = $(QUNIT)/qunit.js
QUNIT_CSS = $(QUNIT)/qunit.css
TEST_HTML_ALL = tests/all.html
TEST_HTML_COVERAGE = tests/coverage.html
TEST_HTML_FUNCTIONAL = tests/functional.html
TEST_POSTCSS = postcss-tests.js
SLIMERJS = $(BIN)/slimerjs
PHANTOMJS_RUNNER = $(MODULES)/qunit-phantomjs-runner/runner.js
TEST_RUNNER = tests/slimerjs-runner.js
BROWSERSTACK_RUNNER = $(BIN)/browserstack-runner

all: $(TARGET) $(TARGET_GZ)

$(TARGET): $(TARGET_TMP)
	make test
	cat $< > $@

# $(TARGET_GZ): $(TARGET) $(ZOPFLI)
# 	rm -f $@
# 	$(ZOPFLI) $<

$(TARGET_TMP): $(SOURCE) $(UGLIFY) $(TESTS) $(TESTS_FUNCTIONAL)
	$(UGLIFY) $(UGLIFY_OPTS) $< > $@

$(MODULES): package.json
	npm install && touch $@

$(UGLIFY): $(MODULES)
	touch $@

$(ESLINT): $(MODULES)
	touch $@

$(ISTANBUL): $(MODULES)
	touch $@

# $(ZOPFLI): $(MODULES)
# 	touch $@

$(QUNIT_JS): $(MODULES)
	touch $@

$(QUNIT_CSS): $(MODULES)
	touch $@

$(SLIMERJS): $(MODULES)
	touch $@

$(PHANTOMJS_RUNNER): $(MODULES)
	touch $@

$(BROWSERSTACK_RUNNER): $(MODULES)
	touch $@

.PHONY: test
test: $(ESLINT) $(SOURCE) $(TEST_POSTCSS) $(TEST_RUNNER) $(SLIMERJS) $(TEST_HTML_ALL) $(TEST_HTML_COVERAGE) $(TEST_HTML_FUNCTIONAL) $(MODULES)
	$(ESLINT) $(SOURCE)
	node $(TEST_POSTCSS)
	node -e "require('connect')().use(require('serve-static')(__dirname)).listen(8888)" & echo "$$!" > server.pid
	node -e "require('connect')().use('/cors', require('serve-static')(__dirname, {setHeaders: corsHeaders})).use('/time', function(req, res){corsHeaders(res);res.end((new Date()).getTime()+'')}).listen(8889);function corsHeaders(res) {res.setHeader('Access-Control-Allow-Origin', '*')}" & echo "$$!" > server2.pid
	$(SLIMERJS) $(TEST_RUNNER) http://localhost:8888/$(TEST_HTML_ALL) 20 | tee tests/slimerjs.log
	kill `cat server.pid` && rm server.pid
	kill `cat server2.pid` && rm server2.pid
	@ grep ' passed, 0 failed.' tests/slimerjs.log > /dev/null
	@ rm tests/slimerjs.log
	node -e "require('connect')().use(require('serve-static')(__dirname)).listen(8888)" & echo "$$!" > server.pid
	$(SLIMERJS) $(TEST_RUNNER) http://localhost:8888/$(TEST_HTML_FUNCTIONAL) 20 | tee tests/slimerjs.log
	kill `cat server.pid` && rm server.pid
	@ grep ' passed, 0 failed.' tests/slimerjs.log > /dev/null
	@ rm tests/slimerjs.log

.PHONY: watch
watch:
	while true; do (make || make -t) | grep -v "Nothing to be done"; sleep 1; done

$(TEST_HTML_ALL): $(TESTS) $(TESTS_FUNCTIONAL) $(SOURCE) $(QUNIT_JS) $(QUNIT_CSS)
	mkdir -p tests
	echo '<!doctype html>' > $@
	echo '<html><head>' >> $@
	echo '<meta charset="utf-8">' >> $@
	echo '<link rel="stylesheet" href="../$(QUNIT_CSS)">' >> $@
	echo '</head><body>' >> $@
	echo '<div id="qunit"></div>' >> $@
	echo '<div id="qunit-fixture"></div>' >> $@
	echo '<script src="../$(QUNIT_JS)"></script>' >> $@
	echo '<script>' >> $@
	echo 'var cqConfig = {skipObserving: true, preprocess: true};' >> $@
	node -e "console.log(require('fs').readFileSync('$(SOURCE)', 'utf-8').replace('return api;\n\n}));\n\n})(window, document);', ''))" >> $@
	cat $< >> $@
	cat $(TESTS_FUNCTIONAL) >> $@
	echo 'return api;\n\n}));\n\n})(window, document);' >> $@
	echo '</script>' >> $@
	echo '</body></html>' >> $@
	rm -rf tests/test-files
	cp -r test-files tests/

$(TEST_HTML_COVERAGE): $(TESTS) $(TESTS_FUNCTIONAL) $(SOURCE) $(QUNIT_JS) $(QUNIT_CSS) $(ISTANBUL)
	mkdir -p tests
	echo '<!doctype html>' > $@
	echo '<html><head>' >> $@
	echo '<meta charset="utf-8">' >> $@
	echo '<link rel="stylesheet" href="../$(QUNIT_CSS)">' >> $@
	echo '</head><body>' >> $@
	echo '<div id="qunit"></div>' >> $@
	echo '<div id="qunit-fixture"></div>' >> $@
	echo '<script src="../$(QUNIT_JS)"></script>' >> $@
	echo '<script>' >> $@
	echo 'var cqConfig = {skipObserving: true, preprocess: true};' >> $@
	$(ISTANBUL) instrument $(SOURCE) | replace 'return api;}));}(window,document));' '' >> $@
	cat $< >> $@
	cat $(TESTS_FUNCTIONAL) >> $@
	echo 'return api;}));}(window,document));' >> $@
	echo '</script>' >> $@
	echo '</body></html>' >> $@
	rm -rf tests/test-files
	cp -r test-files tests/

$(TEST_HTML_FUNCTIONAL): $(TESTS_FUNCTIONAL) $(TARGET_TMP) $(QUNIT_JS) $(QUNIT_CSS)
	mkdir -p tests
	echo '<!doctype html>' > $@
	echo '<html><head>' >> $@
	echo '<meta charset="utf-8">' >> $@
	echo '<link rel="stylesheet" href="../$(QUNIT_CSS)">' >> $@
	echo '</head><body>' >> $@
	echo '<div id="qunit"></div>' >> $@
	echo '<div id="qunit-fixture"></div>' >> $@
	echo '<script src="../$(QUNIT_JS)"></script>' >> $@
	echo '<script>' >> $@
	echo 'var cqConfig = {skipObserving: true, preprocess: true};' >> $@
	echo '</script>' >> $@
	echo '<script src="../$(TARGET_TMP)"></script>' >> $@
	echo '<script src="../$(TESTS_FUNCTIONAL)"></script>' >> $@
	echo '</body></html>' >> $@
	rm -rf tests/test-files
	cp -r test-files tests/

$(TEST_RUNNER): $(PHANTOMJS_RUNNER)
	mkdir -p tests
	cat $< | replace 'exit(failed ? 1 : 0);' 'setTimeout(function(){exit(failed ? 1 : 0);}, 500);' > $@

.PHONY: clean
clean:
	rm -f $(TARGET_TMP)
	rm -f $(TARGET_GZ)
	rm -f $(TARGET)
	rm -fr tests
	rm -fr $(MODULES)

.PHONY: browserstack
browserstack: $(BROWSERSTACK_RUNNER) $(ISTANBUL) $(TEST_HTML_COVERAGE) $(TEST_HTML_FUNCTIONAL)
	node -e "require('connect')().use('/cors', require('serve-static')(__dirname, {setHeaders: corsHeaders})).use('/time', function(req, res){corsHeaders(res);res.end((new Date()).getTime()+'')}).listen(8889);function corsHeaders(res) {res.setHeader('Access-Control-Allow-Origin', '*')}" & echo "$$!" > server.pid
	$(BROWSERSTACK_RUNNER) | tee tests/browserstack.log | grep -v 'coverage: {'
	kill `cat server.pid` && rm server.pid
	@ grep 'All tests done, failures: 0.' tests/browserstack.log > /dev/null
	rm -f tests/coverage-*
	cat tests/browserstack.log | grep 'coverage: {' | node -e 'console.log(require("fs").readFileSync("/dev/stdin", "utf8").split("\n").filter(Boolean).map(line => line.split("coverage: ")[1]).join("\n"));' | split -l 1 - tests/coverage-
	$(ISTANBUL) report --include 'tests/coverage-*' text-summary html lcovonly
