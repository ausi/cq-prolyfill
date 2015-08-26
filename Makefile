MODULES = node_modules
BIN = $(MODULES)/.bin
UGLIFY = $(BIN)/uglifyjs
UGLIFY_OPTS = --compress=unsafe,pure_getters --mangle --mangle-props --mangle-regex="/^_/" --screw-ie8
ESLINT = $(BIN)/eslint
SOURCE = cq-prolyfill.js
TARGET = $(SOURCE:%.js=%.min.js)
TESTS = tests.js
TESTS_FUNCTIONAL = tests-functional.js
QUNIT = $(MODULES)/qunitjs/qunit
QUNIT_JS = $(QUNIT)/qunit.js
QUNIT_CSS = $(QUNIT)/qunit.css
TEST_HTML = tests/index.html
TEST_HTML_FUNCTIONAL = tests/functional.html
SLIMERJS = $(BIN)/slimerjs
PHANTOMJS_RUNNER = $(MODULES)/qunit-phantomjs-runner/runner.js
TEST_RUNNER = tests/slimerjs-runner.js

all: $(TARGET)

$(TARGET): $(SOURCE) $(UGLIFY) $(TESTS)
	$(UGLIFY) $(UGLIFY_OPTS) $< > $@
	make test

$(MODULES): package.json
	npm install && touch $@

$(UGLIFY): $(MODULES)
	touch $@

$(ESLINT): $(MODULES)
	touch $@

$(QUNIT_JS): $(MODULES)
	touch $@

$(QUNIT_CSS): $(MODULES)
	touch $@

$(SLIMERJS): $(MODULES)
	touch $@

$(PHANTOMJS_RUNNER): $(MODULES)
	touch $@

.PHONY: test
test: $(ESLINT) $(SOURCE) $(TARGET) $(TEST_RUNNER) $(SLIMERJS) $(TEST_HTML) $(TEST_HTML_FUNCTIONAL) $(MODULES)
	$(ESLINT) $(SOURCE)
	node -e "require('connect')().use(require('serve-static')(__dirname)).listen(8888)" & echo "$$!" > server.pid
	$(SLIMERJS) $(TEST_RUNNER) http://localhost:8888/$(TEST_HTML) | tee tests/slimerjs.log
	kill `cat server.pid` && rm server.pid
	@ grep ' passed, 0 failed.' tests/slimerjs.log > /dev/null
	@ rm tests/slimerjs.log
	node -e "require('connect')().use(require('serve-static')(__dirname)).listen(8888)" & echo "$$!" > server.pid
	$(SLIMERJS) $(TEST_RUNNER) http://localhost:8888/$(TEST_HTML_FUNCTIONAL) | tee tests/slimerjs.log
	kill `cat server.pid` && rm server.pid
	@ grep ' passed, 0 failed.' tests/slimerjs.log > /dev/null
	@ rm tests/slimerjs.log

.PHONY: watch
watch:
	while true; do (make || make -t) | grep -v "Nothing to be done"; sleep 1; done

$(TEST_HTML): $(TESTS) $(TESTS_FUNCTIONAL) $(SOURCE) $(QUNIT_JS) $(QUNIT_CSS)
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
	cat $(SOURCE) | grep -v '})(window, document);' >> $@
	cat $< >> $@
	cat $(TESTS_FUNCTIONAL) >> $@
	cat $(SOURCE) | grep '})(window, document);' >> $@
	echo '</script>' >> $@
	echo '</body></html>' >> $@
	rm -rf tests/test-files
	cp -r test-files tests/

$(TEST_HTML_FUNCTIONAL): $(TESTS_FUNCTIONAL) $(TARGET) $(QUNIT_JS) $(QUNIT_CSS)
	mkdir -p tests
	echo '<!doctype html>' > $@
	echo '<html><head>' >> $@
	echo '<meta charset="utf-8">' >> $@
	echo '<link rel="stylesheet" href="../$(QUNIT_CSS)">' >> $@
	echo '</head><body>' >> $@
	echo '<div id="qunit"></div>' >> $@
	echo '<div id="qunit-fixture"></div>' >> $@
	echo '<script src="../$(QUNIT_JS)"></script>' >> $@
	echo '<script src="../$(TARGET)"></script>' >> $@
	echo '<script src="../$(TESTS_FUNCTIONAL)"></script>' >> $@
	echo '</body></html>' >> $@
	rm -rf tests/test-files
	cp -r test-files tests/

$(TEST_RUNNER): $(PHANTOMJS_RUNNER)
	mkdir -p tests
	cat $< | replace 'exit(failed ? 1 : 0);' 'setTimeout(function(){exit(failed ? 1 : 0);}, 500);' > $@

.PHONY: clean
clean:
	rm -f $(TARGET)
	rm -fr tests
	rm -fr $(MODULES)
