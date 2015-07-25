BIN = ./node_modules/.bin
UGLIFY = $(BIN)/uglifyjs
UGLIFY_OPTS = --compress --mangle --screw-ie8
ESLINT = $(BIN)/eslint
SOURCE = cq-prolyfill.js
TARGET = $(SOURCE:%.js=%.min.js)

all: $(TARGET)

$(TARGET): $(SOURCE) $(UGLIFY)
	make test
	$(UGLIFY) $(UGLIFY_OPTS) $< > $@

$(UGLIFY): package.json
	npm install && touch $@

$(ESLINT): package.json
	npm install && touch $@

.PHONY: test
test: $(ESLINT)
	$(ESLINT) $(SOURCE)

.PHONY: watch
watch:
	while true; do (make || make -t) | grep -v "Nothing to be done"; sleep 1; done
