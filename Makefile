# https://github.com/luarocks/luarocks/wiki/Creating-a-Makefile-that-plays-nice-with-LuaRocks
build: 
	echo "Do nothing"

install:
	deno task --quiet build:fast
	bash -c "mkdir -p $(INST_LUADIR)"
	cp -r app client lua public $(INST_LUADIR)
