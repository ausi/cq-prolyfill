UGLIFY = ./node_modules/uglify-js/bin/uglifyjs
UGLIFY_OPTS = --compress --mangle --screw-ie8
SOURCE = cq-prolyfill.js
TARGET = $(SOURCE:%.js=%.min.js)

all: $(TARGET)

$(TARGET): $(SOURCE) $(UGLIFY)
	$(UGLIFY) $(UGLIFY_OPTS) $< > $@

$(UGLIFY): package.json
	npm install && touch $@
