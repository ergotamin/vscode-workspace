CXX := g++
PLUGIN_SOURCES := plugin.cxx
GCC_PLUGINS_DIR := $(shell $(CXX) -print-file-name=plugin)
CXXFLAGS_PLUGIN := -std=gnu++2a -I$(GCC_PLUGINS_DIR)/include -fPIC -O2 -fno-rtti



insert.so: $(PLUGIN_SOURCES)
	$(CXX) -shared $(CXXFLAGS_PLUGIN) $^ -o $@


dist-clean:
	@rm -f *.so *.o 'test'


clean:
	@rm -f *.o 'test'


all: insert.so


default: all


.PHONY: all clean