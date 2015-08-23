MODULES = node_modules
BIN = $(MODULES)/.bin
UGLIFY = $(BIN)/uglifyjs
UGLIFY_OPTS = --compress --mangle --screw-ie8
ESLINT = $(BIN)/eslint
SOURCE = cq-prolyfill.js
TARGET = $(SOURCE:%.js=%.min.js)
TESTS = tests.js
QUNIT = $(MODULES)/qunitjs/qunit
QUNIT_JS = $(QUNIT)/qunit.js
QUNIT_CSS = $(QUNIT)/qunit.css
TEST_HTML = tests/index.html
SLIMERJS = $(BIN)/slimerjs
PHANTOMJS_RUNNER = $(MODULES)/qunit-phantomjs-runner/runner.js
TEST_RUNNER = tests/slimerjs-runner.js

all: $(TARGET)

$(TARGET): $(SOURCE) $(UGLIFY) $(TESTS)
	make test
	$(UGLIFY) $(UGLIFY_OPTS) $< > $@

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
test: $(ESLINT) $(SOURCE) $(TEST_RUNNER) $(SLIMERJS) $(TEST_HTML)
	$(ESLINT) $(SOURCE)
	$(SLIMERJS) $(TEST_RUNNER) $(TEST_HTML) | tee tests/slimerjs.log
	@ grep ' passed, 0 failed.' tests/slimerjs.log > /dev/null
	@ rm tests/slimerjs.log

.PHONY: watch
watch:
	while true; do (make || make -t) | grep -v "Nothing to be done"; sleep 1; done

$(TEST_HTML): $(TESTS) $(SOURCE) $(QUNIT_JS) $(QUNIT_CSS)
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
	cat $(SOURCE) | grep '})(window, document);' >> $@
	echo '</script>' >> $@
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
