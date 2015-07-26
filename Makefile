BIN = ./node_modules/.bin
UGLIFY = $(BIN)/uglifyjs
UGLIFY_OPTS = --compress --mangle --screw-ie8
ESLINT = $(BIN)/eslint
SOURCE = cq-prolyfill.js
TARGET = $(SOURCE:%.js=%.min.js)
QUNIT = node_modules/qunitjs/qunit
QUNIT_JS = $(QUNIT)/qunit.js
QUNIT_CSS = $(QUNIT)/qunit.css
TEST_HTML = tests/index.html

all: $(TARGET) $(TEST_HTML)

$(TARGET): $(SOURCE) $(UGLIFY)
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

.PHONY: test
test: $(ESLINT)
	$(ESLINT) $(SOURCE)

.PHONY: watch
watch:
	while true; do (make || make -t) | grep -v "Nothing to be done"; sleep 1; done

$(TEST_HTML): tests.js $(SOURCE) $(QUNIT_JS) $(QUNIT_CSS)
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
