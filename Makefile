BIN = ./node_modules/.bin
UGLIFY = $(BIN)/uglifyjs
UGLIFY_OPTS = --compress --mangle --screw-ie8
ESLINT = $(BIN)/eslint
SOURCE = cq-prolyfill.js
TARGET = $(SOURCE:%.js=%.min.js)
TESTS = tests.js
QUNIT = node_modules/qunitjs/qunit
QUNIT_JS = $(QUNIT)/qunit.js
QUNIT_CSS = $(QUNIT)/qunit.css
TEST_HTML = tests/index.html
SLIMERJS = $(BIN)/slimerjs
PHANTOMJS_RUNNER = node_modules/qunit-phantomjs-runner/runner.js
TEST_RUNNER = tests/slimerjs-runner.js

all: $(TARGET)

$(TARGET): $(SOURCE) $(UGLIFY) $(TESTS)
	make test
	$(UGLIFY) $(UGLIFY_OPTS) $< > $@

$(UGLIFY): package.json
	npm install && touch $@

$(ESLINT): package.json
	npm install && touch $@

$(QUNIT_JS): package.json
	npm install && touch $@

$(QUNIT_CSS): package.json
	npm install && touch $@

$(SLIMERJS): package.json
	npm install && touch $@

$(PHANTOMJS_RUNNER): package.json
	npm install && touch $@

.PHONY: test
test: $(ESLINT) $(SOURCE) $(TEST_RUNNER) $(SLIMERJS) $(TEST_HTML)
	$(ESLINT) $(SOURCE)
	$(SLIMERJS) $(TEST_RUNNER) $(TEST_HTML) | tee tests/slimerjs.log
	@ ! grep 'Test failed:' tests/slimerjs.log > /dev/null
	@ rm tests/slimerjs.log

.PHONY: watch
watch:
	while true; do (make || make -t) | grep -v "Nothing to be done"; sleep 1; done

$(TEST_HTML): $(TESTS) $(SOURCE) $(QUNIT_JS) $(QUNIT_CSS)
	mkdir -p tests
	echo '<!doctype html>' > $@
	echo '<meta charset="utf-8">' >> $@
	echo '<link rel="stylesheet" href="../$(QUNIT_CSS)">' >> $@
	echo '<div id="qunit"></div>' >> $@
	echo '<div id="qunit-fixture"></div>' >> $@
	echo '<script src="../$(QUNIT_JS)"></script>' >> $@
	echo '<script>' >> $@
	cat $(SOURCE) | grep -v '})(window, document);' >> $@
	cat $< >> $@
	cat $(SOURCE) | grep '})(window, document);' >> $@
	echo '</script>' >> $@

$(TEST_RUNNER): $(PHANTOMJS_RUNNER)
	mkdir -p tests
	cat $< | replace 'exit(failed ? 1 : 0);' 'setTimeout(function(){exit(failed ? 1 : 0);}, 500);' > $@
