SHELL := bash

.PHONY: all help web build

all: help

help:
	@echo "web   - build the web archive the element ships"
	@echo "build - build the Exordos element"

web:
	./exordos/images/build_web.sh

build:
	exordos build -f
