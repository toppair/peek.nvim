#/usr/bin/env bash

deno task --quiet build:fast
mkdir -p $(INST_LUADIR)
cp -r app client lua public $(INST_LUADIR)
