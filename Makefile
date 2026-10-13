SHELL := bash

.PHONY: all help web build

all: help

help:
	@echo "web   - build the web archive the element ships"
	@echo "build - build the Exordos element"

web:
	npm ci
	npm run build -- --base=/auth/
	tar --zstd -cf web.tar.zst -C dist .

build: web
	exordos build -f
