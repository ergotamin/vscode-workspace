#
SHELL := /bin/bash
#
CC := gcc
#
CFLAGS := -Wall -Wextra -pedantic -Wl,-O1 \
-mtune=generic -std=gnu11 -O2 -Ofast \
-fexpensive-optimizations -I./src -I./src/xosd
#
LDFLAGS := -lpthread -lXext -lX11 -lXinerama
#
SOURCES := $(wildcard src/*.c)


all: default


src/xosd.o: src/xosd/xosd.c
	$(CC) -c $(CFLAGS) $^ -o $@


syswatch: src/xosd.o $(SOURCES)
	$(CC) $(CFLAGS) $^ -o $@ $(LDFLAGS)


default: syswatch clean


clean:
	@find * -type f -name '*.o' -delete


#
.PHONY: xosd.o